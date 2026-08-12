import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import readline from 'node:readline';

const root = process.cwd();
const cut = process.env.CORTE_DATA || '2026-08-10';
const slug = cut.replaceAll('-', '_');
const OFFICIAL_URL = 'https://download.inep.gov.br/dados_abertos/microdados_censo_escolar_2025_.zip';
const OFFICIAL_URL_2022 = 'https://download.inep.gov.br/dados_abertos/microdados_censo_escolar_2022.zip';
const SOURCE_PAGE = 'https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-escolar';
const CATALOG_PAGE = 'https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/inep-data/catalogo-de-escolas';
const CNEFE_PAGE = 'https://www.ibge.gov.br/estatisticas/sociais/populacao/38734-cadastro-nacional-de-enderecos-para-fins-estatisticos.html';
const CNEFE_DICT = 'https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/Dicionario_CNEFE_Censo_2022.xls';
const CNEFE_CSV_UF_ROOT = 'https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/UF/';
const CNEFE_MS_ZIP = new URL('50_MS.zip', CNEFE_CSV_UF_ROOT).href;
const MIN_CNEFE_MATCH_COVERAGE = Number(process.env.CNEFE_MIN_MATCH_COVERAGE || 80);
const outDir = path.join(root, 'dados', 'materializados', slug);
const rawDir = path.join(root, `capturas_fontes_${slug}`, 'camadas');
const docsDir = path.join(root, 'docs');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(rawDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });

const sha256File = file => {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(file));
  return h.digest('hex');
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const escXml = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const norm = s => String(s ?? '').replace(/^\uFEFF/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

function print(msg=''){ process.stdout.write(msg + '\n'); }
function ensureProject(){
  const idx = path.join(root, 'index.html');
  if (!fs.existsSync(idx)) throw new Error('index.html não encontrado. Execute este script dentro de C:\\joaju-ms.');
  return idx;
}
function validZip(file){
  if(!file || !fs.existsSync(file) || fs.statSync(file).size < 1000000) return false;
  const fd = fs.openSync(file, 'r'); const b = Buffer.alloc(4); fs.readSync(fd,b,0,4,0); fs.closeSync(fd);
  return b[0]===0x50 && b[1]===0x4b;
}

async function nodeDownload(url,dest){
  let last;
  for(let attempt=1; attempt<=6; attempt++){
    const ctl = new AbortController(); const timer=setTimeout(()=>ctl.abort(), 180000);
    try{
      const r=await fetch(url,{redirect:'follow',cache:'no-store',signal:ctl.signal,headers:{
        'User-Agent':'Mozilla/5.0 JOAJU-MS/1.8 INEP materializer',
        'Accept':'application/zip,application/octet-stream;q=0.9,*/*;q=0.8',
        'Accept-Encoding':'identity',
        'Referer':SOURCE_PAGE
      }});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const b=Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(dest,b);
      if(!validZip(dest)) throw new Error('resposta não é ZIP válido');
      return;
    }catch(e){
      last=e; try{ if(fs.existsSync(dest)) fs.rmSync(dest); }catch{}
      if(attempt<6) await sleep(Math.min(12000, 1200*attempt));
    }finally{clearTimeout(timer)}
  }
  throw last || new Error('falha de download Node');
}

function shellDownload(url,dest){
  const attempts=[];
  const commands = process.platform==='win32' ? [
    ['curl.exe',['-L','--fail','--retry','6','--retry-all-errors','--retry-delay','3','--connect-timeout','30','--max-time','900','-A','Mozilla/5.0 JOAJU-MS/1.8','-e',SOURCE_PAGE,'-o',dest,url]],
    ['powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',`$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri '${url.replaceAll("'","''")}' -Headers @{'User-Agent'='Mozilla/5.0 JOAJU-MS/1.8';'Referer'='${SOURCE_PAGE}'} -OutFile '${dest.replaceAll("'","''")}'`]],
    ['powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',`Import-Module BitsTransfer -ErrorAction Stop; Start-BitsTransfer -Source '${url.replaceAll("'","''")}' -Destination '${dest.replaceAll("'","''")}'`]]
  ] : [
    ['curl',['-L','--fail','--retry','6','--retry-all-errors','--retry-delay','3','--connect-timeout','30','--max-time','900','-A','Mozilla/5.0 JOAJU-MS/1.8','-e',SOURCE_PAGE,'-o',dest,url]]
  ];
  for(const [cmd,args] of commands){
    try{
      if(fs.existsSync(dest)) fs.rmSync(dest);
      const r=spawnSync(cmd,args,{stdio:'inherit',windowsHide:true,timeout:930000});
      attempts.push(`${cmd}: ${r.status}`);
      if(r.status===0 && validZip(dest)) return {ok:true,method:cmd,attempts};
    }catch(e){attempts.push(`${cmd}: ${e.message}`)}
  }
  return {ok:false,attempts};
}

function candidateLocalZips(){
  const names=['microdados_censo_escolar_2025_.zip','microdados_censo_escolar_2025.zip'];
  const dirs=[root,rawDir,path.join(os.homedir(),'Downloads'),path.join(os.homedir(),'Desktop')];
  if(process.env.INEP_ESCOLAS_ZIP) dirs.unshift(path.dirname(path.resolve(process.env.INEP_ESCOLAS_ZIP)));
  const out=[];
  if(process.env.INEP_ESCOLAS_ZIP) out.push(path.resolve(process.env.INEP_ESCOLAS_ZIP));
  for(const d of dirs) for(const n of names) out.push(path.join(d,n));
  return [...new Set(out)].filter(validZip);
}

function validCsv(file){
  try{return Boolean(file&&fs.existsSync(file)&&fs.statSync(file).isFile()&&fs.statSync(file).size>5000&&/\.csv$/i.test(file));}catch{return false}
}
function catalogHeaderInfo(file){
  try{
    const fd=fs.openSync(file,'r');
    const size=Math.min(fs.statSync(file).size,262144);const b=Buffer.alloc(size);fs.readSync(fd,b,0,size,0);fs.closeSync(fd);
    let txt;try{txt=new TextDecoder('utf-8',{fatal:true}).decode(b)}catch{txt=new TextDecoder('windows-1252').decode(b)}
    const first=String(txt).split(/\r?\n/).find(x=>x.trim())||'';const delimiter=detectDelimiter(first);const headers=parseCsvLine(first.replace(/^\uFEFF/,''),delimiter);
    const H=new Set(headers.map(norm));
    const hasName=['NO_ENTIDADE','NO_ESCOLA','NOME_ESCOLA','NOME_DA_ESCOLA','ESCOLA'].some(x=>H.has(norm(x)));
    const hasCode=['CO_ENTIDADE','CO_ESCOLA','CODIGO_INEP','CODIGO_DA_ESCOLA','COD_ESCOLA'].some(x=>H.has(norm(x)));
    const hasAddress=['DS_ENDERECO','ENDERECO','ENDERECO_DA_ESCOLA','NO_LOGRADOURO','LOGRADOURO','CO_CEP','CEP','NU_ENDERECO','NUMERO'].some(x=>H.has(norm(x)));
    const looksAtlas=H.has('ID')&&H.has('GROUP')&&(H.has('SOURCE')||H.has('DATASTATUS')||H.has('VALIDATIONLEVEL'));
    return {headers,delimiter,hasName,hasCode,hasAddress,looksAtlas,valid:hasName&&hasAddress&&!looksAtlas};
  }catch{return {headers:[],valid:false}}
}
function candidateCatalogCsv(){
  const out=[];
  if(process.env.INEP_CATALOGO_ESCOLAS_CSV)out.push(path.resolve(process.env.INEP_CATALOGO_ESCOLAS_CSV));
  for(const d of [path.join(os.homedir(),'Downloads'),path.join(os.homedir(),'Desktop'),root]){
    try{for(const e of fs.readdirSync(d,{withFileTypes:true})){
      if(!e.isFile()||!/\.csv$/i.test(e.name))continue;
      if(/atlas_ms_.*catalogo_camadas|mapa_fontes|referencias/i.test(e.name))continue;
      if(!/(catalog|escol|inep)/i.test(e.name))continue;
      out.push(path.join(d,e.name));
    }}catch{}
  }
  return [...new Set(out)].filter(validCsv).filter(f=>catalogHeaderInfo(f).valid).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);
}
async function obtainZip(){
  const dest=path.join(rawDir,'escolas_inep_censo_escolar_2025.zip');
  if(validZip(dest)) return {file:dest,method:'snapshot bruto já existente'};
  const local=candidateLocalZips()[0];
  if(local){fs.copyFileSync(local,dest);return {file:dest,method:`arquivo local detectado em ${local}`};}
  print('Baixando microdados oficiais do INEP 2025...');
  try{await nodeDownload(OFFICIAL_URL,dest);return {file:dest,method:'Node fetch com retentativas'};}
  catch(e){print(`Node não concluiu a descarga: ${e.message}`)}
  print('Tentando mecanismos nativos do Windows/curl...');
  const sh=shellDownload(OFFICIAL_URL,dest);
  if(sh.ok) return {file:dest,method:`${sh.method} com retentativas`};
  throw new Error('O servidor do INEP não entregou o ZIP automaticamente. Baixe o arquivo oficial pelo navegador e execute novamente. O script detecta automaticamente o arquivo em Downloads.');
}

function listZip(zipFile){
  const commands = process.platform==='win32' ? [['tar.exe',['-tf',zipFile]],['tar',['-tf',zipFile]]] : [['unzip',['-Z1',zipFile]],['tar',['-tf',zipFile]]];
  for(const [cmd,args] of commands){
    try{const r=spawnSync(cmd,args,{encoding:'utf8',windowsHide:true,maxBuffer:20*1024*1024});if(r.status===0&&r.stdout)return r.stdout.split(/\r?\n/).filter(Boolean);}catch{}
  }
  throw new Error('Não foi possível listar o ZIP. Windows 11 deve disponibilizar tar.exe.');
}
function extractSchoolCsv(zipFile){
  const entries=listZip(zipFile);
  const csvs=entries.filter(x=>/\.csv$/i.test(x));
  const target=csvs.find(x=>/(^|[\\/])Tabela_Escola_2025\.csv$/i.test(x)) || csvs.find(x=>/escola/i.test(path.basename(x))) || csvs[0];
  if(!target) throw new Error('ZIP oficial não contém CSV de escolas reconhecível.');
  const temp=path.join(rawDir,'_inep_escolas_2025_tmp'); fs.rmSync(temp,{recursive:true,force:true}); fs.mkdirSync(temp,{recursive:true});
  const tar = process.platform==='win32' ? 'tar.exe' : 'tar';
  let r=spawnSync(tar,['-xf',zipFile,'-C',temp,target],{stdio:'inherit',windowsHide:true,timeout:600000});
  if(r.status!==0 && process.platform!=='win32') r=spawnSync('unzip',['-j',zipFile,target,'-d',temp],{stdio:'inherit',timeout:600000});
  if(r.status!==0) throw new Error(`Não foi possível extrair ${target}`);
  let extracted=path.join(temp,target);
  if(!fs.existsSync(extracted)){
    const hits=[]; const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.csv$/i.test(e.name))hits.push(p)}}; walk(temp); extracted=hits[0];
  }
  if(!extracted || !fs.existsSync(extracted)) throw new Error('CSV de escolas não encontrado após extração.');
  return {csv:extracted,entry:target,temp};
}

