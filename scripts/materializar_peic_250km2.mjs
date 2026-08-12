import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';

const root = path.resolve(process.cwd());
const corte = process.env.CORTE_DATA || '2026-08-10';
const expectedHex = Number(process.env.EXPECTED_HEX || 1554);
const preDir = path.join(root,'dados','precalculados');
const legacyDir = path.join(root,'resultados_indices_v1_8_0');
const datedDir = path.join(root,'resultados_indices',corte);
const docsDir = path.join(root,'docs');
for(const d of [preDir,legacyDir,datedDir,docsDir]) fs.mkdirSync(d,{recursive:true});

function sha256File(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function mime(file){
  const e=path.extname(file).toLowerCase();
  return ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8','.css':'text/css; charset=utf-8','.csv':'text/csv; charset=utf-8','.md':'text/markdown; charset=utf-8','.webmanifest':'application/manifest+json'})[e]||'application/octet-stream';
}
function startServer(){
  return new Promise((resolve,reject)=>{
    const server=http.createServer((req,res)=>{
      try{
        const u=new URL(req.url,'http://127.0.0.1');
        const rel=decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
        const file=path.resolve(root,rel);
        if(!file.startsWith(root+path.sep) && file!==path.join(root,'index.html')){res.writeHead(403);res.end('forbidden');return;}
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
  try{return await chromium.launch({headless:true});}catch(first){
    const candidates=process.platform==='win32'?[process.env['PROGRAMFILES']&&path.join(process.env['PROGRAMFILES'],'Microsoft','Edge','Application','msedge.exe'),process.env['PROGRAMFILES(X86)']&&path.join(process.env['PROGRAMFILES(X86)'],'Microsoft','Edge','Application','msedge.exe'),process.env['PROGRAMFILES']&&path.join(process.env['PROGRAMFILES'],'Google','Chrome','Application','chrome.exe'),process.env['PROGRAMFILES(X86)']&&path.join(process.env['PROGRAMFILES(X86)'],'Google','Chrome','Application','chrome.exe')].filter(Boolean):[];
    for(const executablePath of candidates){if(fs.existsSync(executablePath)){console.log(`Navegador local · ${executablePath}`);return chromium.launch({headless:true,executablePath});}}
    throw first;
  }
}
function validateGrid(grid){
  if(grid?.type!=='FeatureCollection'||!Array.isArray(grid.features))throw new Error('Malha territorial não retornou FeatureCollection');
  if(grid.features.length!==expectedHex)throw new Error(`Malha territorial contém ${grid.features.length} hexágonos. Esperado ${expectedHex}.`);
  const ids=new Set();
  for(const f of grid.features){const id=String(f?.properties?.hex_id||'');if(!id)throw new Error('Hexágono sem hex_id');if(ids.has(id))throw new Error(`hex_id duplicado ${id}`);ids.add(id);}
  return ids;
}
function formulaOK(v){const s=String(v||'').replace(/\s+/g,'').replace(/,/g,'.');return s.includes('0.45')&&s.includes('0.25')&&s.includes('0.20')&&s.includes('0.10');}
function mergeFull(master, peic){
  const byId=new Map((peic.features||[]).map(f=>[String(f?.properties?.hex_id||''),f]));
  const meta=peic.atlas_metadata||{};
  const fullFeatures=master.features.map(m=>{
    const id=String(m?.properties?.hex_id||'');
    const p=byId.get(id);
    if(p){return {type:'Feature',geometry:m.geometry,properties:{...(m.properties||{}),...(p.properties||{})}};}
    return {type:'Feature',geometry:m.geometry,properties:{...(m.properties||{}),peic_100:null,classe_estruturacao:'Sem evidência documental suficiente',status_calculo:'Sem evidência suficiente',elegivel_peic:'Não',polo_territorial_estruturante:'Não classificável sem evidência',diversidade_dimensoes:0,dimensoes_nao_sensiveis:0,diversidade_normalizada:0,simpson_equilibrado:0,riqueza_cultural_ajustada:0,riqueza_normalizada:0,vizinhos_elegiveis:0,continuidade_territorial:0,formula:'PEIC100 = 100 × (0,45 Dn + 0,25 Sn + 0,20 Qn + 0,10 Cn)',interpretacao:'Célula preservada na malha analítica sem evidência cultural suficiente nas bases carregadas. Não é classificada como PEIC baixo.',cobertura_dimensoes:`${(meta.dimensoes_disponiveis||[]).length}/6`,cobertura_documental:Number(meta.cobertura_documental??0),data_corte:corte}};
  });
  return {type:'FeatureCollection',features:fullFeatures,atlas_metadata:{...meta,sigla:'PEIC',corte_dados:corte,status_materializacao:'materializado_isoladamente',celulas_malha:master.features.length,celulas_com_valor_peic:fullFeatures.filter(f=>Number.isFinite(Number(f.properties?.peic_100))).length,regra_sem_evidencia:'peic_100 = null. Ausência de evidência não é convertida em zero.',formula:'PEIC100 = 100 × (0,45 Dn + 0,25 Sn + 0,20 Qn + 0,10 Cn)'}};
}
function validatePEIC(full, masterIds){
  if(full?.type!=='FeatureCollection'||!Array.isArray(full.features))throw new Error('PEIC não retornou FeatureCollection');
  if(full.features.length!==masterIds.size)throw new Error(`PEIC contém ${full.features.length} hexágonos. Esperado ${masterIds.size}.`);
  const seen=new Set();let numeric=0,nulls=0;
  for(const f of full.features){
    const id=String(f?.properties?.hex_id||'');if(!masterIds.has(id))throw new Error(`PEIC contém hex_id fora da malha ${id}`);if(seen.has(id))throw new Error(`PEIC contém hex_id duplicado ${id}`);seen.add(id);
    const v=f?.properties?.peic_100;
    if(v===null||v===undefined||v===''){nulls++;continue;}
    const n=Number(v);if(!Number.isFinite(n)||n<0||n>100)throw new Error(`PEIC inválido em ${id}: ${v}`);numeric++;
  }
  return {numeric,nulls};
}

console.log('JOAJU MS · materialização isolada PEIC · corte '+corte);
console.log('Somente PEIC. Não executa Cadastur, ComexStat, PIN/MS, educação, ISA, IPAE nem a materialização geral.');
console.log('Fórmula congelada · PEIC100 = 100 × (0,45 Dn + 0,25 Sn + 0,20 Qn + 0,10 Cn)');

const {server,port}=await startServer();
const browser=await launchBrowser();
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage();
page.setDefaultTimeout(300000);
page.on('console',m=>{const t=m.text();if(/PEIC|cultural|dimens|malha|Falha|erro/i.test(t))console.log('[browser] '+t);});
page.on('pageerror',e=>console.error('[pageerror] '+e.message));

try{
  const url=`http://127.0.0.1:${port}/index.html`;
  console.log('Atlas local · '+url);
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.calculateCulturalItineraryPoles250==='function'&&typeof window.loadMasterTerritorialGrid250==='function',{timeout:180000});
  const master=await page.evaluate(()=>window.loadMasterTerritorialGrid250());
  const masterIds=validateGrid(master);
  console.log(`Malha territorial · ${master.features.length} hexágonos`);
  console.log('Calculando PEIC...');
  const peic=await page.evaluate(()=>window.calculateCulturalItineraryPoles250());
  if(!peic?.features)throw new Error('Cálculo PEIC não retornou feições');
  const meta=peic.atlas_metadata||{};
  const available=Array.isArray(meta.dimensoes_disponiveis)?meta.dimensoes_disponiveis:[];
  const missing=Array.isArray(meta.dimensoes_indisponiveis)?meta.dimensoes_indisponiveis:[];
  console.log(`Dimensões culturais · ${available.length}/6 disponíveis`);
  if(missing.length)console.log('Pendentes · '+missing.join(' | '));
  if(available.length!==6||missing.length!==0||String(meta.status||'').toLowerCase()!=='completo')throw new Error(`PEIC não pode ser fechado. Cobertura cultural ${available.length}/6.`);
  if(!formulaOK(meta.formula))throw new Error(`Fórmula PEIC do index.html diverge da fórmula congelada: ${meta.formula||'ausente'}`);
  if(Number(meta.celulas_malha)!==expectedHex)throw new Error(`O cálculo PEIC usou ${meta.celulas_malha} células. Esperado ${expectedHex}.`);

  const full=mergeFull(master,peic);
  const counts=validatePEIC(full,masterIds);
  const vals=full.features.map(f=>f.properties?.peic_100).filter(v=>v!==null&&v!==undefined&&v!=='').map(Number).filter(Number.isFinite);
  const min=vals.length?Math.min(...vals):null,max=vals.length?Math.max(...vals):null,mean=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
  const eligible=full.features.filter(f=>String(f.properties?.elegivel_peic||'').toLowerCase().startsWith('sim')).length;
  const poles=full.features.filter(f=>String(f.properties?.polo_territorial_estruturante||'').toLowerCase()==='sim').length;

  const preFile=path.join(preDir,'peic_250km2.geojson');
  const datedFile=path.join(datedDir,'peic_estrutura_cultural_250km2.geojson');
  const legacyFile=path.join(legacyDir,'polos_estruturantes_itinerarios_culturais_250km2.geojson');
  fs.writeFileSync(preFile,JSON.stringify(full),'utf8');
  fs.writeFileSync(datedFile,JSON.stringify(full),'utf8');
  fs.writeFileSync(legacyFile,JSON.stringify(peic),'utf8');

  const report={project:'JOAJU MS',cut:corte,index:'PEIC',status:'PASS',hexagons:full.features.length,dimensions_available:available,dimensions_missing:missing,coverage_documental_pct:Number((Number(meta.cobertura_documental||1)*100).toFixed(2)),cells_with_peic_value:counts.numeric,cells_without_sufficient_evidence:counts.nulls,cells_eligible:eligible,structuring_poles:poles,peic_min:min===null?null:Number(min.toFixed(2)),peic_mean:mean===null?null:Number(mean.toFixed(2)),peic_max:max===null?null:Number(max.toFixed(2)),formula:'PEIC100 = 100 × (0,45 Dn + 0,25 Sn + 0,20 Qn + 0,10 Cn)',rule_no_evidence:'null, nunca zero artificial',precomputed:path.relative(root,preFile).replaceAll('\\','/'),sha256:sha256File(preFile),generated_at:new Date().toISOString(),note:'Materialização isolada do PEIC sobre a malha territorial mestra de 1554 células. O arquivo precalculado preserva todas as células e usa null onde não há evidência suficiente.'};
  const reportFile=path.join(docsDir,`VALIDACAO_PEIC_250KM2_${corte}.json`);
  fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n','utf8');

  console.log(`PEIC · PASS · ${full.features.length} hexágonos`);
  console.log(`Dimensões culturais · 6/6 · cobertura documental ${report.coverage_documental_pct}%`);
  console.log(`PEIC numérico · ${counts.numeric}/${full.features.length} · sem evidência suficiente ${counts.nulls}`);
  console.log(`PEIC 100 · mínimo ${report.peic_min} · média ${report.peic_mean} · máximo ${report.peic_max}`);
  console.log(`Células elegíveis · ${eligible} · polos estruturantes · ${poles}`);
  console.log(`GeoJSON snapshot · ${path.relative(root,preFile)}`);
  console.log(`Validação · ${path.relative(root,reportFile)}`);
} catch(e){
  console.error('\nFALHA PEIC · '+(e?.stack||e));
  process.exitCode=1;
} finally {
  await context.close().catch(()=>{});
  await browser.close().catch(()=>{});
  await new Promise(r=>server.close(r));
}
