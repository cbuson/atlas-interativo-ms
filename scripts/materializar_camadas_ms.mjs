import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const root=process.cwd();
const cut=process.env.CORTE_DATA||'2026-08-10';
const atlasUrl=process.env.ATLAS_URL||'http://127.0.0.1:8000/index.html';
const slug=cut.replaceAll('-','_');
const outDir=path.join(root,'dados','materializados',slug);
const rawDir=path.join(root,`capturas_fontes_${slug}`,'camadas');
fs.mkdirSync(outDir,{recursive:true});
fs.mkdirSync(rawDir,{recursive:true});

const MS_BOUNDS=[[-24.15,-58.25],[-17.05,-50.80]];
const MS_ENVELOPE='-58.25,-24.15,-50.80,-17.05';
const STANDARD_BROWSER_MODES=new Set(['wfs','ibgezip','remotezip','officialzip','officialxlsx','tainacan','ckan']);
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const arcNumeric=u=>/\/(?:MapServer|FeatureServer)\/\d+\/?$/i.test(String(u||''));
const mapRoot=u=>/\/MapServer\/?$/i.test(String(u||''));
const FORCE_REFRESH=String(process.env.FORCE_REFRESH||'0')==='1';
let INITIAL_DATA_MANIFEST={};let INITIAL_RASTER_MANIFEST={};
function localManifestFile(entry){return entry&&typeof entry==='object'?entry.arquivo:null}
function hasLocalSnapshot(id){
  if(FORCE_REFRESH)return null;
  const v=INITIAL_DATA_MANIFEST[id],r=INITIAL_RASTER_MANIFEST[id];
  for(const [kind,e] of [['vector',v],['raster',r]]){const rel=localManifestFile(e);if(rel&&fs.existsSync(path.join(root,rel)))return {kind,entry:e,arquivo:rel}}
  return null;
}

function manifestFromHtml(html){
  const m=html.match(/const DATA_MANIFEST = (\{.*?\});\nwindow\.ATLAS_DATA/s);
  if(!m)throw new Error('DATA_MANIFEST não encontrado em index.html');
  return {raw:m[0],manifest:JSON.parse(m[1])};
}
function rasterManifestFromHtml(html){
  const m=html.match(/const RASTER_MANIFEST = (\{.*?\});/s);
  if(!m)throw new Error('RASTER_MANIFEST não encontrado em index.html');
  return {raw:m[0],manifest:JSON.parse(m[1])};
}
try{const html0=fs.readFileSync(path.join(root,'index.html'),'utf8');INITIAL_DATA_MANIFEST=manifestFromHtml(html0).manifest;INITIAL_RASTER_MANIFEST=rasterManifestFromHtml(html0).manifest}catch(e){console.warn('Aviso: não foi possível ler manifests existentes:',e.message||e)}