function parseCsvLine(line,delimiter){
  const out=[]; let cur='',quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(quoted && line[i+1]==='"'){cur+='"';i++;} else quoted=!quoted;
    } else if(ch===delimiter && !quoted){out.push(cur);cur='';} else cur+=ch;
  }
  out.push(cur); return out;
}
function detectDelimiter(line){
  const cands=[';','\t',',','|']; let best=';',score=-1;
  for(const d of cands){const n=parseCsvLine(line,d).length;if(n>score){score=n;best=d;}}
  return best;
}

function detectCsvEncoding(file){
  const fd=fs.openSync(file,'r');
  try{
    const size=Math.min(fs.statSync(file).size,262144);
    const b=Buffer.alloc(size);
    fs.readSync(fd,b,0,size,0);
    try{new TextDecoder('utf-8',{fatal:true}).decode(b);return 'utf8';}
    catch{return 'latin1';}
  }finally{fs.closeSync(fd);}
}
function keyIndex(headers,candidates){
  const map=new Map(headers.map((h,i)=>[norm(h),i]));
  for(const c of candidates){const i=map.get(norm(c));if(i!==undefined)return i;}
  return -1;
}
function numberValue(v){
  const s=String(v??'').trim().replace(',','.'); const n=Number(s); return Number.isFinite(n)?n:NaN;
}

const PROP_FIELDS = [
  'CO_ENTIDADE','NO_ENTIDADE','CO_UF','SG_UF','CO_MUNICIPIO','NO_MUNICIPIO',
  'TP_SITUACAO_FUNCIONAMENTO','TP_DEPENDENCIA','TP_CATEGORIA_ESCOLA_PRIVADA',
  'TP_LOCALIZACAO','TP_LOCALIZACAO_DIFERENCIADA','DS_ENDERECO','NU_ENDERECO',
  'DS_COMPLEMENTO','NO_BAIRRO','CO_CEP','NU_LATITUDE','NU_LONGITUDE',
  'IN_REGULAR','IN_EJA','IN_PROFISSIONALIZANTE','IN_EDUCACAO_INDIGENA',
  'IN_LOCAL_FUNC_PREDIO_ESCOLAR','IN_AGUA_POTAVEL','IN_ENERGIA_REDE_PUBLICA','IN_INTERNET',
  'IN_BANDA_LARGA','IN_BIBLIOTECA','IN_SALA_LEITURA','IN_LABORATORIO_INFORMATICA',
  'IN_LABORATORIO_CIENCIAS','IN_QUADRA_ESPORTES','IN_AUDITORIO'
];

async function parseSchools(csvFile,options={}){
  const sourceKind=options.sourceKind||'microdados';
  const assumeFilteredMs=options.assumeFilteredMs===true;
  const sourceLabel=sourceKind==='catalogo'?'INEP · Catálogo de Escolas · exportação oficial':'INEP · Censo Escolar da Educação Básica 2025 · microdados públicos';
  const sourcePage=sourceKind==='catalogo'?CATALOG_PAGE:SOURCE_PAGE;
  const stream=fs.createReadStream(csvFile,{encoding:detectCsvEncoding(csvFile)});
  const rl=readline.createInterface({input:stream,crlfDelay:Infinity});
  let headers=null,delimiter=';',idx={},lineNo=0,totalMs=0,withCoords=0,outBounds=0,missingCoords=0;
  const features=[]; const sampleMissing=[];
  for await (let line of rl){
    lineNo++;
    if(lineNo===1){
      line=line.replace(/^\uFEFF/,''); delimiter=detectDelimiter(line); headers=parseCsvLine(line,delimiter);
      idx={
        sg:keyIndex(headers,['SG_UF','UF','SIGLA_UF']), coUf:keyIndex(headers,['CO_UF','CD_UF']), noUf:keyIndex(headers,['NO_UF','NM_UF']),
        lat:keyIndex(headers,['NU_LATITUDE','LATITUDE','VL_LATITUDE','LAT']), lon:keyIndex(headers,['NU_LONGITUDE','LONGITUDE','VL_LONGITUDE','LON','LONG']),
        code:keyIndex(headers,['CO_ENTIDADE','CO_ESCOLA','CODIGO_INEP']), name:keyIndex(headers,['NO_ENTIDADE','NO_ESCOLA','NOME_ESCOLA']),
        mun:keyIndex(headers,['NO_MUNICIPIO','NM_MUNICIPIO','MUNICIPIO']), munCode:keyIndex(headers,['CO_MUNICIPIO','CD_MUNICIPIO'])
      };
      if(idx.lat<0||idx.lon<0) throw new Error(`O arquivo ${sourceKind} foi localizado, mas não contém campos públicos de latitude/longitude reconhecidos. Cabeçalho contém ${headers.length} campos. Não será criada geometria artificial.`);
      continue;
    }
    if(!line.trim()) continue;
    const row=parseCsvLine(line,delimiter);
    const uf = idx.sg>=0?String(row[idx.sg]??'').trim().toUpperCase():'';
    const coUf = idx.coUf>=0?String(row[idx.coUf]??'').trim().replace(/\.0$/,''):'';
    const noUf = idx.noUf>=0?norm(row[idx.noUf]??''):'';
    const isMs = assumeFilteredMs || uf==='MS' || coUf==='50' || noUf.includes('MATO_GROSSO_DO_SUL');
    if(!isMs) continue;
    totalMs++;
    const lat=numberValue(row[idx.lat]), lon=numberValue(row[idx.lon]);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)){missingCoords++;if(sampleMissing.length<5)sampleMissing.push(idx.code>=0?row[idx.code]:`linha ${lineNo}`);continue;}
    if(lat < -24.3 || lat > -16.9 || lon < -58.4 || lon > -50.6){outBounds++;continue;}
    const props={};
    const headerMap=new Map(headers.map((h,i)=>[norm(h),i]));
    for(const f of PROP_FIELDS){const i=headerMap.get(norm(f));if(i!==undefined && String(row[i]??'').trim()!=='')props[f]=row[i];}
    props.ano_censo=2025;
    props.fonte_oficial=sourceLabel;
    props.data_corte_joaju=cut;
    props.precisao_geometria='coordenada publicada no registro escolar do Censo Escolar 2025';
    props.source_page=sourcePage;
    features.push({type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:props});
    withCoords++;
  }
  if(totalMs===0) throw new Error('Nenhuma linha de Mato Grosso do Sul foi reconhecida no CSV oficial.');
  const coverage=withCoords/totalMs*100;
  if(withCoords<100) throw new Error(`Somente ${withCoords} escolas de MS possuem coordenadas utilizáveis. O snapshot foi rejeitado para evitar uma camada enganosa.`);
  return {data:{type:'FeatureCollection',features,atlas_metadata:{
    fonte:sourceLabel,pagina_fonte:sourcePage,catalogo_escolas:CATALOG_PAGE,
    corte_publicado:cut,ano_censo:2025,materializacao:'snapshot vetorial local JOAJU MS',
    cobertura_posicional_pct:Number(coverage.toFixed(2)),registros_ms_lidos:totalMs,registros_com_coordenada_valida:withCoords,
    registros_sem_coordenada:missingCoords,registros_fora_envelope_ms:outBounds,
    observacao:'A geometria usa somente coordenadas publicadas pela fonte. Ausência de coordenada não é substituída por sede municipal nem geocodificação automática.'
  }},stats:{totalMs,withCoords,missingCoords,outBounds,coverage:Number(coverage.toFixed(2)),sampleMissing,sourceKind,sourceLabel,sourcePage}};
}


