import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';

const root=path.resolve(process.cwd());
const corte=process.env.CORTE_DATA||'2026-08-10';
const expectedHex=Number(process.env.EXPECTED_HEX||1554);

const preDir=path.join(root,'dados','precalculados');
const datedDir=path.join(root,'resultados_indices',corte);
const legacyDir=path.join(root,'resultados_indices_v1_8_0');
const docsDir=path.join(root,'docs');
for(const d of [preDir,datedDir,legacyDir,docsDir])fs.mkdirSync(d,{recursive:true});

function mime(file){
  const e=path.extname(file).toLowerCase();
  return ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json'})[e]||'application/octet-stream';
}
function startServer(){
  return new Promise((resolve,reject)=>{
    const server=http.createServer((req,res)=>{
      try{
        const u=new URL(req.url,'http://127.0.0.1');
        const rel=decodeURIComponent(u.pathname).replace(/^\/+/,'')||'index.html';
        const file=path.resolve(root,rel);
        if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html')){res.writeHead(403);res.end('forbidden');return;}
        if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end('not found');return;}
        res.writeHead(200,{'Content-Type':mime(file),'Cache-Control':'no-store'});
        fs.createReadStream(file).pipe(res);
      }catch(e){res.writeHead(500);res.end(String(e));}
    });
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>resolve({server,port:server.address().port}));
  });
}
async function launchBrowser(){
  try{return await chromium.launch({headless:true});}
  catch(first){
    const candidates=process.platform==='win32'?[
      process.env['PROGRAMFILES']&&path.join(process.env['PROGRAMFILES'],'Microsoft','Edge','Application','msedge.exe'),
      process.env['PROGRAMFILES(X86)']&&path.join(process.env['PROGRAMFILES(X86)'],'Microsoft','Edge','Application','msedge.exe'),
      process.env['PROGRAMFILES']&&path.join(process.env['PROGRAMFILES'],'Google','Chrome','Application','chrome.exe'),
      process.env['PROGRAMFILES(X86)']&&path.join(process.env['PROGRAMFILES(X86)'],'Google','Chrome','Application','chrome.exe')
    ].filter(Boolean):[];
    for(const executablePath of candidates){
      if(fs.existsSync(executablePath)){
        console.log('Navegador local · '+executablePath);
        return chromium.launch({headless:true,executablePath});
      }
    }
    throw first;
  }
}
function sha256(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function validateFC(d,label){
  if(d?.type!=='FeatureCollection'||!Array.isArray(d.features))throw new Error(label+' não é FeatureCollection');
}
function geomCount(d,allowed){
  return (d?.features||[]).filter(f=>allowed.includes(f?.geometry?.type)).length;
}
function verifyMaster(d){
  validateFC(d,'Malha territorial');
  if(d.features.length!==expectedHex)throw new Error(`Malha territorial contém ${d.features.length} hexágonos. Esperado ${expectedHex}.`);
  const ids=new Set();
  for(const f of d.features){
    const id=String(f?.properties?.hex_id||'');
    if(!id)throw new Error('Hexágono sem hex_id');
    if(ids.has(id))throw new Error('hex_id duplicado '+id);
    ids.add(id);
  }
  return ids;
}
function verifyIAT(d,masterIds){
  validateFC(d,'IAT');
  if(d.features.length!==expectedHex)throw new Error(`IAT contém ${d.features.length} células. Esperado ${expectedHex}.`);
  const ids=new Set();
  for(const f of d.features){
    const p=f?.properties||{},id=String(p.hex_id||'');
    if(!masterIds.has(id))throw new Error('IAT contém hex_id fora da malha '+id);
    if(ids.has(id))throw new Error('IAT contém hex_id duplicado '+id);
    ids.add(id);
    const v=Number(p.iat_100);
    if(!Number.isFinite(v)||v<0||v>100)throw new Error(`iat_100 inválido em ${id}: ${p.iat_100}`);
    const comps=['rpn','evn','dpn','nun','mmn'].map(k=>Number(p[k]));
    if(!comps.every(x=>Number.isFinite(x)&&x>=0&&x<=1))throw new Error('Componentes normalizados inválidos em '+id);
    const expected=100*(.30*comps[0]+.20*comps[1]+.25*comps[2]+.15*comps[3]+.10*comps[4]);
    if(Math.abs(v-expected)>.011)throw new Error(`Fórmula IAT divergente em ${id}: ${v} vs ${expected.toFixed(2)}`);
    const aero=Number(p.aeron),fer=Number(p.fern),mmn=Number(p.mmn);
    if([aero,fer,mmn].every(Number.isFinite)){
      const expectedMM=.5*aero+.5*fer;
      if(Math.abs(mmn-expectedMM)>.000002)throw new Error(`Multimodalidade divergente em ${id}`);
    }
  }
}
function stats(vals){
  const a=vals.filter(Number.isFinite);
  if(!a.length)return {min:null,mean:null,max:null};
  return {
    min:Number(Math.min(...a).toFixed(2)),
    mean:Number((a.reduce((x,y)=>x+y,0)/a.length).toFixed(2)),
    max:Number(Math.max(...a).toFixed(2))
  };
}
function patchIATVisual(){
  const indexFile=path.join(root,'index.html');
  if(!fs.existsSync(indexFile))return {changed:false};
  let s=fs.readFileSync(indexFile,'utf8');
  const marker='"id":"iat_acessibilidade_territorial_250km2"';
  const i=s.indexOf(marker);
  if(i<0)return {changed:false};
  const end=Math.min(s.length,i+2200);
  const part=s.slice(i,end);
  const re=/"gradientColors":\[[^\]]+\]/;
  if(!re.test(part))return {changed:false};
  const newColors='"gradientColors":["#f7fcf5","#c7e9c0","#74c476","#31a354","#006d2c"]';
  if(part.includes(newColors))return {changed:false,already:true};
  const backup=path.join(docsDir,'BACKUP_index_pre_IAT_VISUAL_2026-08-11.html');
  fs.writeFileSync(backup,s,'utf8');
  const patched=part.replace(re,newColors);
  s=s.slice(0,i)+patched+s.slice(end);
  fs.writeFileSync(indexFile,s,'utf8');
  return {changed:true,backup:path.relative(root,backup).replaceAll('\\','/')};
}