function patchManifests(vectorEntries,rasterEntries){
  const file=path.join(root,'index.html');let html=fs.readFileSync(file,'utf8');
  const a=manifestFromHtml(html),b=rasterManifestFromHtml(html);
  const mergedData={...a.manifest,...vectorEntries}, mergedRaster={...b.manifest,...rasterEntries};
  html=html.replace(a.raw,`const DATA_MANIFEST = ${JSON.stringify(mergedData)};\nwindow.ATLAS_DATA`);
  html=html.replace(b.raw,`const RASTER_MANIFEST = ${JSON.stringify(mergedRaster)};`);
  fs.writeFileSync(file,html,'utf8');
  return {data:mergedData,raster:mergedRaster};
}
function xmlEsc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
function kmlCoords(coords){return (coords||[]).map(c=>Array.isArray(c)&&typeof c[0]==='number'?`${c[0]},${c[1]}${Number.isFinite(c[2])?`,`+c[2]:''}`:'').filter(Boolean).join(' ')}
function geometryToKml(g){
  if(!g)return '';
  if(g.type==='Point')return `<Point><coordinates>${kmlCoords([g.coordinates])}</coordinates></Point>`;
  if(g.type==='MultiPoint')return `<MultiGeometry>${(g.coordinates||[]).map(c=>`<Point><coordinates>${kmlCoords([c])}</coordinates></Point>`).join('')}</MultiGeometry>`;
  if(g.type==='LineString')return `<LineString><tessellate>1</tessellate><coordinates>${kmlCoords(g.coordinates)}</coordinates></LineString>`;
  if(g.type==='MultiLineString')return `<MultiGeometry>${(g.coordinates||[]).map(c=>`<LineString><tessellate>1</tessellate><coordinates>${kmlCoords(c)}</coordinates></LineString>`).join('')}</MultiGeometry>`;
  if(g.type==='Polygon'){
    const rings=g.coordinates||[];if(!rings.length)return '';
    const outer=`<outerBoundaryIs><LinearRing><coordinates>${kmlCoords(rings[0])}</coordinates></LinearRing></outerBoundaryIs>`;
    const inner=rings.slice(1).map(r=>`<innerBoundaryIs><LinearRing><coordinates>${kmlCoords(r)}</coordinates></LinearRing></innerBoundaryIs>`).join('');
    return `<Polygon><tessellate>1</tessellate>${outer}${inner}</Polygon>`;
  }
  if(g.type==='MultiPolygon')return `<MultiGeometry>${(g.coordinates||[]).map(p=>geometryToKml({type:'Polygon',coordinates:p})).join('')}</MultiGeometry>`;
  if(g.type==='GeometryCollection')return `<MultiGeometry>${(g.geometries||[]).map(geometryToKml).join('')}</MultiGeometry>`;
  return '';
}
function featureName(f,i){const p=f?.properties||{};for(const k of ['nome','name','NOME','NM_MUN','municipio','MUN','UHE_NM','codigo','OBJECTID'])if(p[k]!=null&&String(p[k]).trim())return String(p[k]);return `Registro ${i+1}`}
function featureDesc(f){const p=f?.properties||{},rows=[];for(const [k,v] of Object.entries(p)){if(k.startsWith('__atlas_')||v==null||typeof v==='object')continue;rows.push(`<tr><th>${xmlEsc(k)}</th><td>${xmlEsc(v)}</td></tr>`);if(rows.length>=80)break}return rows.length?`<table>${rows.join('')}</table>`:''}
function geojsonToKml(id,data){const placemarks=(data.features||[]).map((f,i)=>`<Placemark><name>${xmlEsc(featureName(f,i))}</name><description><![CDATA[${featureDesc(f)}]]></description>${geometryToKml(f.geometry)}</Placemark>`).join('');return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xmlEsc(id)}</name>${placemarks}</Document></kml>`}
function writeLayer(id,data){
  if(data?.type!=='FeatureCollection'||!Array.isArray(data.features)||!data.features.length)throw new Error(`${id}: FeatureCollection vazia ou inválida`);
  data.atlas_metadata={...(data.atlas_metadata||{}),corte_publicado:cut,materializacao:'snapshot local JOAJU MS',materializado_em:new Date().toISOString(),materializer_revision:'R6-VECTOR-FIRST-20260810'};
  const jsRel=`dados/materializados/${slug}/${id}.js`,geoRel=`dados/materializados/${slug}/${id}.geojson`;
  const geoTxt=JSON.stringify(data);const jsTxt=`window.ATLAS_DATA=window.ATLAS_DATA||{};\nwindow.ATLAS_DATA[${JSON.stringify(id)}]=${geoTxt};\n`;
  fs.writeFileSync(path.join(root,jsRel),jsTxt,'utf8');fs.writeFileSync(path.join(root,geoRel),geoTxt+'\n','utf8');
  let kmlRel=null;const geoBytes=Buffer.byteLength(geoTxt,'utf8');
  if(data.features.length<=5000&&geoBytes<=25*1024*1024){try{kmlRel=`dados/materializados/${slug}/${id}.kml`;fs.writeFileSync(path.join(root,kmlRel),geojsonToKml(id,data),'utf8')}catch(e){console.warn(`Aviso KML ${id}: ${e.message||e}`);kmlRel=null}}
  return {arquivo:jsRel,geojson:geoRel,kml:kmlRel,registros:data.features.length,sha256:sha256(Buffer.from(jsTxt)),sha256_geojson:sha256(Buffer.from(geoTxt))};
}
function writeRasterEntry(id,kind,rel,bounds,extra={}){
  const b=fs.readFileSync(path.join(root,rel));
  return {kind,arquivo:rel,bounds:bounds||MS_BOUNDS,corte:cut,sha256:sha256(b),...extra};
}
async function fetchBuffer(url,{method='GET',headers={},body=null,timeout=180000,retries=4}={}){
  let last=null;
  for(let attempt=1;attempt<=Math.max(1,retries);attempt++){
    const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),timeout);
    try{
      const r=await fetch(url,{method,headers:{'User-Agent':'JOAJU-MS/1.8 scientific materializer','Accept':'*/*',...headers},body,redirect:'follow',signal:ctl.signal});
      if(!r.ok){
        const e=new Error(`HTTP ${r.status} em ${url}`);e.status=r.status;throw e;
      }
      return {buffer:Buffer.from(await r.arrayBuffer()),headers:r.headers,url:r.url||url};
    }catch(e){
      last=e;const st=Number(e?.status||0);const retryable=!st||[408,425,429,500,502,503,504].includes(st);
      if(attempt>=retries||!retryable)throw e;
      await sleep(Math.min(8000,700*(2**(attempt-1))));
    }finally{clearTimeout(t)}
  }
  throw last||new Error(`Falha de rede em ${url}`);
}
async function fetchJson(url,opts={}){
  const {buffer,headers,source}=await fetchBufferRobust(url,opts);const txt=buffer.toString('utf8').replace(/^\uFEFF/,'').trim();
  if(!txt||/^<!doctype|^<html/i.test(txt))throw new Error(`Resposta não JSON${source==='curl'?' via curl':''} em ${url}`);
  let j;try{j=JSON.parse(txt)}catch(e){throw new Error(`JSON inválido em ${url}: ${e.message}`)}
  if(j?.error)throw new Error(j.error.message||JSON.stringify(j.error));return j;
}
function curlBuffer(url,{timeout=360000}={}){
  const tmp=path.join(rawDir,`.curl_${process.pid}_${Date.now()}_${Math.random().toString(16).slice(2)}.tmp`);
  try{
    const exe=process.platform==='win32'?'curl.exe':'curl';
    execFileSync(exe,['-L','--fail','--silent','--show-error','--retry','4','--retry-all-errors','--connect-timeout','30','--max-time',String(Math.ceil(timeout/1000)),'-A','JOAJU-MS/1.8 scientific materializer','-o',tmp,url],{stdio:['ignore','ignore','pipe'],timeout:timeout+30000});
    if(!fs.existsSync(tmp)||fs.statSync(tmp).size===0)throw new Error('curl retornou arquivo vazio');
    return Buffer.from(fs.readFileSync(tmp));
  }finally{try{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}catch{}}
}
async function fetchBufferRobust(url,opts={}){
  try{return {...await fetchBuffer(url,opts),source:'fetch'}}catch(first){
    if((opts.method||'GET')!=='GET'||opts.body)throw first;
    try{return {buffer:curlBuffer(url,opts),headers:new Headers(),url,source:'curl'}}catch(second){throw new Error(`${first.message}; fallback curl: ${second.message}`)}
  }
}
async function download(url,dest){const {buffer}=await fetchBufferRobust(url,{timeout:360000,retries:5});fs.writeFileSync(dest,buffer);return buffer}
function qs(obj){const p=new URLSearchParams();for(const [k,v] of Object.entries(obj))if(v!==undefined&&v!==null&&v!=='')p.set(k,String(v));return p.toString()}

function esriGeometryToGeoJSON(g){
  if(!g)return null;if(Number.isFinite(g.x)&&Number.isFinite(g.y))return {type:'Point',coordinates:[g.x,g.y]};
  if(Array.isArray(g.points))return {type:'MultiPoint',coordinates:g.points};
  if(Array.isArray(g.paths))return g.paths.length===1?{type:'LineString',coordinates:g.paths[0]}:{type:'MultiLineString',coordinates:g.paths};
  if(Array.isArray(g.rings))return {type:'Polygon',coordinates:g.rings};return null;
}
function esriResponseToGeoJSON(j){
  if(j?.type==='FeatureCollection')return j;if(j?.error)throw new Error(j.error.message||'ArcGIS query error');
  if(Array.isArray(j?.features))return {type:'FeatureCollection',features:j.features.map(x=>({type:'Feature',geometry:esriGeometryToGeoJSON(x.geometry),properties:x.attributes||x.properties||{}})).filter(f=>f.geometry)};
  throw new Error('ArcGIS não retornou feições reconhecíveis');
}
async function arcgisQueryBatch(layerUrl,params){
  const url=`${layerUrl}/query?${qs(params)}`;
  try{return esriResponseToGeoJSON(await fetchJson(url))}catch(e){
    if(String(params.f||'').toLowerCase()==='geojson')return esriResponseToGeoJSON(await fetchJson(`${layerUrl}/query?${qs({...params,f:'json'})}`));
    throw e;
  }
}
async function captureArcgisDirect(cfg,layerUrl=cfg.url){
  const common={where:cfg.where||'1=1',outFields:'*',returnGeometry:'true',returnZ:'false',returnM:'false',outSR:'4326'};
  async function run(spatial){
    const sp=spatial?{geometry:MS_ENVELOPE,geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects'}:{};
    let ids=[];try{const j=await fetchJson(`${layerUrl}/query?${qs({where:common.where,...sp,returnIdsOnly:'true',returnGeometry:'false',f:'json'})}`,{timeout:120000,retries:3});ids=Array.isArray(j.objectIds)?j.objectIds:[]}catch{}
    const features=[];const max=1500;
    if(ids.length){for(let i=0;i<ids.length;i+=max){const fc=await arcgisQueryBatch(layerUrl,{...common,...sp,objectIds:ids.slice(i,i+max).join(','),where:undefined,f:'geojson'});features.push(...(fc.features||[]))}}
    else{
      for(let offset=0,guard=0;guard<500;guard++){
        const fc=await arcgisQueryBatch(layerUrl,{...common,...sp,resultOffset:offset,resultRecordCount:max,f:'geojson'});const batch=fc.features||[];features.push(...batch);if(!batch.length||batch.length<max)break;offset+=batch.length;
      }
    }
    return features;
  }
  let features=[],err=null;try{features=await run(true)}catch(e){err=e}
  if(!features.length){try{features=await run(false)}catch(e){if(err)throw new Error(`${err.message}; fallback sem filtro espacial: ${e.message}`);throw e}}
  if(!features.length)throw new Error('ArcGIS query vetorial respondeu sem feições');
  return {type:'FeatureCollection',features,atlas_metadata:{fonte:cfg.source,url_servico:layerUrl,recorte:'Mato Grosso do Sul',metodo:'ArcGIS REST query VECTOR FIRST',capturado_em:new Date().toISOString()}};
}
async function arcgisLeafIds(base,ids){
  const out=[],seen=new Set();async function walk(id){if(seen.has(id))return;seen.add(id);let meta=null;try{meta=await fetchJson(`${base}/${id}?f=pjson`,{timeout:90000,retries:2})}catch{out.push(id);return}const subs=(meta?.subLayers||meta?.layers||[]).map(x=>Number(x.id)).filter(Number.isFinite);if((/group layer/i.test(String(meta?.type||''))||!meta?.geometryType)&&subs.length){for(const sid of subs)await walk(sid);return}out.push(id)}for(const id of ids)await walk(Number(id));return [...new Set(out)];
}
async function captureArcgisNode(cfg,layerUrl=cfg.url){
  try{return await captureArcgisDirect(cfg,layerUrl)}catch(directErr){
    let meta;try{meta=await fetchJson(`${layerUrl}?f=pjson`,{timeout:90000,retries:2})}catch{throw directErr}
    const groupSubs=(meta?.subLayers||meta?.layers||[]).map(x=>Number(x.id)).filter(Number.isFinite);
    if((/group layer/i.test(String(meta?.type||''))||!meta?.geometryType)&&groupSubs.length){const base=String(layerUrl).replace(/\/\d+\/?$/,'');const features=[],leaf=await arcgisLeafIds(base,groupSubs),failures=[];for(const id of leaf){try{const d=await captureArcgisDirect(cfg,`${base}/${id}`);for(const f of d.features)features.push({...f,properties:{...(f.properties||{}),__atlas_sublayer:id}})}catch(e){failures.push(`${id}: ${e.message}`)}}if(features.length)return {type:'FeatureCollection',features,atlas_metadata:{fonte:cfg.source,url_servico:layerUrl,recorte:'Mato Grosso do Sul',sublayers:leaf,metodo:'ArcGIS REST query VECTOR FIRST',falhas_parciais:failures,capturado_em:new Date().toISOString()}}}
    throw directErr;
  }
}
async function captureArcgisMapVector(cfg){
  const u=String(cfg.url||cfg.mapUrl||'').replace(/\/$/,'');let base=u,ids=[];const m=u.match(/^(.*\/MapServer)\/(\d+)$/i);
  if(m){base=m[1];ids=[Number(m[2])]}else if(mapRoot(u)){ids=Array.isArray(cfg.layerIds)&&cfg.layerIds.length?cfg.layerIds:[]}
  if(!ids.length){const meta=await fetchJson(`${base}?f=pjson`,{timeout:90000,retries:2});ids=(meta.layers||[]).filter(x=>x.subLayerIds==null).map(x=>x.id)}
  const features=[],failures=[];
  for(const id of ids){try{const d=await captureArcgisNode(cfg,`${base}/${id}`);for(const f of d.features)features.push({...f,properties:{...(f.properties||{}),__atlas_sublayer:id}})}catch(e){failures.push(`${id}: ${e.message}`)}}
  if(!features.length)throw new Error(`MapServer sem feições vetoriais consultáveis: ${failures.join(' | ')}`);
  return {type:'FeatureCollection',features,atlas_metadata:{fonte:cfg.source,recorte:'Mato Grosso do Sul',sublayers:ids,metodo:'ArcGIS REST query VECTOR FIRST',capturado_em:new Date().toISOString(),falhas_parciais:failures}};
}
async function captureAnaQualidade(cfg){
  const urls=['https://portal1.snirh.gov.br/server/rest/services/dados_abertos/Estacao_de_Qualidade_de_Agua/MapServer/0','https://portal1.snirh.gov.br/server/rest/services/dados_abertos/Estacao_de_Qualidade_de_Agua/FeatureServer/0'];const errs=[];
  for(const url of urls){try{const d=await captureArcgisDirect({...cfg,url},url);d.atlas_metadata={...(d.atlas_metadata||{}),fonte:'ANA/SNIRH · Estação de Qualidade de Água',endpoint_materializado:url};return d}catch(e){errs.push(`${url}: ${e.message}`)}}throw new Error(`ANA qualidade da água sem endpoint consultável · ${errs.join(' | ')}`);
}
async function exportArcgisPng(cfg){
  const u=String(cfg.url||'').replace(/\/$/,'');let base=u,ids=[];const m=u.match(/^(.*\/MapServer)\/(\d+)$/i);
  if(m){base=m[1];ids=[Number(m[2])]}else if(mapRoot(u)){ids=Array.isArray(cfg.layerIds)&&cfg.layerIds.length?cfg.layerIds:[]}
  if(!ids.length){try{const meta=await fetchJson(`${base}?f=pjson`);ids=(meta.layers||[]).filter(x=>x.subLayerIds==null).map(x=>x.id)}catch{}}
  const params={bbox:MS_ENVELOPE,bboxSR:'4326',imageSR:'4326',size:'1800,1700',format:'png32',transparent:'true',f:'image'};if(ids.length)params.layers=`show:${ids.join(',')}`;
  const {buffer,headers}=await fetchBuffer(`${base}/export?${qs(params)}`);const ct=headers.get('content-type')||'';if(!/image\//i.test(ct)&&buffer.slice(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('ArcGIS export não retornou PNG');
  const rel=`dados/materializados/${slug}/${cfg.id}.png`;fs.writeFileSync(path.join(root,rel),buffer);return writeRasterEntry(cfg.id,'image',rel,MS_BOUNDS,{attribution:cfg.source,method:'ArcGIS REST export'});
}

function p95Positive(values){const a=values.filter(x=>Number.isFinite(x)&&x>=0).sort((a,b)=>a-b);if(!a.length)return 0;return a[Math.min(a.length-1,Math.floor(.95*(a.length-1)))]}
function hexRgb(h){const x=String(h||'').replace('#','');return /^[0-9a-f]{6}$/i.test(x)?[0,2,4].map(i=>parseInt(x.slice(i,i+2),16)):null}
function rgbHex(a){return '#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('')}
function gradient(colors,t){const cs=colors.map(hexRgb).filter(Boolean);const z=Math.max(0,Math.min(1,Number(t)||0))*(cs.length-1),i=Math.min(cs.length-2,Math.floor(z)),u=z-i;return rgbHex(cs[i].map((v,j)=>v+(cs[i+1][j]-v)*u))}
function headerField(header,re,fallback){for(const [k,v] of Object.entries(header||{}))if(re.test(String(v)))return k;return fallback}
const PIB_MUNICIPIOS_BULK_URL='https://ftp.ibge.gov.br/Pib_Municipios/2022_2023/base/base_de_dados_2010_2023_txt.zip';
let pibBulkCache=null;
function findObjectKey(obj,res){for(const k of Object.keys(obj||{})){const n=normText(k).toLowerCase();if(res.some(re=>re.test(n)))return k}return null}
async function loadPibMunicipiosBulk(page){
  if(pibBulkCache)return pibBulkCache;
  const rel=`capturas_fontes_${slug}/camadas/ibge_pib_municipios_2010_2023_txt.zip`,dest=path.join(root,rel);
  let buffer;if(fs.existsSync(dest)&&fs.statSync(dest).size>100000)buffer=fs.readFileSync(dest);else{({buffer}=await fetchBuffer(PIB_MUNICIPIOS_BULK_URL,{timeout:360000,retries:5}));fs.writeFileSync(dest,buffer)}
  const localUrl=new URL(rel,atlasUrl).href;
  const json=await page.evaluate(async localUrl=>{
    await ensureLibrary('jszip');
    const r=await fetch(localUrl);if(!r.ok)throw new Error(`ZIP PIB local HTTP ${r.status}`);
    const z=await JSZip.loadAsync(await r.arrayBuffer());const f=Object.values(z.files).find(x=>!x.dir&&/\.(txt|csv)$/i.test(x.name));if(!f)throw new Error('ZIP PIB não contém TXT/CSV');
    const bytes=await f.async('uint8array');const txt=decodeDatasetBytes(bytes.buffer);const rows=await parseCsvText(txt);if(!rows.length)throw new Error('Base PIB vazia');
    const nf=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();const sample=rows[0],rk=(res)=>Object.keys(sample).find(k=>res.some(re=>re.test(nf(k))))||null;
    const yk=rk([/^ano$/]),ufk=rk([/^sigla da unidade da federacao$/, /^sigla uf$/, /^uf$/]),codek=rk([/^codigo do municipio$/, /codigo.*municip/]),namek=rk([/^nome do municipio$/, /^municipio$/]);
    if(!yk||!ufk||!codek||!namek)throw new Error('Layout da base PIB não reconhecido');
    const ms=rows.filter(x=>String(x[ufk]||'').trim().toUpperCase()==='MS');const years=ms.map(x=>Number(x[yk])).filter(Number.isFinite);const maxYear=Math.max(...years);return JSON.stringify({rows:ms.filter(x=>Number(x[yk])===maxYear),year:maxYear,keys:{yk,ufk,codek,namek}});
  },localUrl);
  const parsed=JSON.parse(json);pibBulkCache={...parsed,raw:{url:PIB_MUNICIPIOS_BULK_URL,arquivo:rel,sha256:sha256(buffer)}};return pibBulkCache;
}
async function captureIbgeBulkFallback(cfg,page){
  const bulk=await loadPibMunicipiosBulk(page);const first=bulk.rows[0]||{};let patterns=[];
  if(cfg.id==='pib_municipal_2021')patterns=[/^produto interno bruto.*precos correntes/,/^produto interno bruto$/];
  else if(cfg.id==='pib_per_capita_2021')patterns=[/produto interno bruto per capita/];
  else if(cfg.id==='vab_agropecuaria_ibge')patterns=[/valor adicionado bruto da agropecuaria/];
  else if(cfg.id==='vab_industria_ibge')patterns=[/valor adicionado bruto da industria/];
  else if(cfg.id==='vab_servicos_ibge')patterns=[/valor adicionado bruto dos servicos.*exceto administracao/,/valor adicionado bruto dos servicos/];
  else if(cfg.id==='vab_administracao_publica_ibge')patterns=[/valor adicionado bruto da administracao.*defesa.*educacao.*saude/,/administracao.*saude.*educacao publicas/];
  else throw new Error(`${cfg.id}: sem campo PIB bulk definido`);
  const valueKey=findObjectKey(first,patterns);if(!valueKey)throw new Error(`${cfg.id}: coluna não encontrada na base PIB 2010–2023`);
  const records=[];for(const r of bulk.rows){const code=String(r[bulk.keys.codek]||'').trim(),name=String(r[bulk.keys.namek]||'').trim(),value=parseNumberBR(r[valueKey]);if(code&&name&&Number.isFinite(value))records.push({code,name,value})}
  const mesh=await municipalMesh();const features=municipalJoin(mesh,records,r=>({indicador:cfg.name,valor:r.value,unidade:/per capita/i.test(valueKey)?'R$':'R$ mil',periodo:String(bulk.year),fonte:'IBGE · Produto Interno Bruto dos Municípios · base 2010–2023',campo_origem:valueKey,__atlas_color:'#b78455'}));
  if(features.length<70)throw new Error(`Fallback PIB bulk com join incompleto: ${features.length}`);
  return {data:{type:'FeatureCollection',features,atlas_metadata:{fonte:cfg.source,capturado_em:new Date().toISOString(),recorte:'Mato Grosso do Sul',periodo:String(bulk.year),metodo:'base oficial PIB dos Municípios 2010–2023'}},raw:[bulk.raw]};
}
async function captureIbgeChoroplethNode(cfg,page){
  let sidraError=null;
  try{
    const [mesh,rows]=await Promise.all([fetchJson(cfg.meshUrl),fetchJson(cfg.sidraUrl,{timeout:180000,retries:3})]);if(!Array.isArray(rows)||rows.length<2)throw new Error('SIDRA não retornou registros');
    const header=rows[0],dataRows=rows.slice(1),codeField=headerField(header,/Município.*Código|Código.*Município/i,'D1C'),nameField=headerField(header,/^Município$/i,'D1N'),periodField=headerField(header,/Ano|Período/i,'D3N'),varField=headerField(header,/Variável/i,'D2N');
    const values=new Map();for(const r of dataRows){const code=String(r[codeField]??r.D1C??'').trim();if(!code.startsWith('50'))continue;const val=parseNumberBR(r.V);if(!Number.isFinite(val))continue;values.set(code,{value:val,name:String(r[nameField]??r.D1N??''),period:String(r[periodField]??''),variable:String(r[varField]??''),unit:String(r.MN??cfg.unitHint??'')})}
    const cap=p95Positive([...values.values()].map(x=>x.value)),colors=cfg.gradientColors||['#FFF8E8','#F4D79B','#DFA45C','#B9683C','#6F2E2C'],features=[];
    for(const f of mesh.features||[]){const code=meshCode(f),rec=values.get(code)||values.get(code.slice(0,6));if(!rec)continue;const t=cap>0?Math.min(rec.value/cap,1):0;features.push({type:'Feature',geometry:f.geometry,properties:{...(f.properties||{}),codigo_ibge:code,municipio:rec.name,indicador:rec.variable||cfg.name,valor:rec.value,unidade:rec.unit,periodo:rec.period,p95_visual:cap,fonte:cfg.source,__atlas_color:gradient(colors,t)}})}
    if(features.length>=70)return {data:{type:'FeatureCollection',features,atlas_metadata:{fonte:cfg.source,capturado_em:new Date().toISOString(),recorte:'Mato Grosso do Sul',metodo:'API SIDRA'}},raw:[]};
    sidraError=new Error(`Join municipal incompleto: ${features.length}`);
  }catch(e){sidraError=e}
  const fb=await captureIbgeBulkFallback(cfg,page);fb.data.atlas_metadata.sidra_fallback_motivo=String(sidraError?.message||sidraError||'SIDRA indisponível');return fb;
}

const IBGE_MS_MESH='https://servicodados.ibge.gov.br/api/v3/malhas/estados/50?formato=application/vnd.geo+json&resolucao=2&intrarregiao=municipio';
function normText(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim()}
function detectDelimiter(line){const c=[';','\t',',','|'].map(d=>[d,(line.match(new RegExp('\\'+d,'g'))||[]).length]).sort((a,b)=>b[1]-a[1]);return c[0][1]?c[0][0]:';'}
function parseDelimitedLine(line,delimiter){const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(ch===delimiter&&!q){out.push(cur);cur=''}else cur+=ch}out.push(cur);return out}
function parseNumberBR(v){let s=String(v??'').trim().replace(/\s/g,'');if(!s)return NaN;if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');else if(s.includes(','))s=s.replace(',','.');return Number(s)}
function meshCode(f){return String(f?.properties?.codarea??f?.properties?.CD_MUN??f?.properties?.id??f?.properties?.codigo_ibge??'').trim()}
function meshName(f){return String(f?.properties?.nome??f?.properties?.NM_MUN??f?.properties?.municipio??'').trim()}
async function municipalMesh(){const mesh=await fetchJson(IBGE_MS_MESH);if(mesh?.type!=='FeatureCollection'||(mesh.features||[]).length<70)throw new Error('Malha municipal IBGE de MS não retornou cobertura suficiente');return mesh}
function municipalJoin(mesh,records,propsBuilder){const byCode=new Map(),byName=new Map();for(const r of records){if(r.code)byCode.set(String(r.code),r);if(r.name)byName.set(normText(r.name),r)}const features=[];for(const f of mesh.features||[]){const code=meshCode(f),name=meshName(f);let r=byCode.get(code)||byCode.get(code.slice(0,6))||byName.get(normText(name));if(!r)continue;features.push({type:'Feature',geometry:f.geometry,properties:{...(f.properties||{}),codigo_ibge:code,municipio:name,...propsBuilder(r)}})}return features}
async function captureComexMunicipal(cfg){
  const urls=cfg.downloadUrls||[];if(urls.length<2)throw new Error('Comex Stat sem URLs municipais de exportação e importação');
  const totals=new Map(),raw=[];
  for(const [idx,url] of urls.entries()){
    const {buffer}=await fetchBufferRobust(url,{timeout:300000,retries:5});const rel=`capturas_fontes_${slug}/camadas/${cfg.id}_${idx===0?'EXP':'IMP'}_2026.csv`;fs.writeFileSync(path.join(root,rel),buffer);raw.push({url,arquivo:rel,sha256:sha256(buffer)});
    const txt=buffer.toString('utf8').replace(/^\uFEFF/,'');const lines=txt.split(/\r?\n/).filter(Boolean);if(lines.length<2)throw new Error('Comex Stat retornou CSV vazio');const delim=detectDelimiter(lines[0]);const headers=parseDelimitedLine(lines[0],delim).map(x=>x.trim());const pos=Object.fromEntries(headers.map((h,i)=>[h,i]));
    const ufI=pos.SG_UF_MUN,munI=pos.CO_MUN,valI=pos.VL_FOB;if(ufI==null||munI==null||valI==null)throw new Error('Layout Comex Stat municipal inesperado');
    for(let i=1;i<lines.length;i++){const a=parseDelimitedLine(lines[i],delim);if(String(a[ufI]||'').trim().toUpperCase()!=='MS')continue;const code=String(a[munI]||'').trim();const val=parseNumberBR(a[valI]);if(!code||!Number.isFinite(val))continue;const key=code;const r=totals.get(key)||{code,exp:0,imp:0};if(idx===0)r.exp+=val;else r.imp+=val;totals.set(key,r)}
  }
  const mesh=await municipalMesh();const features=municipalJoin(mesh,[...totals.values()],r=>({exportacoes_usd:r.exp,importacoes_usd:r.imp,corrente_comercio_usd:r.exp+r.imp,saldo_comercial_usd:r.exp-r.imp,periodo:'2026 até a última competência disponível no arquivo capturado',fonte:'MDIC · Comex Stat · base municipal'}));
  if(features.length<10)throw new Error(`Comex Stat produziu apenas ${features.length} municípios de MS`);return {data:{type:'FeatureCollection',features,atlas_metadata:{fonte:cfg.source,capturado_em:new Date().toISOString(),recorte:'Mato Grosso do Sul',metodo:'soma municipal de VL_FOB nos arquivos EXP/IMP 2026'}},raw};
}
async function captureCfemMunicipal(cfg){
  if(!cfg.downloadUrl)throw new Error('CFEM sem CSV oficial configurado');const {buffer}=await fetchBufferRobust(cfg.downloadUrl,{timeout:360000,retries:5});const rel=`capturas_fontes_${slug}/camadas/${cfg.id}_2022_2026.csv`;fs.writeFileSync(path.join(root,rel),buffer);const raw=[{url:cfg.downloadUrl,arquivo:rel,sha256:sha256(buffer)}];
  let txt;for(const enc of ['utf8','latin1']){txt=buffer.toString(enc);if(/munic|arrecad|cfem/i.test(txt.slice(0,1000)))break}txt=txt.replace(/^\uFEFF/,'');const lines=txt.split(/\r?\n/).filter(Boolean);if(lines.length<2)throw new Error('CFEM retornou CSV vazio');const delim=detectDelimiter(lines[0]);const headers=parseDelimitedLine(lines[0],delim).map(x=>x.trim());const H=headers.map(normText);
  const find=(res)=>H.findIndex(h=>res.some(re=>re.test(h)));const ufI=find([/^UF$/, /SIGLA.*UF/, /^ESTADO$/]), munI=find([/MUNICIP/]), codeI=find([/COD.*MUNIC/,/IBGE/]), yearI=find([/^ANO$/, /ANO.*REFER/]), valI=find([/VALOR.*CFEM/,/ARRECAD/,/VALOR.*RECOLH/,/^VALOR$/]);if(munI<0||valI<0)throw new Error(`Layout CFEM não reconhecido: ${headers.join(' | ')}`);
  const totals=new Map();for(let i=1;i<lines.length;i++){const a=parseDelimitedLine(lines[i],delim);if(ufI>=0&&normText(a[ufI])!=='MS'&&normText(a[ufI])!=='MATO GROSSO DO SUL')continue;if(yearI>=0&&String(a[yearI]||'').trim()!=='2026')continue;const name=String(a[munI]||'').trim(),code=codeI>=0?String(a[codeI]||'').trim():'';const val=parseNumberBR(a[valI]);if(!name||!Number.isFinite(val))continue;const key=code||normText(name),r=totals.get(key)||{code,name,value:0};r.value+=val;totals.set(key,r)}
  const mesh=await municipalMesh();const features=municipalJoin(mesh,[...totals.values()],r=>({arrecadacao_cfem_2026:r.value,unidade:'R$',periodo:'2026 até a última competência disponível no arquivo capturado',fonte:'ANM · Dados Abertos CFEM'}));if(!features.length)throw new Error('CFEM não produziu municípios de Mato Grosso do Sul após o filtro');return {data:{type:'FeatureCollection',features,atlas_metadata:{fonte:cfg.source,capturado_em:new Date().toISOString(),recorte:'Mato Grosso do Sul',metodo:'agregação municipal do CSV CFEM Arrecadação 2022–2026, filtrado para 2026'}},raw};
}

async function captureCnesNode(cfg){
  const features=[],seen=new Set(),limit=100;for(let offset=0,guard=0;guard<200;guard++,offset+=limit){const j=await fetchJson(`https://apidadosabertos.saude.gov.br/cnes/estabelecimentos?codigo_uf=50&status=1&limit=${limit}&offset=${offset}`);const items=j?.estabelecimentos||j?.items||j?.data||j?.resultados||[];if(!Array.isArray(items)||!items.length)break;for(const r of items){const code=String(r.codigo_cnes??r.cnes??'').trim();if(code&&seen.has(code))continue;if(code)seen.add(code);const lat=Number(r.latitude_estabelecimento_decimo_grau??r.latitude??r.lat),lon=Number(r.longitude_estabelecimento_decimo_grau??r.longitude??r.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<MS_BOUNDS[0][0]||lat>MS_BOUNDS[1][0]||lon<MS_BOUNDS[0][1]||lon>MS_BOUNDS[1][1])continue;features.push({type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{codigo_cnes:code||null,nome_fantasia:r.nome_fantasia||r.nome_estabelecimento||'Estabelecimento de saúde',codigo_tipo_unidade:r.codigo_tipo_unidade??null,codigo_municipio:r.codigo_municipio??null,atendimento_hospitalar:r.estabelecimento_possui_atendimento_hospitalar??null,servico_apoio:r.estabelecimento_possui_servico_apoio??null,data_atualizacao:r.data_atualizacao||null,fonte_oficial:'Ministério da Saúde · DEMAS · CNES',data_captura:new Date().toISOString()}})}if(items.length<limit)break}
  if(!features.length)throw new Error('CNES sem estabelecimentos válidos no recorte');return {type:'FeatureCollection',features,atlas_metadata:{fonte:cfg.source,filtro:'codigo_uf=50; status=1',capturado_em:new Date().toISOString()}};
}
function flattenTainacanNode(item){const p={nome:item?.title?.rendered||item?.title||item?.name||`Museu ${item?.id||''}`,id_museusbr:item?.id||''};const meta=item?.metadata||item?.metadata_values||{};for(const [k,v] of Object.entries(meta)){const name=v?.name||v?.metadatum?.name||k;const value=v?.value_as_string??v?.value??v?.value_as_html??'';if(value!==''&&value!==null)p[name]=Array.isArray(value)?value.join('; '):typeof value==='object'?JSON.stringify(value):value}if(item?.description?.rendered)p.descricao=String(item.description.rendered).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();return p}
async function captureTainacanNode(page,cfg){
  const all=[];let perpage=50,paged=1,totalPages=0;
  while(paged<=250){const sep=String(cfg.url).includes('?')?'&':'?';const {buffer,headers}=await fetchBuffer(`${cfg.url}${sep}perpage=${perpage}&paged=${paged}`,{timeout:120000,retries:4});const j=JSON.parse(buffer.toString('utf8'));const items=Array.isArray(j)?j:(j?.items||j?.data||[]);if(!items.length)break;all.push(...items);totalPages=Number(headers.get('x-wp-totalpages')||j?.total_pages||j?.totalPages||0);if(items.length<perpage||(totalPages&&paged>=totalPages))break;paged++}
  if(!all.length)throw new Error('MuseusBr/Tainacan não retornou itens');const rows=all.map(flattenTainacanNode);
  const json=await page.evaluate(async({id,rows})=>{const cfg=configs.find(c=>c.id===id);const data=await rowsToOfficialGeoJSON(rows,{...cfg,tableKind:'museus'});if(!data?.features?.length)throw new Error('MuseusBr sem registros de MS com localização utilizável');data.atlas_metadata={...(data.atlas_metadata||{}),fonte:'MuseusBr/IBRAM',colecao_tainacan:208,materializado_em:new Date().toISOString()};return JSON.stringify(data)},{id:cfg.id,rows});
  return JSON.parse(json);
}
const OVERPASS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.nchc.org.tw/api/interpreter'];
async function captureOverpassNode(cfg){const bbox='-24.15,-58.25,-17.05,-50.80',query=String(cfg.overpass||'').replaceAll('{{bbox}}',bbox),body=`[out:json][timeout:180];(${query});out center tags;`;let last;for(const ep of OVERPASS){try{const j=await fetchJson(ep,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(body),timeout:220000});const features=[];for(const e of j.elements||[]){const lat=e.lat??e.center?.lat,lon=e.lon??e.center?.lon;if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;const tags=e.tags||{};features.push({type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{...tags,osm_type:e.type,osm_id:e.id,fonte_geometria:'OpenStreetMap contributors',data_captura:new Date().toISOString(),status_validacao:'Referência cartográfica preliminar. Não equivale ao cadastro institucional'}})}if(!features.length)throw new Error('consulta sem registros');return {type:'FeatureCollection',features,atlas_metadata:{fonte:'OpenStreetMap/Overpass',capturado_em:new Date().toISOString(),recorte:'Mato Grosso do Sul'}}}catch(e){last=e}}throw last||new Error('Overpass indisponível')}