const CNEFE_FALLBACK_HEADERS=[
  'COD_UNICO_ENDERECO','COD_UF','COD_MUNICIPIO','COD_DISTRITO','COD_SUBDISTRITO','COD_SETOR','NUM_QUADRA','NUM_FACE','CEP','DSC_LOCALIDADE',
  'NOM_TIPO_SEGLOGR','NOM_TITULO_SEGLOGR','NOM_SEGLOGR','NUM_ENDERECO','DSC_MODIFICADOR',
  'NOM_COMP_ELEM1','VAL_COMP_ELEM1','NOM_COMP_ELEM2','VAL_COMP_ELEM2','NOM_COMP_ELEM3','VAL_COMP_ELEM3','NOM_COMP_ELEM4','VAL_COMP_ELEM4','NOM_COMP_ELEM5','VAL_COMP_ELEM5',
  'LATITUDE','LONGITUDE','NV_GEO_COORD','COD_ESPECIE','DSC_ESTABELECIMENTO','COD_INDICADOR_ESTAB_ENDERECO','COD_INDICADOR_CONST_ENDERECO','COD_INDICADOR_FINALIDADE_CONST','COD_TIPO_ESPECI'
];
function decodeTextFile(file){
  const b=fs.readFileSync(file);
  try{return new TextDecoder('utf-8',{fatal:true}).decode(b)}catch{}
  try{return new TextDecoder('windows-1252').decode(b)}catch{}
  return b.toString('latin1');
}
function cleanDigits(v){return String(v??'').replace(/\D/g,'')}
function normalizeSchoolText(v){
  return String(v??'').replace(/\uFFFD/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
const SCHOOL_ABBR=new Map([
  ['PROFESSORA','PROF'],['PROFESSOR','PROF'],['PROFA','PROF'],['PROF','PROF'],
  ['DOUTORA','DR'],['DOUTOR','DR'],['PADRE','PE'],['MARECHAL','MAL'],['CORONEL','CEL'],
  ['DEPUTADO','DEP'],['SENADOR','SEN'],['GOVERNADOR','GOV'],['PRESIDENTE','PRES']
]);
const SCHOOL_STOP=new Set(['ESCOLA','COLEGIO','CENTRO','EDUCACIONAL','EDUCACAO','ENSINO','UNIDADE','MUNICIPAL','ESTADUAL','PUBLICA','PUBLICO','DE','DA','DO','DAS','DOS','E','EM','EE','EMEF','EMEI','EMEIEF','CMEI','CEI','CIEI','EPM','EMP','EEP','CEEP','CEIM','CRECHE','PRE','POLO','RURAL','INDIGENA','CIVICO','MILITAR']);
function schoolTokens(v){return normalizeSchoolText(v).split(' ').filter(Boolean).map(x=>SCHOOL_ABBR.get(x)||x)}
function schoolCoreTokens(v){return schoolTokens(v).filter(x=>x.length>1&&!SCHOOL_STOP.has(x))}
function tokenJaccard(a,b){
  const A=new Set(schoolCoreTokens(a)),B=new Set(schoolCoreTokens(b));if(!A.size||!B.size)return 0;let inter=0;for(const x of A)if(B.has(x))inter++;return inter/(A.size+B.size-inter);
}
function bigramsFromText(v){const s=String(v??'').replace(/ /g,'');const a=[];for(let i=0;i<s.length-1;i++)a.push(s.slice(i,i+2));return a}
function diceFromText(a,b){const A=bigramsFromText(a),B=bigramsFromText(b);if(!A.length||!B.length)return 0;const counts=new Map();for(const x of A)counts.set(x,(counts.get(x)||0)+1);let hit=0;for(const x of B){const n=counts.get(x)||0;if(n){hit++;counts.set(x,n-1)}}return 2*hit/(A.length+B.length)}
function diceSimilarity(a,b){return diceFromText(schoolTokens(a).join(''),schoolTokens(b).join(''))}
function coreDiceSimilarity(a,b){return diceFromText(schoolCoreTokens(a).join(''),schoolCoreTokens(b).join(''))}
function terminalUnitMarker(v){
  const t=schoolTokens(v);if(!t.length)return '';
  const joined=t.join(' ');
  const m=joined.match(/\bUNIDADE\s+(\d+|I|II|III|IV|V|VI|VII|VIII|IX|X)\b$/);
  if(m)return m[1];
  const last=t[t.length-1];
  if(/^\d+$/.test(last))return last;
  return '';
}
function unitConflict(a,b){const x=terminalUnitMarker(a),y=terminalUnitMarker(b);return Boolean(x&&y&&x!==y)}
function prefixSimilarity(a,b){
  const aa=schoolCoreTokens(a).join(''),bb=schoolCoreTokens(b).join('');
  if(Math.min(aa.length,bb.length)<12||unitConflict(a,b))return 0;
  const short=aa.length<=bb.length?aa:bb,long=aa.length<=bb.length?bb:aa;
  if(!long.startsWith(short))return 0;
  const ratio=short.length/long.length;
  if(short.length<18&&ratio<.8)return 0;
  return Math.min(.995,.92+.075*Math.min(1,ratio));
}
function nameSimilarity(a,b){
  const na=normalizeSchoolText(a),nb=normalizeSchoolText(b);if(!na||!nb)return 0;if(na===nb)return 1;
  return Math.max(tokenJaccard(a,b),diceSimilarity(a,b),coreDiceSimilarity(a,b),prefixSimilarity(a,b));
}
function addressSimilarity(a,b){
  const na=normalizeSchoolText(a),nb=normalizeSchoolText(b);if(!na||!nb)return 0;
  const A=new Set(na.split(' ').filter(x=>x.length>2)),B=new Set(nb.split(' ').filter(x=>x.length>2));
  let inter=0;for(const x of A)if(B.has(x))inter++;
  const jac=A.size&&B.size?inter/(A.size+B.size-inter):0;
  return Math.max(jac,diceFromText(na.replace(/ /g,''),nb.replace(/ /g,'')));
}
function adminType(v){
  const n=` ${normalizeSchoolText(v)} `;
  if(/\b(EE|ESCOLA ESTADUAL)\b/.test(n))return 'estadual';
  if(/\b(EM|EMP|EMEF|EMEI|EMEIEF|ESCOLA MUNICIPAL)\b/.test(n))return 'municipal';
  if(/\b(ESCOLA FEDERAL|INSTITUTO FEDERAL|IFMS)\b/.test(n))return 'federal';
  return '';
}
function inepAddress(p){return [p.DS_ENDERECO,p.NU_ENDERECO,p.DS_COMPLEMENTO,p.NO_BAIRRO,p.CO_CEP].filter(Boolean).join(' ')}
function cnefeAddress(p){return [p.NOM_TIPO_SEGLOGR,p.NOM_TITULO_SEGLOGR,p.NOM_SEGLOGR,p.NUM_ENDERECO,p.DSC_LOCALIDADE,p.CEP].filter(Boolean).join(' ')}
async function parseInepRecords(csvFile,year=2025){
  const encoding=detectCsvEncoding(csvFile);
  const stream=fs.createReadStream(csvFile,{encoding});const rl=readline.createInterface({input:stream,crlfDelay:Infinity});
  let headers=null,delimiter=';',idx={},lineNo=0;const rows=[];
  const aliases={
    DS_ENDERECO:['DS_ENDERECO','ENDERECO','NO_ENDERECO','NO_LOGRADOURO','DS_LOGRADOURO'],
    NU_ENDERECO:['NU_ENDERECO','NR_ENDERECO','NUM_ENDERECO','NUMERO_ENDERECO'],
    DS_COMPLEMENTO:['DS_COMPLEMENTO','COMPLEMENTO','NO_COMPLEMENTO'],
    NO_BAIRRO:['NO_BAIRRO','BAIRRO','NM_BAIRRO'],
    CO_CEP:['CO_CEP','CEP','NU_CEP']
  };
  let hm=null;
  for await(let line of rl){
    lineNo++;
    if(lineNo===1){
      line=line.replace(/^\uFEFF/,'');delimiter=detectDelimiter(line);headers=parseCsvLine(line,delimiter);
      idx={sg:keyIndex(headers,['SG_UF']),coUf:keyIndex(headers,['CO_UF']),code:keyIndex(headers,['CO_ENTIDADE','CO_ESCOLA']),name:keyIndex(headers,['NO_ENTIDADE','NO_ESCOLA']),mun:keyIndex(headers,['NO_MUNICIPIO']),munCode:keyIndex(headers,['CO_MUNICIPIO'])};
      hm=new Map(headers.map((h,i)=>[norm(h),i]));
      continue;
    }
    if(!line.trim())continue;
    const row=parseCsvLine(line,delimiter);
    const uf=idx.sg>=0?String(row[idx.sg]??'').trim().toUpperCase():'';
    const coUf=idx.coUf>=0?cleanDigits(row[idx.coUf]):'';
    if(uf!=='MS'&&coUf!=='50')continue;
    const p={};
    for(const f of PROP_FIELDS){const i=hm.get(norm(f));if(i!==undefined&&String(row[i]??'').trim()!=='')p[f]=row[i]}
    for(const [canonical,names] of Object.entries(aliases)){
      if(p[canonical])continue;
      const i=keyIndex(headers,names);if(i>=0&&String(row[i]??'').trim()!=='')p[canonical]=row[i];
    }
    if(!p.CO_ENTIDADE&&idx.code>=0)p.CO_ENTIDADE=row[idx.code];
    if(!p.NO_ENTIDADE&&idx.name>=0)p.NO_ENTIDADE=row[idx.name];
    if(!p.CO_MUNICIPIO&&idx.munCode>=0)p.CO_MUNICIPIO=row[idx.munCode];
    if(!p.NO_MUNICIPIO&&idx.mun>=0)p.NO_MUNICIPIO=row[idx.mun];
    if(p.CO_ENTIDADE&&p.NO_ENTIDADE)rows.push(p);
  }
  if(!rows.length)throw new Error(`Nenhuma escola de Mato Grosso do Sul foi reconhecida nos microdados INEP ${year}.`);
  rows._encoding=encoding;
  return rows;
}


function firstHeaderIndex(headers,names){return keyIndex(headers,names)}
async function parseOfficialCatalogCsv(file){
  const info=catalogHeaderInfo(file);
  if(!info.valid)throw new Error('O CSV indicado não tem estrutura compatível com uma exportação escolar do Catálogo de Escolas do INEP.');
  const stream=fs.createReadStream(file,{encoding:detectCsvEncoding(file)});const rl=readline.createInterface({input:stream,crlfDelay:Infinity});
  let headers=null,delimiter=';',idx={},lineNo=0;const rows=[];let total=0,ms=0,withAddress=0,withCoords=0,outBounds=0;
  for await(let line of rl){
    lineNo++;
    if(lineNo===1){
      line=line.replace(/^\uFEFF/,'');delimiter=detectDelimiter(line);headers=parseCsvLine(line,delimiter);
      idx={
        code:firstHeaderIndex(headers,['CO_ENTIDADE','CO_ESCOLA','CODIGO_INEP','CODIGO DA ESCOLA','CÓDIGO DA ESCOLA','COD_ESCOLA']),
        name:firstHeaderIndex(headers,['NO_ENTIDADE','NO_ESCOLA','NOME_ESCOLA','NOME DA ESCOLA','ESCOLA']),
        sg:firstHeaderIndex(headers,['SG_UF','UF','SIGLA_UF']),coUf:firstHeaderIndex(headers,['CO_UF','COD_UF','CD_UF']),
        mun:firstHeaderIndex(headers,['NO_MUNICIPIO','NM_MUNICIPIO','MUNICIPIO','MUNICÍPIO']),munCode:firstHeaderIndex(headers,['CO_MUNICIPIO','COD_MUNICIPIO','CD_MUNICIPIO','COD_IBGE']),
        address:firstHeaderIndex(headers,['DS_ENDERECO','ENDERECO','ENDEREÇO','ENDERECO DA ESCOLA','ENDEREÇO DA ESCOLA','NO_LOGRADOURO','LOGRADOURO']),
        number:firstHeaderIndex(headers,['NU_ENDERECO','NUM_ENDERECO','NUMERO','NÚMERO','NUMERO ENDERECO']),
        comp:firstHeaderIndex(headers,['DS_COMPLEMENTO','COMPLEMENTO']),bairro:firstHeaderIndex(headers,['NO_BAIRRO','BAIRRO']),cep:firstHeaderIndex(headers,['CO_CEP','CEP','NU_CEP']),
        lat:firstHeaderIndex(headers,['NU_LATITUDE','LATITUDE','VL_LATITUDE','LAT']),lon:firstHeaderIndex(headers,['NU_LONGITUDE','LONGITUDE','VL_LONGITUDE','LON','LONG'])
      };
      if(idx.name<0||([idx.address,idx.cep].every(i=>i<0)&&[idx.lat,idx.lon].some(i=>i<0)))throw new Error(`Exportação do Catálogo localizada, mas sem campos suficientes de endereço/CEP ou latitude/longitude. Cabeçalho tem ${headers.length} campos.`);
      continue;
    }
    if(!line.trim())continue;total++;const r=parseCsvLine(line,delimiter);
    const uf=idx.sg>=0?String(r[idx.sg]??'').trim().toUpperCase():'';const coUf=idx.coUf>=0?cleanDigits(r[idx.coUf]):'';
    const munName=idx.mun>=0?String(r[idx.mun]??'').trim():'';const munCode=idx.munCode>=0?cleanDigits(r[idx.munCode]):'';
    const likelyMs=uf==='MS'||coUf==='50'||munCode.startsWith('50')||(!uf&&!coUf&&!munCode);
    if(!likelyMs)continue;ms++;
    const x={
      CO_ENTIDADE:idx.code>=0?cleanDigits(r[idx.code]):'',NO_ENTIDADE:idx.name>=0?String(r[idx.name]??'').trim():'',
      CO_MUNICIPIO:munCode,NO_MUNICIPIO:munName,DS_ENDERECO:idx.address>=0?String(r[idx.address]??'').trim():'',
      NU_ENDERECO:idx.number>=0?String(r[idx.number]??'').trim():'',DS_COMPLEMENTO:idx.comp>=0?String(r[idx.comp]??'').trim():'',
      NO_BAIRRO:idx.bairro>=0?String(r[idx.bairro]??'').trim():'',CO_CEP:idx.cep>=0?cleanDigits(r[idx.cep]):'',
      NU_LATITUDE:idx.lat>=0?String(r[idx.lat]??'').trim():'',NU_LONGITUDE:idx.lon>=0?String(r[idx.lon]??'').trim():''
    };
    if(!x.NO_ENTIDADE)continue;
    if(inepAddress(x).trim())withAddress++;
    const lat=numberValue(x.NU_LATITUDE),lon=numberValue(x.NU_LONGITUDE);
    if(Number.isFinite(lat)&&Number.isFinite(lon)){
      if(lat >= -24.3 && lat <= -16.9 && lon >= -58.4 && lon <= -50.6)withCoords++;
      else outBounds++;
    }
    rows.push(x);
  }
  if(!rows.length)throw new Error('A exportação do Catálogo não produziu linhas escolares utilizáveis para MS.');
  return {rows,stats:{file:path.relative(root,file).replaceAll('\\','/'),sha256:sha256File(file),headers:info.headers,total_rows:total,ms_rows:rows.length,with_address:withAddress,with_coordinates:withCoords,outside_ms_envelope:outBounds,coordinate_coverage_pct:Number((100*withCoords/rows.length).toFixed(2)),encoding:detectCsvEncoding(file)}};
}
function municipalityCompatible(a,b){
  const ac=cleanDigits(a.CO_MUNICIPIO),bc=cleanDigits(b.CO_MUNICIPIO);if(ac&&bc)return ac===bc;
  const an=normalizeSchoolText(a.NO_MUNICIPIO),bn=normalizeSchoolText(b.NO_MUNICIPIO);return Boolean(an&&bn&&an===bn);
}
function enrichInepWithCatalog(inepRows,catalogRows){
  const byCode=new Map();for(const c of catalogRows){const k=cleanDigits(c.CO_ENTIDADE);if(k&&!byCode.has(k))byCode.set(k,c)}
  const enriched=[];let byCodeCount=0,byNameCount=0,noCatalog=0,addressAdded=0;
  for(const src of inepRows){
    const p={...src};let c=byCode.get(cleanDigits(p.CO_ENTIDADE));let method='';let score=1;
    if(c&&municipalityCompatible(p,c)){method='codigo_inep';byCodeCount++}
    else{
      c=null;let best=null,second=null;
      for(const cand of catalogRows){if(!municipalityCompatible(p,cand))continue;const ns=nameSimilarity(p.NO_ENTIDADE,cand.NO_ENTIDADE);if(ns<.80)continue;const x={cand,ns};if(!best||ns>best.ns){second=best;best=x}else if(!second||ns>second.ns)second=x}
      if(best&&best.ns>=.96&&(best.ns-(second?.ns||0))>=.10&&!unitConflict(p.NO_ENTIDADE,best.cand.NO_ENTIDADE)&&!((adminType(p.NO_ENTIDADE)&&adminType(best.cand.NO_ENTIDADE))&&adminType(p.NO_ENTIDADE)!==adminType(best.cand.NO_ENTIDADE))){c=best.cand;method='nome_unico';score=best.ns;byNameCount++}
    }
    if(c){
      let added=false;
      for(const f of ['DS_ENDERECO','NU_ENDERECO','DS_COMPLEMENTO','NO_BAIRRO','CO_CEP'])if(!p[f]&&c[f]){p[f]=c[f];added=true}
      if(!p.NO_MUNICIPIO&&c.NO_MUNICIPIO)p.NO_MUNICIPIO=c.NO_MUNICIPIO;if(!p.CO_MUNICIPIO&&c.CO_MUNICIPIO)p.CO_MUNICIPIO=c.CO_MUNICIPIO;
      p.CATALOGO_INEP_MATCH=method;p.CATALOGO_INEP_MATCH_SCORE=Number(score.toFixed(4));p.CATALOGO_INEP_ENDERECO=inepAddress(c);p.CATALOGO_INEP_FONTE='Catálogo de Escolas · InepData · exportação oficial';
      if(added)addressAdded++;
    }else noCatalog++;
    enriched.push(p);
  }
  enriched._encoding=inepRows._encoding;
  return {rows:enriched,stats:{matched_by_code:byCodeCount,matched_by_unique_name:byNameCount,without_catalog_match:noCatalog,address_enriched:addressAdded,total_inep:inepRows.length}};
}

function directCatalogGeometryMatch(inepRows,catalogRows){
  const byCode=new Map();
  for(const c of catalogRows){
    const k=cleanDigits(c.CO_ENTIDADE);
    if(k&&!byCode.has(k))byCode.set(k,c);
  }
  const features=[],unresolved=[];let codeLinked=0,validCoords=0,outBounds=0;
  for(const src of inepRows){
    const code=cleanDigits(src.CO_ENTIDADE),c=byCode.get(code);
    if(!c||!municipalityCompatible(src,c)){unresolved.push(src);continue}
    codeLinked++;
    const lat=numberValue(c.NU_LATITUDE),lon=numberValue(c.NU_LONGITUDE);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)){unresolved.push(src);continue}
    if(lat < -24.3 || lat > -16.9 || lon < -58.4 || lon > -50.6){outBounds++;unresolved.push(src);continue}
    const p={...src};
    for(const f of ['DS_ENDERECO','NU_ENDERECO','DS_COMPLEMENTO','NO_BAIRRO','CO_CEP'])if(!p[f]&&c[f])p[f]=c[f];
    p.CATALOGO_INEP_MATCH='codigo_inep';
    p.CATALOGO_INEP_MATCH_SCORE=1;
    p.CATALOGO_INEP_ENDERECO=inepAddress(c);
    p.CATALOGO_INEP_FONTE='Catálogo de Escolas · InepData · exportação oficial';
    p.ano_censo=2025;
    p.fonte_oficial='INEP Censo Escolar 2025 + Catálogo de Escolas InepData';
    p.fonte_atributos='INEP · Censo Escolar da Educação Básica 2025';
    p.fonte_geometria='INEP · Catálogo de Escolas · InepData · exportação oficial';
    p.data_corte_joaju=cut;
    p.precisao_geometria='latitude/longitude publicadas diretamente no Catálogo de Escolas do INEP';
    p.catalogo_latitude=lat;
    p.catalogo_longitude=lon;
    features.push({type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:p});
    validCoords++;
  }
  const coverage=100*features.length/inepRows.length;
  return {features,unresolved,coverage,stats:{linked_by_code:codeLinked,valid_coordinates:validCoords,outside_ms_envelope:outBounds,unresolved:unresolved.length,total_inep:inepRows.length}};
}