console.log('JOAJU MS · materialização isolada IAT · corte '+corte);
console.log('Somente IAT. Não executa PEIC, IATI, ISA, IPAE, ICT, IPG, ICD nem materialização geral.');
console.log('Fórmula congelada · IAT100 = 100 × (0,30 RPn + 0,20 EVn + 0,25 DPn + 0,15 NUn + 0,10 MMn)');
console.log('MMn = 0,50 aeroportos + 0,50 ferrovias');
console.log('Regra visual · valores baixos claros · valores altos escuros');

const deps=[
  {id:'iat_rodovias_estaduais_pavimentadas',label:'Rodovias estaduais pavimentadas/duplicadas',geom:['LineString','MultiLineString']},
  {id:'rodovias_federais',label:'Rodovias federais',geom:['LineString','MultiLineString']},
  {id:'estradas_vicinais',label:'Estradas vicinais',geom:['LineString','MultiLineString']},
  {id:'ferrovias_operacao',label:'Ferrovias em operação',geom:['LineString','MultiLineString']},
  {id:'aeroportos_aerodromos',label:'Aeroportos e aeródromos',geom:['Point']},
  {id:'municipios_sedes',label:'Sedes municipais',geom:['Point']}
];

const {server,port}=await startServer();
const browser=await launchBrowser();
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage();
page.setDefaultTimeout(300000);
page.on('console',m=>{
  const t=m.text();
  if(/IAT|rodov|vicinal|ferrov|aero|malha|Falha|erro/i.test(t))console.log('[browser] '+t);
});
page.on('pageerror',e=>console.error('[pageerror] '+e.message));