function scoreResource(r){const t=`${r.name||''} ${r.description||''} ${r.last_modified||''}`.toLowerCase();let s=0;if(/segundo trimestre.*2026|2.? trimestre.*2026/.test(t))s+=100;if(/primeiro trimestre.*2026|1.? trimestre.*2026/.test(t))s+=90;if(/2026/.test(t))s+=60;if(String(r.format||'').toUpperCase()==='XLSX')s+=20;if(String(r.format||'').toUpperCase()==='CSV')s+=15;return s}
async function materializeTabularByNode(page,cfg){
  const direct={
    cadastur_hospedagem:[{url:'https://dados.turismo.gov.br/dataset/d2333d1b-db1e-438b-955a-028db80a031e/resource/7e385ec2-57d8-446c-9cc0-f5f7dadd1fdf/download/meios-de-hospedagem-2-trimestre-2026.xlsx',format:'XLSX',label:'Meios de Hospedagem · 2º trimestre 2026'}],
    cadastur_alimentacao:[{url:'https://dados.turismo.gov.br/dataset/restaurantes-cafeterias-e-bares/resource/e3ccab89-e838-4960-8267-af5e4009948a/download/restaurantes-cafeterias-e-bares-2-trimestre-2026.xlsx',format:'XLSX',label:'Restaurantes, Cafeterias e Bares · 2º trimestre 2026'}],
    cadastur_agencias_guias:[
      {url:'https://dados.turismo.gov.br/dataset/agencia-de-turismo/resource/bac392e7-18e0-49b7-bbb3-4d54628a3fec/download/agencia-de-turismo-1-trimestre-2026.xlsx',format:'XLSX',label:'Agência de Turismo · 1º trimestre 2026'},
      {url:'https://dados.turismo.gov.br/dataset/prestadores-de-servicos-turisticos-guia-turismo_2/resource/d5e2ebf6-fc12-4cf3-94d0-8b31789f18e7/download/guia-de-turismo-2-trimestre-2026.xlsx',format:'XLSX',label:'Guia de Turismo · 2º trimestre 2026'},
      {url:'https://dados.turismo.gov.br/dataset/transportadora-turistica/resource/faed2692-81c1-425e-b5c8-fbbb065a13c2/download/transportadora-turistica-2-trimestre-2026.xlsx',format:'XLSX',label:'Transportadora Turística · 2º trimestre 2026'}]
  };
  const groups=[];
  if(cfg.mode==='ckan'){
    const ids=Array.isArray(cfg.ckanPackageIds)?cfg.ckanPackageIds:[];
    for(const id of ids){
      let pkg=null;try{pkg=(await fetchJson(`https://dados.turismo.gov.br/api/3/action/package_show?id=${encodeURIComponent(id)}`,{timeout:120000,retries:5}))?.result}catch{}
      if(pkg){const cand=[...(pkg.resources||[])].filter(x=>/CSV|XLSX|XLS/i.test(String(x.format||''))).sort((a,b)=>scoreResource(b)-scoreResource(a)).slice(0,8).map(r=>({url:r.url,altUrl:r.cache_url||null,format:String(r.format||''),label:`${pkg.title||id} · ${r.name||''}`,packageTitle:pkg.title||id,resourceId:r.id,lastModified:r.last_modified||r.metadata_modified||''}));if(cand.length)groups.push(cand)}
    }
    if(!groups.length&&cfg.url&&/api\/3\/action\/package_search/.test(cfg.url)){
      try{const result=(await fetchJson(cfg.url,{timeout:120000,retries:4}))?.result?.results||[];const matchers=(cfg.packageMatchers||[]).map(normText);for(const pkg of result){const title=normText(`${pkg.title||''} ${pkg.name||''}`);if(matchers.length&&!matchers.some(m=>title.includes(m)))continue;const cand=[...(pkg.resources||[])].filter(x=>/CSV|XLSX|XLS/i.test(String(x.format||''))).sort((a,b)=>scoreResource(b)-scoreResource(a)).slice(0,8).map(r=>({url:r.url,altUrl:r.cache_url||null,format:String(r.format||''),label:`${pkg.title||pkg.name} · ${r.name||''}`,packageTitle:pkg.title||pkg.name,resourceId:r.id,lastModified:r.last_modified||r.metadata_modified||''}));if(cand.length)groups.push(cand)}}catch{}
    }
    if((direct[cfg.id]||[]).length)groups.push((direct[cfg.id]||[]).map(x=>({...x,packageTitle:x.label})));
  }else if(cfg.id==='postos_combustivel_anp')groups.push([{url:cfg.downloadUrl,format:'CSV',label:'ANP revendedores varejistas',packageTitle:'ANP'}]);
  else if(cfg.mode==='officialxlsx'&&cfg.url)groups.push([{url:cfg.url,format:'XLSX',label:cfg.name,packageTitle:cfg.name}]);
  if(!groups.length)throw new Error(`${cfg.id}: nenhuma fonte tabular direta configurada ou descoberta`);
  const locals=[];let gidx=0;
  for(const candidates of groups){gidx++;let saved=null,last=null;
    for(const r of candidates){for(const url of [r.url,r.altUrl].filter(Boolean)){try{const ext=/csv/i.test(r.format)||/\.csv(?:\?|$)/i.test(url)?'csv':'xlsx',rel=`capturas_fontes_${slug}/camadas/${cfg.id}_${gidx}.${ext}`,dest=path.join(root,rel);const {buffer:b}=await fetchBufferRobust(url,{timeout:300000,retries:5});if(ext==='xlsx'&&b.slice(0,2).toString()!=='PK')throw new Error('recurso anunciado como XLSX não contém assinatura ZIP/Office');fs.writeFileSync(dest,b);saved={url:new URL(rel,atlasUrl).href,sourceUrl:url,format:r.format||ext.toUpperCase(),label:r.label,packageTitle:r.packageTitle,resourceId:r.resourceId,lastModified:r.lastModified,sha256:sha256(b),arquivo:rel};break}catch(e){last=e}}if(saved)break}
    if(!saved)throw new Error(`${cfg.id}: nenhum recurso utilizável para ${candidates[0]?.packageTitle||'conjunto'}${last?` · ${last.message}`:''}`);locals.push(saved)
  }
  const json=await page.evaluate(async({id,locals})=>{const cfg=configs.find(c=>c.id===id);let rows=[];for(const r of locals){const res=await fetch(r.url);if(!res.ok)throw new Error(`Arquivo local HTTP ${res.status}`);const buf=await res.arrayBuffer();let part;if(/csv/i.test(r.format))part=await parseCsvText(decodeDatasetBytes(buf));else part=await xlsxRowsFromBuffer(buf);part.forEach(x=>x.__conjunto_materializado=r.packageTitle||r.label);rows.push(...part)}const data=await rowsToOfficialGeoJSON(rows,cfg);if(!data?.features?.length)throw new Error('Fonte tabular lida sem registros espacializáveis em MS');data.atlas_metadata={...(data.atlas_metadata||{}),materializado_em:new Date().toISOString(),materializador:'JOAJU-MAT-CAMADAS-03',recursos:locals.map(x=>({label:x.label,resourceId:x.resourceId,lastModified:x.lastModified}))};return JSON.stringify(data)},{id:cfg.id,locals});
  return {data:JSON.parse(json),raw:locals.map(x=>({url:x.sourceUrl,arquivo:x.arquivo,sha256:x.sha256,label:x.label,resourceId:x.resourceId,lastModified:x.lastModified}))};
}
async function materializeBinaryViaBrowser(page,cfg,sourceUrl,kind){
  const ext='zip',rel=`capturas_fontes_${slug}/camadas/${cfg.id}.${ext}`,dest=path.join(root,rel),b=await download(sourceUrl,dest);
  if(b.slice(0,2).toString()!=='PK')throw new Error(`${cfg.id}: a fonte não retornou um ZIP válido`);
  const localUrl=new URL(rel,atlasUrl).href;
  const json=await page.evaluate(async({id,localUrl,kind})=>{const cfg=configs.find(c=>c.id===id);if(kind==='schools'){const r=await fetch(localUrl);const blob=await r.blob();const data=await processSchoolFile(blob,'microdados_censo_escolar_2025.zip');return JSON.stringify(data)}const tmp={...cfg,url:localUrl,filterMS:true};const data=await captureOfficialZip(tmp);return JSON.stringify(data)},{id:cfg.id,localUrl,kind});
  return {data:JSON.parse(json),raw:[{url:sourceUrl,arquivo:rel,sha256:sha256(b)}]};
}
async function materializeKmz(cfg){const rel=`dados/materializados/${slug}/${cfg.id}.kmz`,dest=path.join(root,rel),b=await download(cfg.kmzUrl||cfg.downloadUrl,dest);return {entry:writeRasterEntry(cfg.id,'kmz',rel,cfg.bounds||MS_BOUNDS,{attribution:cfg.attribution||cfg.source}),raw:[{url:cfg.kmzUrl||cfg.downloadUrl,sha256:sha256(b)}]}}
async function screenshotRaster(page,cfg){
  await page.goto(atlasUrl,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>typeof map!=='undefined'&&map&&typeof ensureLayerLoaded==='function');
  const info=await page.evaluate(async id=>{
    const cfg=configs.find(c=>c.id===id);if(!cfg)throw new Error('Configuração da camada não encontrada');
    const mapEl=document.getElementById('map');if(!mapEl)throw new Error('#map não encontrado');
    for(const c of configs){c.visible=false;const st=layerState[c.id];if(st?.leaflet&&map.hasLayer(st.leaflet))map.removeLayer(st.leaflet)}
    if(activeBaseLayer&&map.hasLayer(activeBaseLayer))map.removeLayer(activeBaseLayer);
    document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
    Object.assign(mapEl.style,{display:'block',visibility:'visible',opacity:'1',position:'fixed',left:'0px',top:'0px',width:'1400px',height:'1100px',zIndex:'2147483000'});
    [...document.body.children].forEach(el=>{if(el!==mapEl)el.style.visibility='hidden'});
    mapEl.style.visibility='visible';
    map.invalidateSize(true);
    await ensureLayerLoaded(id);const st=layerState[id];if(!st?.leaflet)throw new Error('layer remoto não foi criado');
    st.leaflet.addTo(map);cfg.visible=true;map.fitBounds(cfg.bounds||[[-24.15,-58.25],[-17.05,-50.80]],{animate:false,padding:[4,4]});map.invalidateSize(true);
    await new Promise(r=>setTimeout(r,10000));
    const rect=mapEl.getBoundingClientRect(),b=map.getBounds();
    return {bounds:[[b.getSouth(),b.getWest()],[b.getNorth(),b.getEast()]],clip:{x:0,y:0,width:Math.max(1,Math.min(1400,Math.round(rect.width||1400))),height:Math.max(1,Math.min(1100,Math.round(rect.height||1100)))}};
  },cfg.id);
  const rel=`dados/materializados/${slug}/${cfg.id}.png`;
  await page.screenshot({path:path.join(root,rel),clip:info.clip,animations:'disabled'});
  return writeRasterEntry(cfg.id,'image',rel,info.bounds,{attribution:cfg.attribution||cfg.source,method:'captura cartográfica controlada do serviço remoto'});
}