function writeCatalogInstruction(){
  const f=path.join(docsDir,`INSTRUCAO_CATALOGO_ESCOLAS_INEP_${cut}.txt`);
  const text=`JOAJU MS · Catálogo de Escolas INEP\n\nA exportação oficial do Catálogo de Escolas ainda não foi localizada.\n\n1. Abra ${CATALOG_PAGE}\n2. Entre no Catálogo de Escolas.\n3. Filtre Mato Grosso do Sul.\n4. Use a função de exportação do próprio Catálogo e escolha CSV.\n5. Salve o CSV em Downloads.\n6. Execute novamente apenas este comando\n\nnode scripts/materializar_escolas_inep_2025.mjs\n\nO script rejeita o arquivo atlas_ms_v1.8.0-dev_catalogo_camadas.csv porque ele é o catálogo de camadas do Atlas e não uma exportação escolar do INEP.\n`;
  fs.writeFileSync(f,text,'utf8');return f;
}

function candidateLocalZips2022(){
  const names=['microdados_censo_escolar_2022.zip','microdados_censo_escolar_2022_.zip'];
  const dirs=[root,rawDir,path.join(os.homedir(),'Downloads'),path.join(os.homedir(),'Desktop')];
  if(process.env.INEP_ESCOLAS_2022_ZIP) dirs.unshift(path.dirname(path.resolve(process.env.INEP_ESCOLAS_2022_ZIP)));
  const out=[];
  if(process.env.INEP_ESCOLAS_2022_ZIP) out.push(path.resolve(process.env.INEP_ESCOLAS_2022_ZIP));
  for(const d of dirs) for(const n of names) out.push(path.join(d,n));
  return [...new Set(out)].filter(validZip);
}
async function obtainZip2022(){
  const dest=path.join(rawDir,'escolas_inep_censo_escolar_2022.zip');
  if(validZip(dest)) return {file:dest,method:'snapshot bruto INEP 2022 já existente'};
  const local=candidateLocalZips2022()[0];
  if(local){fs.copyFileSync(local,dest);return {file:dest,method:`arquivo INEP 2022 local detectado em ${local}`};}
  print('Baixando microdados oficiais do INEP 2022 para ponte histórica por CO_ENTIDADE...');
  try{await nodeDownload(OFFICIAL_URL_2022,dest);return {file:dest,method:'Node fetch INEP 2022 com retentativas'};}
  catch(e){print(`INEP 2022 não concluiu por Node: ${e.message}`)}
  const sh=shellDownload(OFFICIAL_URL_2022,dest);
  if(sh.ok) return {file:dest,method:`${sh.method} · INEP 2022`};
  throw new Error('Não foi possível obter os microdados INEP 2022. Baixe o ZIP oficial e deixe-o em Downloads. O teste de escolas continuará sem consultar nenhuma camada fora de educação.');
}
function extractSchoolCsv2022(zipFile){
  const entries=listZip(zipFile);
  const csvs=entries.filter(x=>/\.csv$/i.test(x));
  const target=
    csvs.find(x=>/microdados_ed_basica_2022\.csv$/i.test(x)) ||
    csvs.find(x=>/(microdados|censo).*2022.*\.csv$/i.test(path.basename(x))) ||
    csvs.find(x=>/(escola|basica)/i.test(path.basename(x))) ||
    csvs[0];
  if(!target) throw new Error('ZIP INEP 2022 não contém CSV reconhecível.');
  const temp=path.join(rawDir,'_inep_escolas_2022_tmp'); fs.rmSync(temp,{recursive:true,force:true}); fs.mkdirSync(temp,{recursive:true});
  const tar=process.platform==='win32'?'tar.exe':'tar';
  let r=spawnSync(tar,['-xf',zipFile,'-C',temp,target],{stdio:'inherit',windowsHide:true,timeout:600000});
  if(r.status!==0 && process.platform!=='win32')r=spawnSync('unzip',['-j',zipFile,target,'-d',temp],{stdio:'inherit',timeout:600000});
  if(r.status!==0) throw new Error(`Não foi possível extrair ${target} do INEP 2022.`);
  let extracted=path.join(temp,target);
  if(!fs.existsSync(extracted)){
    const hits=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.csv$/i.test(e.name))hits.push(p)}};walk(temp);extracted=hits[0];
  }
  if(!extracted||!fs.existsSync(extracted))throw new Error('CSV INEP 2022 não encontrado após extração.');
  return {csv:extracted,entry:target,temp};
}