try{
  const url=`http://127.0.0.1:${port}/index.html`;
  console.log('Atlas local · '+url);
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.loadMasterTerritorialGrid250==='function'&&typeof window.calculateIAT250==='function'&&typeof window.ensureOperationalData==='function',{timeout:180000});

  const master=await page.evaluate(()=>window.loadMasterTerritorialGrid250());
  const masterIds=verifyMaster(master);
  console.log('Malha territorial · '+master.features.length+' hexágonos');

  console.log('Verificando as seis dependências reais do IAT...');
  const sourceReport=[];
  for(const dep of deps){
    try{
      const info=await page.evaluate(async({id,geom})=>{
        const d=await window.ensureOperationalData(id);
        const all=d?.features||[];
        const usable=all.filter(f=>geom.includes(f?.geometry?.type)).length;
        const meta=d?.atlas_metadata||{};
        return {features:all.length,usable,captured_at:meta.capturado_em||null};
      },dep);
      if(!(info.usable>0))throw new Error('sem geometria utilizável');
      console.log(`  PASS · ${dep.label} · ${info.features} feições · ${info.usable} utilizáveis`);
      sourceReport.push({...dep,...info,status:'PASS'});
    }catch(e){
      console.error(`  FALHA · ${dep.label} · ${e.message||e}`);
      sourceReport.push({...dep,status:'FAIL',error:String(e.message||e)});
      throw new Error(`Dependência IAT indisponível: ${dep.label} · ${e.message||e}`);
    }
  }

  console.log('Calculando IAT...');
  const data=await page.evaluate(()=>window.calculateIAT250());
  verifyIAT(data,masterIds);

  const vals=data.features.map(f=>Number(f.properties?.iat_100));
  const s=stats(vals);
  const stability=data.features.map(f=>Number(f.properties?.estabilidade_iat)).filter(Number.isFinite);
  const stableMean=stability.length?Number((stability.reduce((a,b)=>a+b,0)/stability.length).toFixed(2)):null;

  const preFile=path.join(preDir,'iat_250km2.geojson');
  const datedFile=path.join(datedDir,'iat_250km2.geojson');
  const legacyFile=path.join(legacyDir,'iat_acessibilidade_territorial_250km2.geojson');

  const output={
    ...data,
    atlas_metadata:{
      ...(data.atlas_metadata||{}),
      corte_dados:corte,
      formula_congelada:'IAT100 = 100 × (0,30 RPn + 0,20 EVn + 0,25 DPn + 0,15 NUn + 0,10 MMn)',
      multimodalidade:'MMn = 0,50 aeroportos + 0,50 ferrovias',
      regra_visual:'baixo claro, alto escuro',
      malha_validada_hexagonos:expectedHex,
      status_materializacao:'materializado_isoladamente'
    }
  };

  fs.writeFileSync(preFile,JSON.stringify(output),'utf8');
  fs.writeFileSync(datedFile,JSON.stringify(output),'utf8');
  fs.writeFileSync(legacyFile,JSON.stringify(output),'utf8');

  const visual=patchIATVisual();

  const report={
    project:'JOAJU MS',
    cut:corte,
    index:'IAT',
    status:'PASS',
    hexagons:output.features.length,
    formula:'IAT100 = 100 × (0,30 RPn + 0,20 EVn + 0,25 DPn + 0,15 NUn + 0,10 MMn)',
    components:{
      paved_road_network_weight:0.30,
      local_road_network_weight:0.20,
      proximity_to_paved_network_weight:0.25,
      proximity_to_urban_center_weight:0.15,
      rail_air_multimodality_weight:0.10,
      multimodality_internal_weights:{airports:0.50,railways:0.50}
    },
    sources:sourceReport,
    iat_min:s.min,
    iat_mean:s.mean,
    iat_max:s.max,
    mean_stability_pct:stableMean,
    sensitivity_simulations:Number(output?.atlas_metadata?.simulacoes_sensibilidade||500),
    visual_rule:'baixo claro, alto escuro',
    visual_patch:visual,
    precomputed:path.relative(root,preFile).replaceAll('\\','/'),
    legacy:path.relative(root,legacyFile).replaceAll('\\','/'),
    sha256:sha256(preFile),
    generated_at:new Date().toISOString()
  };
  const reportFile=path.join(docsDir,`VALIDACAO_IAT_250KM2_${corte}.json`);
  fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n','utf8');

  console.log(`IAT · PASS · ${output.features.length} hexágonos`);
  console.log(`IAT 100 · mínimo ${s.min} · média ${s.mean} · máximo ${s.max}`);
  console.log(`Sensibilidade · ${report.sensitivity_simulations} simulações · estabilidade média ${stableMean??'n/d'}%`);
  console.log('GeoJSON snapshot · '+path.relative(root,preFile));
  console.log('Validação · '+path.relative(root,reportFile));
  if(visual.changed)console.log('Visual IAT · baixo claro → alto escuro · index.html atualizado');
} catch(e){
  console.error('\nFALHA IAT · '+(e?.stack||e));
  process.exitCode=1;
} finally {
  await context.close().catch(()=>{});
  await browser.close().catch(()=>{});
  await new Promise(r=>server.close(r));
}