async function launchChromiumForLayers(){
  try{return await chromium.launch({headless:true});}
  catch(first){
    const candidates=process.platform==='win32'?[
      path.join(process.env.PROGRAMFILES||'C:/Program Files','Microsoft','Edge','Application','msedge.exe'),
      path.join(process.env['PROGRAMFILES(X86)']||'C:/Program Files (x86)','Microsoft','Edge','Application','msedge.exe'),
      path.join(process.env.PROGRAMFILES||'C:/Program Files','Google','Chrome','Application','chrome.exe'),
      path.join(process.env.LOCALAPPDATA||'','Google','Chrome','Application','chrome.exe')
    ]:[];
    for(const executablePath of candidates){if(!executablePath||!fs.existsSync(executablePath))continue;try{console.log(`Playwright Chromium não encontrado. Usando navegador do sistema · ${executablePath}`);return await chromium.launch({headless:true,executablePath});}catch{}}
    throw new Error(`Não foi possível iniciar Chromium, Edge ou Chrome para materialização. ${first.message||first}`);
  }
}
const browser=await launchChromiumForLayers();const page=await browser.newPage({viewport:{width:1400,height:1100}});page.setDefaultTimeout(300000);
page.on('console',m=>{if(['warning','error'].includes(m.type()))console.log(`[browser ${m.type()}] ${m.text()}`)});
const report={project:'JOAJU MS',cut,atlas_url:atlasUrl,materializer_revision:'R6-VECTOR-FIRST-20260810',started_at:new Date().toISOString(),layers:[],status:'running'};let failures=0;const vectors={},rasters={};
try{
  await page.goto(atlasUrl,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>typeof configs!=='undefined'&&typeof rowsToOfficialGeoJSON==='function');
  const cfgs=await page.evaluate(()=>configs.map(c=>JSON.parse(JSON.stringify(c))));
  for(const cfg of cfgs){
    const existing=hasLocalSnapshot(cfg.id);
    if(existing){report.layers.push({id:cfg.id,status:'already_materialized_snapshot',mode:cfg.mode,kind:existing.kind,arquivo:existing.arquivo,records:existing.entry?.registros??null,sha256:existing.entry?.sha256??null});console.log(`Mantendo ${cfg.id} · snapshot local já existente`);continue}
    if(cfg.mode==='embedded'){report.layers.push({id:cfg.id,status:'already_packaged',mode:cfg.mode});continue}
    if(cfg.mode==='derived'||cfg.mode==='import'){report.layers.push({id:cfg.id,status:'handled_elsewhere',mode:cfg.mode});continue}
    process.stdout.write(`Materializando ${cfg.id} ... `);
    try{
      let data=null,raw=[],raster=null;
      if(cfg.id==='escolas'){report.layers.push({id:cfg.id,status:'pending_geometry',mode:cfg.mode,note:'INEP Censo Escolar 2025 preservado como fonte de atributos; microdados públicos sem latitude/longitude reconhecida. Nenhuma geometria artificial criada.'});console.log('atributos INEP 2025 disponíveis · geometria pública oficial pendente');continue}
      if(cfg.id==='comexstat_municipios'){const r=await captureComexMunicipal(cfg);data=r.data;raw=r.raw}
      else if(cfg.id==='cfem_municipios'){const r=await captureCfemMunicipal(cfg);data=r.data;raw=r.raw}
      else if(cfg.id==='mapa_qualidade_agua_ana')data=await captureAnaQualidade(cfg);
      else if(cfg.mode==='ibgeChoropleth'){const r=await captureIbgeChoroplethNode(cfg,page);data=r.data;raw=r.raw||[];}
      else if(cfg.mode==='cnesApi')data=await captureCnesNode(cfg);
      else if(cfg.mode==='overpass')data=await captureOverpassNode(cfg);
      else if(cfg.mode==='arcgis')data=await captureArcgisNode(cfg);
      else if(cfg.mode==='arcgisMap')data=await captureArcgisMapVector(cfg);
      else if(cfg.mode==='external'&&arcNumeric(cfg.url))data=await captureArcgisNode({...cfg,referenceOnly:false});
      else if(cfg.mode==='external'&&mapRoot(cfg.url))data=await captureArcgisMapVector({...cfg,referenceOnly:false,layerIds:cfg.layerIds||[]});
      else if(cfg.id==='mapa_geomorfologico_ibge'&&cfg.downloadUrl){const r=await materializeBinaryViaBrowser(page,cfg,cfg.downloadUrl,'shpzip');data=r.data;raw=r.raw}
      else if(cfg.id==='postos_combustivel_anp'){const r=await materializeTabularByNode(page,cfg);data=r.data;raw=r.raw}
      else if(cfg.mode==='ckan'||cfg.mode==='officialxlsx'){const r=await materializeTabularByNode(page,cfg);data=r.data;raw=r.raw}
      else if(cfg.mode==='remotezip'){const r=await materializeBinaryViaBrowser(page,cfg,cfg.url,'schools');data=r.data;raw=r.raw}
      else if(cfg.mode==='officialzip'||cfg.mode==='ibgezip'){const r=await materializeBinaryViaBrowser(page,cfg,cfg.url,'shpzip');data=r.data;raw=r.raw}
      else if(cfg.mode==='tainacan')data=await captureTainacanNode(page,cfg);
      else if(cfg.mode==='wfs'){
        await page.goto(atlasUrl,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>typeof captureLayer==='function');await page.evaluate(async id=>{await captureLayer(id)},cfg.id);const state=await page.evaluate(id=>({data:layerState[id]?.data?JSON.stringify(layerState[id].data):null,error:layerState[id]?.error||null}),cfg.id);if(!state.data)throw new Error(state.error||'captura browser não produziu dados');data=JSON.parse(state.data)
      }
      else if(cfg.mode==='kmzRemote'){const r=await materializeKmz(cfg);raster=r.entry;raw=r.raw}
      else if(cfg.mode==='xyzTile'||cfg.mode==='cogRemote')raster=await screenshotRaster(page,cfg);
      else if(cfg.mode==='external'&&cfg.referenceOnly){report.layers.push({id:cfg.id,status:'reference_pending_integration',mode:cfg.mode});console.log('referência ainda sem endpoint materializável');continue}
      else {report.layers.push({id:cfg.id,status:'unsupported_pending',mode:cfg.mode});console.log('sem estratégia automática');continue}
      if(data){const item=writeLayer(cfg.id,data);vectors[cfg.id]={arquivo:item.arquivo,registros:item.registros,sha256:item.sha256};report.layers.push({id:cfg.id,status:'materialized_vector',mode:cfg.mode,records:item.registros,sha256:item.sha256,geojson:item.geojson,kml:item.kml,raw});console.log(`${item.registros} registros · GeoJSON${item.kml?' + KML':''}`)}
      else if(raster){rasters[cfg.id]=raster;report.layers.push({id:cfg.id,status:'materialized_raster',mode:cfg.mode,arquivo:raster.arquivo,sha256:raster.sha256,raw});console.log('snapshot raster')}
      await sleep(100);
    }catch(e){failures++;report.layers.push({id:cfg.id,status:'failed',mode:cfg.mode,error:String(e?.message||e)});console.log(`FALHOU: ${e.message||e}`)}
  }
  const merged=patchManifests(vectors,rasters);report.manifest_vector_entries=Object.keys(merged.data).length;report.manifest_raster_entries=Object.keys(merged.raster).length;report.materialized_vector_now=Object.keys(vectors).length;report.materialized_raster_now=Object.keys(rasters).length;report.failed=failures;report.pending_reference=report.layers.filter(x=>x.status==='reference_pending_integration').length;report.pending_geometry=report.layers.filter(x=>x.status==='pending_geometry').length;report.pending_unsupported=report.layers.filter(x=>x.status==='unsupported_pending').length;report.status=failures||report.pending_geometry?'incomplete':'complete_with_references';report.finished_at=new Date().toISOString();
  fs.writeFileSync(path.join(root,'docs',`MATERIALIZACAO_CAMADAS_MS_${cut}.json`),JSON.stringify(report,null,2)+'\n','utf8');
}finally{await browser.close()}
const kept=report.layers.filter(x=>x.status==='already_materialized_snapshot').length;
console.log(`\nSnapshots locais preservados: ${kept}`);console.log(`Vetores materializados agora: ${Object.keys(vectors).length}`);console.log(`Rasters/KMZ materializados agora: ${Object.keys(rasters).length}`);console.log(`Referências ainda pendentes de integração: ${report.pending_reference||0}`);console.log(`Geometrias oficiais pendentes: ${report.pending_geometry||0}`);console.log(`Falhas técnicas: ${failures}`);
if(failures){console.error('Materialização incompleta. O release final deve permanecer bloqueado até resolver as falhas.');process.exit(1)}