async function fetchText(url){
  let last;for(let attempt=1;attempt<=4;attempt++){
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),60000);try{const r=await fetch(url,{redirect:'follow',cache:'no-store',signal:ctl.signal,headers:{'User-Agent':'Mozilla/5.0 JOAJU-MS/1.8 CNEFE materializer','Accept':'text/html,*/*'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.text()}catch(e){last=e;if(attempt<4)await sleep(1000*attempt)}finally{clearTimeout(timer)}}throw last;
}
function linksFromDirectory(html,base){
  const out=[];const re=/href=["']([^"'#?]+)["']/gi;let m;while((m=re.exec(html))){try{const u=new URL(m[1],base);if(u.origin===new URL(base).origin&&u.href.startsWith(base)&&u.href!==base)out.push(u.href)}catch{}}
  return [...new Set(out)];
}
async function discoverCnefeResources(){
  if(process.env.CNEFE_MS_URLS)return process.env.CNEFE_MS_URLS.split(/[;,\n]+/).map(x=>x.trim()).filter(Boolean);
  // O IBGE publica o CNEFE 2022 por UF em Arquivos_CNEFE/CSV/UF.
  // Mato Grosso do Sul é a UF 50 e o arquivo oficial é 50_MS.zip.
  return [CNEFE_MS_ZIP];
}
function safeRemoteName(url,index){try{const n=decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop()||`cnefe_${index}.zip`);return `${String(index).padStart(3,'0')}_${n}`.replace(/[<>:"/\\|?*]/g,'_')}catch{return `cnefe_${index}.zip`}}
async function downloadGeneric(url,dest){
  if(fs.existsSync(dest)&&fs.statSync(dest).size>1000)return dest;
  let last;for(let attempt=1;attempt<=4;attempt++){
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),300000);try{const r=await fetch(url,{redirect:'follow',cache:'no-store',signal:ctl.signal,headers:{'User-Agent':'Mozilla/5.0 JOAJU-MS/1.8 CNEFE materializer','Accept':'application/zip,text/csv,application/octet-stream,*/*'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);const b=Buffer.from(await r.arrayBuffer());if(b.length<1000)throw new Error('arquivo remoto demasiado pequeno');fs.writeFileSync(dest,b);return dest}catch(e){last=e;try{fs.rmSync(dest,{force:true})}catch{}if(attempt<4)await sleep(1500*attempt)}finally{clearTimeout(timer)}}
  const curl=process.platform==='win32'?'curl.exe':'curl';const r=spawnSync(curl,['-L','--fail','--retry','4','--retry-all-errors','--connect-timeout','30','--max-time','600','-A','Mozilla/5.0 JOAJU-MS/1.8','-o',dest,url],{stdio:'inherit',windowsHide:true,timeout:620000});if(r.status===0&&fs.existsSync(dest)&&fs.statSync(dest).size>1000)return dest;throw last||new Error('falha no download CNEFE');
}
function extractCsvsFromZip(zipFile,targetDir){
  fs.mkdirSync(targetDir,{recursive:true});const entries=listZip(zipFile).filter(x=>/\.csv$/i.test(x));if(!entries.length)return[];const tar=process.platform==='win32'?'tar.exe':'tar';let r=spawnSync(tar,['-xf',zipFile,'-C',targetDir,...entries],{stdio:'ignore',windowsHide:true,timeout:600000});
  if(r.status!==0 && process.platform!=='win32')r=spawnSync('unzip',['-o',zipFile,...entries,'-d',targetDir],{stdio:'ignore',timeout:600000});
  if(r.status!==0)throw new Error(`Não foi possível extrair CSV de ${path.basename(zipFile)}`);const hits=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.csv$/i.test(e.name))hits.push(p)}};walk(targetDir);return hits;
}
function cnefeHeaderIndex(headers,names){return keyIndex(headers,names)}
function parseCnefeCsv(file){
  const txt=decodeTextFile(file);const lines=txt.split(/\r?\n/).filter(x=>x.trim());if(!lines.length)return[];const delim=detectDelimiter(lines[0]);let first=parseCsvLine(lines[0],delim);let headers,start=0;
  if(first.some(x=>/^COD_UF$/i.test(String(x).trim()))){headers=first;start=1}else if(first.length===CNEFE_FALLBACK_HEADERS.length){headers=CNEFE_FALLBACK_HEADERS}else{return[]}
  const idx={uf:cnefeHeaderIndex(headers,['COD_UF']),mun:cnefeHeaderIndex(headers,['COD_MUNICIPIO','COD_MUN']),lat:cnefeHeaderIndex(headers,['LATITUDE']),lon:cnefeHeaderIndex(headers,['LONGITUDE']),species:cnefeHeaderIndex(headers,['COD_ESPECIE','COD_ESPECI']),name:cnefeHeaderIndex(headers,['DSC_ESTABELECIMENTO']),id:cnefeHeaderIndex(headers,['COD_UNICO_ENDERECO'])};
  if(idx.lat<0||idx.lon<0||idx.species<0||idx.name<0||idx.mun<0)return[];const hm=new Map(headers.map((h,i)=>[norm(h),i])),out=[];
  for(let i=start;i<lines.length;i++){const row=parseCsvLine(lines[i],delim);if(cleanDigits(row[idx.uf])!=='50'||cleanDigits(row[idx.species])!=='4')continue;const lat=numberValue(row[idx.lat]),lon=numberValue(row[idx.lon]);if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -24.3 || lat > -16.9 || lon < -58.4 || lon > -50.6)continue;const p={};for(const f of CNEFE_FALLBACK_HEADERS){const j=hm.get(norm(f));if(j!==undefined&&String(row[j]??'').trim()!=='')p[f]=row[j]};if(!String(p.DSC_ESTABELECIMENTO||'').trim())continue;out.push({id:String(p.COD_UNICO_ENDERECO||`${file}:${i}`),mun:cleanDigits(p.COD_MUNICIPIO),name:p.DSC_ESTABELECIMENTO,address:cnefeAddress(p),lat,lon,props:p})}
  return out;
}
async function obtainCnefeEducationPoints(){
  const cache=path.join(rawDir,'cnefe_ms_2022');fs.mkdirSync(cache,{recursive:true});const localCsv=[];const localZip=[];
  for(const d of [cache,path.join(os.homedir(),'Downloads')]){try{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(!e.isFile())continue;const p=path.join(d,e.name);if(/\.csv$/i.test(e.name)&&/(cnefe|50[_-]?ms)/i.test(e.name))localCsv.push(p);if(/\.zip$/i.test(e.name)&&/(cnefe|50[_-]?ms)/i.test(e.name))localZip.push(p)}}catch{}}
  let resources=[];try{resources=await discoverCnefeResources()}catch(e){if(!localCsv.length&&!localZip.length)throw new Error(`${e.message} Também é possível baixar o arquivo oficial 50_MS.zip do CNEFE 2022 e colocá-lo em Downloads.`)}
  const sourceFiles=[...localCsv];let n=0;for(const z of localZip){const d=path.join(cache,`local_${n++}`);sourceFiles.push(...extractCsvsFromZip(z,d))}
  for(let i=0;i<resources.length;i++){const url=resources[i],dest=path.join(cache,safeRemoteName(url,i));print(`CNEFE MS · ${i+1}/${resources.length} · ${path.basename(dest)}`);await downloadGeneric(url,dest);if(/\.csv$/i.test(dest))sourceFiles.push(dest);else if(/\.zip$/i.test(dest))sourceFiles.push(...extractCsvsFromZip(dest,path.join(cache,`remote_${i}`)))}
  const rawPoints=[];const hashes=[];const seenSourceHashes=new Set();
  for(const f of [...new Set(sourceFiles)]){
    try{
      const fileHash=sha256File(f);
      if(seenSourceHashes.has(fileHash))continue;
      seenSourceHashes.add(fileHash);
      const p=parseCnefeCsv(f);
      if(p.length){
        rawPoints.push(...p);
        hashes.push({arquivo:path.relative(root,f).replaceAll('\\','/'),sha256:fileHash,registros_ensino:p.length});
      }
    }catch(e){print(`CNEFE ignorado · ${path.basename(f)} · ${e.message}`)}
  }
  const byKey=new Map();
  for(const p of rawPoints){
    const key=String(p.id||'').trim() || `${p.mun}|${p.lat.toFixed(7)}|${p.lon.toFixed(7)}|${normalizeSchoolText(p.name)}`;
    if(!byKey.has(key))byKey.set(key,p);
  }
  const points=[...byKey.values()];
  if(rawPoints.length!==points.length)print(`CNEFE · duplicidades removidas · ${rawPoints.length-points.length}`);
  if(!points.length)throw new Error('Nenhum estabelecimento de ensino com coordenadas válidas foi extraído do CNEFE 2022 para MS.');
  return {points,hashes,resources:resources.length,raw_points:rawPoints.length,deduplicated_points:points.length};
}
function matchInepToCnefe(inepRows,cnefePoints){
  const byMun=new Map();for(const c of cnefePoints){if(!byMun.has(c.mun))byMun.set(c.mun,[]);byMun.get(c.mun).push(c)}
  const proposals=[],ambiguous=[];let addressSignalPairs=0;
  const tierCounts={catalogo_cep_numero:0,catalogo_endereco_forte:0,catalogo_nome_endereco:0,exact:0,truncated:0,strong_name:0,name_address:0};
  for(const p of inepRows){
    const mun=cleanDigits(p.CO_MUNICIPIO),cand=byMun.get(mun)||[];let best=null,second=null;
    for(const c of cand){
      const ns=nameSimilarity(p.NO_ENTIDADE,c.name);if(ns<.45)continue;
      const addrI=inepAddress(p),addrC=c.address;
      const hasAddress=Boolean(normalizeSchoolText(addrI)&&normalizeSchoolText(addrC));
      const as=hasAddress?addressSimilarity(addrI,addrC):0;
      if(hasAddress)addressSignalPairs++;
      const numI=cleanDigits(p.NU_ENDERECO),numC=cleanDigits(c.props.NUM_ENDERECO);
      const cepI=cleanDigits(p.CO_CEP),cepC=cleanDigits(c.props.CEP);
      const numberExact=Boolean(hasAddress&&numI&&numC&&numI===numC);
      const cepExact=Boolean(cepI&&cepC&&cepI.length>=8&&cepC.length>=8&&cepI===cepC);
      const catalogAddress=Boolean(p.CATALOGO_INEP_MATCH&&normalizeSchoolText(addrI));
      const numberBonus=numberExact?.05:0;const cepBonus=cepExact?.07:0;
      const adminI=adminType(p.NO_ENTIDADE),adminC=adminType(c.name);
      const adminConflict=Boolean(adminI&&adminC&&adminI!==adminC);
      let score=hasAddress?Math.min(1,(catalogAddress?.62:.78)*ns+(catalogAddress?.26:.18)*as+numberBonus+cepBonus):ns;
      if(adminConflict)score=Math.max(0,score-.035);
      const x={p,c,score,nameScore:ns,addressScore:as,hasAddress,adminConflict,numberExact,cepExact,catalogAddress};
      if(!best||score>best.score){second=best;best=x}else if(!second||score>second.score)second=x;
    }
    if(!best){ambiguous.push({codigo:p.CO_ENTIDADE,nome:p.NO_ENTIDADE,municipio:p.NO_MUNICIPIO,motivo:'sem candidato nominal'});continue}
    const margin=best.score-(second?.score||0);
    const exact=normalizeSchoolText(p.NO_ENTIDADE)===normalizeSchoolText(best.c.name);
    const coreA=schoolCoreTokens(p.NO_ENTIDADE).join(' '),coreB=schoolCoreTokens(best.c.name).join(' ');
    const coreExact=Boolean(coreA&&coreB&&coreA===coreB&&!unitConflict(p.NO_ENTIDADE,best.c.name));
    const trunc=prefixSimilarity(p.NO_ENTIDADE,best.c.name)>=.94;
    let tier='';
    if(best.catalogAddress&&best.cepExact&&best.numberExact&&best.addressScore>=.55&&best.nameScore>=.45&&margin>=.03&&!best.adminConflict)tier='catalogo_cep_numero';
    else if(best.catalogAddress&&best.addressScore>=.84&&best.nameScore>=.60&&margin>=.06&&!best.adminConflict)tier='catalogo_endereco_forte';
    else if(best.catalogAddress&&best.nameScore>=.80&&best.addressScore>=.62&&best.score>=.80&&margin>=.05&&!best.adminConflict)tier='catalogo_nome_endereco';
    else if((exact||coreExact)&&best.nameScore>=.90&&!best.adminConflict)tier='exact';
    else if(trunc&&best.nameScore>=.92&&margin>=.07&&!best.adminConflict)tier='truncated';
    else if(best.nameScore>=.92&&margin>=.10&&!best.adminConflict)tier='strong_name';
    else if(best.hasAddress&&best.nameScore>=.78&&best.addressScore>=.55&&best.score>=.82&&margin>=.05&&!best.adminConflict)tier='name_address';
    if(tier){tierCounts[tier]++;proposals.push({...best,margin,exact,tier})}
    else ambiguous.push({codigo:p.CO_ENTIDADE,nome:p.NO_ENTIDADE,municipio:p.NO_MUNICIPIO,melhor_candidato:best.c.name,score:Number(best.score.toFixed(4)),score_nome:Number(best.nameScore.toFixed(4)),score_endereco:Number(best.addressScore.toFixed(4)),margem:Number(margin.toFixed(4)),motivo:best.adminConflict?'conflito de dependência administrativa':'abaixo do limiar ou ambíguo'});
  }
  proposals.sort((a,b)=>b.score-a.score);const usedI=new Set(),usedC=new Set(),matched=[];
  for(const x of proposals){
    const ik=String(x.p.CO_ENTIDADE),ck=x.c.id;
    if(usedI.has(ik))continue;
    if(usedC.has(ck)){ambiguous.push({codigo:x.p.CO_ENTIDADE,nome:x.p.NO_ENTIDADE,municipio:x.p.NO_MUNICIPIO,melhor_candidato:x.c.name,score:Number(x.score.toFixed(4)),score_nome:Number(x.nameScore.toFixed(4)),score_endereco:Number(x.addressScore.toFixed(4)),margem:Number(x.margin.toFixed(4)),motivo:'colisão de candidato CNEFE'});continue}
    usedI.add(ik);usedC.add(ck);matched.push(x);
  }
  const features=matched.map(x=>{const p={...x.p,ano_censo:2025,fonte_oficial:'INEP Censo Escolar 2025 + IBGE CNEFE Censo Demográfico 2022',fonte_atributos:'INEP · Censo Escolar da Educação Básica 2025',fonte_geometria:'IBGE · CNEFE · Censo Demográfico 2022',data_corte_joaju:cut,precisao_geometria:'coordenada oficial IBGE CNEFE 2022 associada à escola INEP 2025 por correspondência automatizada auditável',CNEFE_COD_UNICO_ENDERECO:x.c.props.COD_UNICO_ENDERECO||x.c.id,CNEFE_DSC_ESTABELECIMENTO:x.c.name,CNEFE_COD_MUNICIPIO:x.c.mun,cnefe_match_score:Number(x.score.toFixed(4)),cnefe_match_nome:Number(x.nameScore.toFixed(4)),cnefe_match_endereco:Number(x.addressScore.toFixed(4)),cnefe_match_margem:Number(x.margin.toFixed(4)),cnefe_match_exato_nome:x.exact,cnefe_match_tier:x.tier,catalogo_inep_match:x.p.CATALOGO_INEP_MATCH||'',catalogo_inep_match_score:x.p.CATALOGO_INEP_MATCH_SCORE??null,catalogo_inep_endereco:x.p.CATALOGO_INEP_ENDERECO||''};return {type:'Feature',geometry:{type:'Point',coordinates:[x.c.lon,x.c.lat]},properties:p}});
  const coverage=100*features.length/inepRows.length,avgScore=matched.length?100*matched.reduce((a,x)=>a+x.score,0)/matched.length:0;
  return {features,coverage,avgScore,unmatched:inepRows.length-features.length,ambiguous,addressSignalPairs,tierCounts,inepEncoding:inepRows._encoding||'desconhecida'};
}

async function extendMatchWithInep2022Bridge(inep2025,cnefe,direct){
  const matched2025=new Map(direct.features.map(f=>[String(f.properties?.CO_ENTIDADE||''),f]));
  const usedCnefe=new Set(direct.features.map(f=>String(f.properties?.CNEFE_COD_UNICO_ENDERECO||'')).filter(Boolean));
  let obtained2022=null,extracted2022=null;
  try{
    obtained2022=await obtainZip2022();
    print(`INEP 2022 disponível · ${obtained2022.method}`);
    extracted2022=extractSchoolCsv2022(obtained2022.file);
    print(`CSV INEP 2022 selecionado · ${extracted2022.entry}`);
    const rows2022=await parseInepRecords(extracted2022.csv,2022);
    print(`Universo escolar INEP MS 2022 · ${rows2022.length}`);
    const m2022=matchInepToCnefe(rows2022,cnefe.points);
    print(`Ponte 2022 INEP ↔ CNEFE · ${m2022.features.length}/${rows2022.length} · ${m2022.coverage.toFixed(2)}%`);
    const bridgeByCode=new Map(m2022.features.map(f=>[String(f.properties?.CO_ENTIDADE||''),f]));
    const added=[];const bridgeAmbiguous=[];
    for(const p of inep2025){
      const code=String(p.CO_ENTIDADE||'');
      if(!code||matched2025.has(code))continue;
      const old=bridgeByCode.get(code);
      if(!old)continue;
      const cnefeId=String(old.properties?.CNEFE_COD_UNICO_ENDERECO||'');
      if(cnefeId&&usedCnefe.has(cnefeId)){
        bridgeAmbiguous.push({codigo:code,nome:p.NO_ENTIDADE,municipio:p.NO_MUNICIPIO,motivo:'ponte INEP 2022 rejeitada por colisão de endereço CNEFE'});
        continue;
      }
      const props={...p,
        ano_censo:2025,
        fonte_oficial:'INEP Censo Escolar 2025 + INEP Censo Escolar 2022 + IBGE CNEFE 2022',
        fonte_atributos:'INEP · Censo Escolar da Educação Básica 2025',
        fonte_ponte_historica:'INEP · Censo Escolar da Educação Básica 2022 · CO_ENTIDADE',
        fonte_geometria:'IBGE · CNEFE · Censo Demográfico 2022',
        data_corte_joaju:cut,
        precisao_geometria:'coordenada oficial IBGE CNEFE 2022 transferida para INEP 2025 somente quando o mesmo CO_ENTIDADE está presente no INEP 2022',
        CNEFE_COD_UNICO_ENDERECO:old.properties?.CNEFE_COD_UNICO_ENDERECO||'',
        CNEFE_DSC_ESTABELECIMENTO:old.properties?.CNEFE_DSC_ESTABELECIMENTO||'',
        CNEFE_COD_MUNICIPIO:old.properties?.CNEFE_COD_MUNICIPIO||'',
        cnefe_match_score:old.properties?.cnefe_match_score,
        cnefe_match_nome:old.properties?.cnefe_match_nome,
        cnefe_match_endereco:old.properties?.cnefe_match_endereco,
        cnefe_match_margem:old.properties?.cnefe_match_margem,
        cnefe_match_tier:'bridge_inep_2022_co_entidade',
        ponte_co_entidade_2022:true
      };
      const f={type:'Feature',geometry:old.geometry,properties:props};
      added.push(f);matched2025.set(code,f);if(cnefeId)usedCnefe.add(cnefeId);
    }
    const features=[...direct.features,...added];
    const scores=features.map(f=>Number(f.properties?.cnefe_match_score)).filter(Number.isFinite);
    const avgScore=scores.length?100*scores.reduce((a,b)=>a+b,0)/scores.length:direct.avgScore;
    const coverage=100*features.length/inep2025.length;
    const matchedCodes=new Set(features.map(f=>String(f.properties?.CO_ENTIDADE||'')));
    const ambiguous=[
      ...direct.ambiguous.filter(r=>!matchedCodes.has(String(r.codigo||''))),
      ...bridgeAmbiguous
    ];
    return {
      ...direct,
      features,
      coverage,
      avgScore,
      unmatched:inep2025.length-features.length,
      ambiguous,
      bridge2022:{
        used:true,
        inep_2022_total:rows2022.length,
        inep_2022_cnefe_matched:m2022.features.length,
        inep_2022_cnefe_coverage_pct:Number(m2022.coverage.toFixed(2)),
        added_to_2025:added.length,
        source_file:path.relative(root,obtained2022.file).replaceAll('\\','/'),
        source_sha256:sha256File(obtained2022.file),
        csv_entry:extracted2022.entry
      }
    };
  }finally{
    if(extracted2022?.temp)try{fs.rmSync(extracted2022.temp,{recursive:true,force:true})}catch{}
  }
}

function writeMatchDiagnostics(match,cnefe){
  const csv=path.join(docsDir,`ESCOLAS_INEP_CNEFE_PENDENCIAS_${cut}.csv`);const cols=['codigo','nome','municipio','melhor_candidato','score','score_nome','score_endereco','margem','motivo'];const q=v=>`"${String(v??'').replaceAll('"','""')}"`;fs.writeFileSync(csv,[cols.join(','),...match.ambiguous.map(r=>cols.map(c=>q(r[c])).join(','))].join('\n')+'\n','utf8');
  const report={project:'JOAJU MS',cut,layer:'escolas',method:'INEP 2025 como universo escolar e atributos. Geometria IBGE CNEFE 2022 associada por código municipal, normalização nominal auditável, tratamento de abreviações e truncamentos e endereço somente quando realmente disponível. Nenhuma escola sem correspondência é geocodificada ou deslocada para sede municipal.',inep_total:match.features.length+match.unmatched,matched:match.features.length,unmatched:match.unmatched,match_coverage_pct:Number(match.coverage.toFixed(2)),mean_match_confidence_pct:Number(match.avgScore.toFixed(2)),minimum_required_pct:MIN_CNEFE_MATCH_COVERAGE,cnefe_education_points:cnefe.points.length,inep_csv_encoding:match.inepEncoding,address_signal_pairs:match.addressSignalPairs,accepted_by_tier:match.tierCounts,cnefe_sources:cnefe.hashes,cnefe_raw_points:cnefe.raw_points||cnefe.points.length,cnefe_deduplicated_points:cnefe.deduplicated_points||cnefe.points.length,bridge_inep_2022:match.bridge2022||null,catalogo_inep:match.catalogoInep||null,status:match.coverage>=MIN_CNEFE_MATCH_COVERAGE?'PASS':'FAIL_COVERAGE',diagnostics:path.relative(root,csv).replaceAll('\\','/'),generated_at:new Date().toISOString()};const rp=path.join(docsDir,`VALIDACAO_ESCOLAS_INEP_CNEFE_${cut}.json`);fs.writeFileSync(rp,JSON.stringify(report,null,2)+'\n','utf8');return {report,reportPath:rp,csv};
}
function patchIPAEForSchoolCoverage(){
  const file=ensureProject();let html=fs.readFileSync(file,'utf8');const start=html.indexOf('async function calculateIPAE250()'),end=html.indexOf('\nfunction propsForHex',start);if(start<0||end<0)return;let block=html.slice(start,end);
  if(!block.includes('const schoolPositional='))block=block.replace("const sourcePositional=[1,positionalQualityOfPoints(museums,.75),positionalQualityOfPoints(campus,.75),positionalQualityOfPoints(libraries,.75)];", "const schoolPositional=Math.max(0,Math.min(1,Number(schools?.atlas_metadata?.adequacao_posicional_estimada_pct??100)/100));\n    const schoolCoverage=Math.max(0,Math.min(100,Number(schools?.atlas_metadata?.cobertura_correspondencia_pct??100)));\n    const ipaeCoverage=.25*schoolCoverage+75;\n    const sourcePositional=[schoolPositional,positionalQualityOfPoints(museums,.75),positionalQualityOfPoints(campus,.75),positionalQualityOfPoints(libraries,.75)];");
  block=block.replace('ipae_cobertura_pct:100,','ipae_cobertura_pct:Number(ipaeCoverage.toFixed(1)),');
  block=block.replace("fontes_ipae:'INEP Censo Escolar; MuseusBr/IBRAM; referências de ensino superior validadas institucionalmente quando disponíveis; bibliotecas e arquivos com referência SNBP/institucional'", "fontes_ipae:'INEP Censo Escolar 2025; Catálogo de Escolas INEP com latitude/longitude oficiais e CNEFE 2022 apenas como fallback documentado quando necessário; MuseusBr/IBRAM; referências de ensino superior validadas institucionalmente quando disponíveis; bibliotecas e arquivos com referência SNBP/institucional'");
  html=html.slice(0,start)+block+html.slice(end);fs.writeFileSync(file,html,'utf8');
}

function writeOutputs(data,stats,sourceFile,downloadMethod,csvEntry){
  const geoRel=`dados/materializados/${slug}/escolas.geojson`;
  const jsRel=`dados/materializados/${slug}/escolas.js`;
  const kmlRel=`dados/materializados/${slug}/escolas.kml`;
  const geoPath=path.join(root,geoRel), jsPath=path.join(root,jsRel), kmlPath=path.join(root,kmlRel);
  fs.writeFileSync(geoPath,JSON.stringify(data)+'\n','utf8');
  const js=`window.ATLAS_DATA=window.ATLAS_DATA||{};\nwindow.ATLAS_DATA["escolas"]=${JSON.stringify(data)};\n`;
  fs.writeFileSync(jsPath,js,'utf8');
  let kml='<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>JOAJU MS · Escolas INEP 2025</name>';
  for(const f of data.features){const p=f.properties||{},[lon,lat]=f.geometry.coordinates;kml+=`<Placemark><name>${escXml(p.NO_ENTIDADE||p.CO_ENTIDADE||'Escola')}</name><description><![CDATA[Código INEP: ${String(p.CO_ENTIDADE||'')}<br>Município: ${String(p.NO_MUNICIPIO||'')}<br>Fonte: ${escXml(p.fonte_oficial||'INEP Censo Escolar 2025')}]]></description><Point><coordinates>${lon},${lat},0</coordinates></Point></Placemark>`;}
  kml+='</Document></kml>\n'; fs.writeFileSync(kmlPath,kml,'utf8');
  const sourceSha=sha256File(sourceFile), jsSha=sha256File(jsPath), geoSha=sha256File(geoPath), kmlSha=sha256File(kmlPath);
  patchManifest(jsRel,data.features.length,jsSha,geoRel,kmlRel,stats.coverage,stats.sourceLabel);
  patchSchoolConfig(stats.coverage);
  patchIPAEForSchoolCoverage();
  const status=stats.coverage>=90?'PASS':stats.coverage>=70?'PASS_WITH_COVERAGE_WARNING':'PASS_WITH_MAJOR_COVERAGE_WARNING';
  const report={project:'JOAJU MS',cut,layer:'escolas',source:stats.sourceLabel,source_page:stats.sourcePage,catalog_page:CATALOG_PAGE,download_url:stats.sourceKind==='microdados'?OFFICIAL_URL:null,download_method:downloadMethod,raw_source:path.relative(root,sourceFile).replaceAll('\\','/'),raw_source_sha256:sourceSha,csv_entry:csvEntry,source_kind:stats.sourceKind,features:data.features.length,ms_rows:stats.totalMs,missing_coordinates:stats.missingCoords,outside_ms_envelope:stats.outBounds,positional_coverage_pct:stats.coverage,geojson:geoRel,geojson_sha256:geoSha,kml:kmlRel,kml_sha256:kmlSha,js:jsRel,js_sha256:jsSha,status,method:stats.sourceKind==='inep+cnefe'?'Atributos INEP 2025 associados a coordenadas oficiais IBGE CNEFE 2022 por correspondência documentada de município, nome e endereço. Sem geocodificação ou imputação por sede municipal.':stats.sourceKind==='inep+catalogo+cnefe'?'Prioridade para latitude/longitude publicadas diretamente pelo Catálogo de Escolas do INEP, com CNEFE 2022 somente como fallback documentado. Sem geocodificação ou imputação por sede municipal.':'Uso de latitude/longitude publicadas diretamente em fonte oficial do INEP e vinculadas por Código INEP. Não há geocodificação nem imputação por sede municipal.',cnefe:stats.cnefe||null,catalogo:stats.catalogo||null,generated_at:new Date().toISOString()};
  const reportPath=path.join(docsDir,`VALIDACAO_ESCOLAS_INEP_2025_${cut}.json`);fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n','utf8');
  return {report,reportPath};
}

function manifestFromHtml(html){
  const m=html.match(/const DATA_MANIFEST = (\{.*?\});\nwindow\.ATLAS_DATA/s);
  if(!m) throw new Error('DATA_MANIFEST não encontrado em index.html');
  return {raw:m[0],manifest:JSON.parse(m[1])};
}
function patchManifest(jsRel,records,hash,geoRel,kmlRel,coverage,sourceLabel){
  const file=ensureProject();let html=fs.readFileSync(file,'utf8');const m=manifestFromHtml(html);
  m.manifest.escolas={arquivo:jsRel,registros:records,sha256:hash,corte:cut,fonte:sourceLabel||'INEP Censo Escolar 2025',geojson:geoRel,kml:kmlRel,cobertura_posicional_pct:coverage};
  html=html.replace(m.raw,`const DATA_MANIFEST = ${JSON.stringify(m.manifest)};\nwindow.ATLAS_DATA`);
  fs.writeFileSync(file,html,'utf8');
}
function patchSchoolConfig(coverage){
  const file=ensureProject();let html=fs.readFileSync(file,'utf8');
  const start=html.indexOf('"id":"escolas"'), end=html.indexOf('},{"id":"campus_ensino_superior"',start);
  if(start<0||end<0)return;
  let block=html.slice(start,end);
  block=block.replace('"name":"Escolas do Censo Escolar"','"name":"Escolas · Censo Escolar INEP 2025"');
  block=block.replace(/"dataStatus":"[^"]*"/,`"dataStatus":"snapshot local 2025 · corte ${cut} · cobertura posicional ${coverage.toFixed(1)}%"`);
  block=block.replace(/"validationLevel":"[^"]*"/,`"validationLevel":"oficial na fonte · cobertura posicional medida no snapshot"`);
  html=html.slice(0,start)+block+html.slice(end);
  fs.writeFileSync(file,html,'utf8');
}

try{
  ensureProject();
  print('JOAJU MS · materialização específica de escolas · INEP 2025');
  print(`Corte do Atlas: ${cut}`);
  const obtained=await obtainZip();
  print(`ZIP disponível · ${obtained.method}`);
  print(`SHA-256 bruto · ${sha256File(obtained.file)}`);
  const extracted=extractSchoolCsv(obtained.file);
  print(`CSV selecionado · ${extracted.entry}`);
  let parsed,sourceFile=obtained.file,sourceMethod=obtained.method,sourceEntry=extracted.entry;
  try{
    parsed=await parseSchools(extracted.csv,{sourceKind:'microdados'});
  }catch(e){
    if(!/latitude|longitude/i.test(String(e.message||e)))throw e;
    print('Microdados INEP 2025 sem coordenadas públicas utilizáveis. Procurando latitude/longitude na exportação oficial do Catálogo de Escolas.');
    const inepRows=await parseInepRecords(extracted.csv);
    print(`Universo escolar INEP MS · ${inepRows.length}`);
    const catalogs=candidateCatalogCsv();
    if(!catalogs.length){
      const guide=writeCatalogInstruction();
      throw new Error(`Falta a exportação oficial do Catálogo de Escolas. Instruções: ${path.relative(root,guide)}. Salve o CSV oficial em Downloads e execute novamente.`);
    }
    const catalogFile=catalogs[0];print(`Catálogo de Escolas INEP · ${catalogFile}`);
    const catalog=await parseOfficialCatalogCsv(catalogFile);
    print(`Catálogo escolar utilizável · ${catalog.rows.length} registros MS · ${catalog.stats.with_address} com endereço/CEP`);
    print(`Catálogo com latitude/longitude válidas · ${catalog.stats.with_coordinates}/${catalog.rows.length} · ${catalog.stats.coordinate_coverage_pct.toFixed(2)}%`);
    const direct=directCatalogGeometryMatch(inepRows,catalog.rows);
    print(`Geometria direta por Código INEP · ${direct.features.length}/${inepRows.length} · ${direct.coverage.toFixed(2)}%`);
    if(direct.coverage>=MIN_CNEFE_MATCH_COVERAGE){
      parsed={data:{type:'FeatureCollection',features:direct.features,atlas_metadata:{
        fonte:'INEP Censo Escolar 2025 + Catálogo de Escolas InepData',
        pagina_fonte_inep:SOURCE_PAGE,pagina_catalogo_escolas:CATALOG_PAGE,corte_publicado:cut,ano_atributos:2025,
        materializacao:'snapshot vetorial local JOAJU MS',
        cobertura_correspondencia_pct:Number(direct.coverage.toFixed(2)),
        cobertura_posicional_pct:Number(direct.coverage.toFixed(2)),
        adequacao_posicional_estimada_pct:100,
        registros_inep_ms:inepRows.length,registros_correspondidos:direct.features.length,
        registros_sem_coordenada_ou_sem_vinculo:direct.unresolved.length,
        catalogo_registros_ms:catalog.rows.length,catalogo_com_coordenadas_validas:catalog.stats.with_coordinates,
        catalogo_sha256:catalog.stats.sha256,
        observacao:'A geometria utiliza latitude/longitude publicadas diretamente na exportação oficial do Catálogo de Escolas do INEP e vinculadas ao universo INEP 2025 por Código INEP. Registros sem coordenada oficial permanecem sem geometria.'
      }},stats:{
        totalMs:inepRows.length,withCoords:direct.features.length,missingCoords:direct.unresolved.length,outBounds:direct.stats.outside_ms_envelope,
        coverage:Number(direct.coverage.toFixed(2)),sourceKind:'inep+catalogo',
        sourceLabel:'INEP Censo Escolar 2025 + Catálogo de Escolas InepData',
        sourcePage:CATALOG_PAGE,catalogo:{...catalog.stats,...direct.stats,source_page:CATALOG_PAGE}
      }};
      sourceMethod='INEP 2025 + latitude/longitude oficiais do Catálogo de Escolas por Código INEP';
      sourceEntry=`${extracted.entry} + ${path.basename(catalogFile)}`;
      print(`Cobertura mínima ${MIN_CNEFE_MATCH_COVERAGE.toFixed(2)}% superada com coordenadas oficiais do próprio INEP. CNEFE não será necessário para fechar esta camada.`);
    }else{
      print(`Cobertura direta do Catálogo abaixo de ${MIN_CNEFE_MATCH_COVERAGE.toFixed(2)}%. Usando CNEFE 2022 somente como fallback para escolas ainda sem coordenada.`);
      const enriched=enrichInepWithCatalog(direct.unresolved,catalog.rows);
      const cnefe=await obtainCnefeEducationPoints();
      print(`Estabelecimentos de ensino CNEFE com coordenadas · ${cnefe.points.length}`);
      let fallback=matchInepToCnefe(enriched.rows,cnefe.points);
      if(fallback.coverage<MIN_CNEFE_MATCH_COVERAGE)fallback=await extendMatchWithInep2022Bridge(enriched.rows,cnefe,fallback);
      const combined=[...direct.features,...fallback.features];
      const coverage=100*combined.length/inepRows.length;
      const weightedConfidence=combined.length?100*(direct.features.length + fallback.features.length*(fallback.avgScore/100))/combined.length:0;
      const match={...fallback,features:combined,coverage,avgScore:weightedConfidence,unmatched:inepRows.length-combined.length,catalogoInep:{...catalog.stats,...enriched.stats,source_page:CATALOG_PAGE,direct_coordinates:direct.stats}};
      const diag=writeMatchDiagnostics(match,cnefe);
      print(`Cobertura combinada INEP Catálogo + CNEFE · ${combined.length}/${inepRows.length} · ${coverage.toFixed(2)}%`);
      print(`Adequação posicional média estimada · ${weightedConfidence.toFixed(2)}%`);
      print(`Diagnóstico · ${path.relative(root,diag.reportPath)}`);
      if(coverage<MIN_CNEFE_MATCH_COVERAGE)throw new Error(`Cobertura combinada ${coverage.toFixed(2)}% abaixo do mínimo ${MIN_CNEFE_MATCH_COVERAGE.toFixed(2)}%. Nenhum ponto artificial foi criado.`);
      parsed={data:{type:'FeatureCollection',features:combined,atlas_metadata:{
        fonte:'INEP Censo Escolar 2025 + Catálogo de Escolas InepData + IBGE CNEFE 2022 como fallback',
        pagina_fonte_inep:SOURCE_PAGE,pagina_catalogo_escolas:CATALOG_PAGE,pagina_fonte_cnefe:CNEFE_PAGE,dicionario_cnefe:CNEFE_DICT,
        corte_publicado:cut,ano_atributos:2025,ano_geometria_fallback:2022,materializacao:'snapshot vetorial local JOAJU MS',
        cobertura_correspondencia_pct:Number(coverage.toFixed(2)),cobertura_posicional_pct:Number(coverage.toFixed(2)),
        adequacao_posicional_estimada_pct:Number(weightedConfidence.toFixed(2)),
        registros_inep_ms:inepRows.length,registros_coordenada_direta_catalogo:direct.features.length,
        registros_fallback_cnefe:fallback.features.length,registros_sem_geometria:inepRows.length-combined.length,
        observacao:'Prioridade para latitude/longitude publicadas diretamente pelo Catálogo de Escolas do INEP. CNEFE 2022 é usado apenas como fallback documentado para escolas sem coordenada oficial no Catálogo.'
      }},stats:{
        totalMs:inepRows.length,withCoords:combined.length,missingCoords:inepRows.length-combined.length,outBounds:direct.stats.outside_ms_envelope,
        coverage:Number(coverage.toFixed(2)),sourceKind:'inep+catalogo+cnefe',
        sourceLabel:'INEP Censo Escolar 2025 + Catálogo de Escolas InepData + IBGE CNEFE 2022',
        sourcePage:CATALOG_PAGE,cnefe:{page:CNEFE_PAGE,dictionary:CNEFE_DICT,education_points:cnefe.points.length,source_files:cnefe.hashes,mean_match_confidence_pct:Number(fallback.avgScore.toFixed(2)),bridge_inep_2022:fallback.bridge2022||null},
        catalogo:{...catalog.stats,...direct.stats}
      }};
      sourceMethod='INEP 2025 + Catálogo de Escolas com CNEFE 2022 somente como fallback';
      sourceEntry=`${extracted.entry} + ${path.basename(catalogFile)} + CNEFE 2022 MS`;
    }
  }
  const {data,stats}=parsed;
  print(`Escolas de MS lidas · ${stats.totalMs}`);
  print(`Com coordenadas válidas · ${stats.withCoords}`);
  print(`Sem coordenadas · ${stats.missingCoords}`);
  print(`Cobertura posicional · ${stats.coverage.toFixed(2)}%`);
  const {report,reportPath}=writeOutputs(data,stats,sourceFile,sourceMethod,sourceEntry);
  fs.rmSync(extracted.temp,{recursive:true,force:true});
  print('');
  print(`STATUS · ${report.status}`);
  print(`Snapshot JS · ${report.js}`);
  print(`GeoJSON · ${report.geojson}`);
  print(`KML · ${report.kml}`);
  print(`Validação · ${path.relative(root,reportPath)}`);
  print('A camada escolas foi incorporada ao DATA_MANIFEST do index.html atual.');
}catch(e){
  console.error(`\nFALHA ESCOLAS INEP 2025 · ${e.message||e}`);
  console.error('Nenhum ponto artificial será criado. Este script consulta somente fontes educacionais INEP, uma exportação oficial do Catálogo de Escolas quando disponível e a geometria CNEFE necessária às escolas. Não executa a materialização geral do Atlas.');
  process.exit(1);
}
