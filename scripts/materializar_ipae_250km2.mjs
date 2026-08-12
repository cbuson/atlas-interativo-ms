import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';

const root = path.resolve(process.cwd());
const corte = process.env.CORTE_DATA || '2026-08-10';
const expectedHex = Number(process.env.EXPECTED_HEX || 1554);
const outDir = path.join(root, 'resultados_indices', corte);
const preDir = path.join(root, 'dados', 'precalculados');
const docsDir = path.join(root, 'docs');
fs.mkdirSync(outDir, {recursive:true});
fs.mkdirSync(preDir, {recursive:true});
fs.mkdirSync(docsDir, {recursive:true});

function sha256File(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function mime(file){
  const e=path.extname(file).toLowerCase();
  return ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8','.css':'text/css; charset=utf-8','.csv':'text/csv; charset=utf-8','.kml':'application/vnd.google-earth.kml+xml','.webmanifest':'application/manifest+json'})[e]||'application/octet-stream';
}
function startServer(){
  return new Promise((resolve,reject)=>{
    const server=http.createServer((req,res)=>{
      try{
        const u=new URL(req.url,'http://127.0.0.1');
        let rel=decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
        const file=path.resolve(root, rel);
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
function validateIPAE(data, masterIds){
  if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('IPAE não retornou FeatureCollection');
  if(data.features.length!==masterIds.size)throw new Error(`IPAE contém ${data.features.length} hexágonos. Esperado ${masterIds.size}.`);
  let finite=0; const seen=new Set();
  for(const f of data.features){
    const id=String(f?.properties?.hex_id||'');if(!masterIds.has(id))throw new Error(`IPAE contém hex_id fora da malha ${id}`);if(seen.has(id))throw new Error(`IPAE contém hex_id duplicado ${id}`);seen.add(id);
    if(Number.isFinite(Number(f?.properties?.ipae_100)))finite++;
  }
  if(finite!==masterIds.size)throw new Error(`IPAE contém ${finite}/${masterIds.size} valores numéricos válidos`);
}

console.log('JOAJU MS · materialização isolada IPAE · corte '+corte);
console.log('Somente IPAE. Não executa ComexStat, Cadastur, PIN/MS nem a materialização geral.');

const {server,port}=await startServer();
const browser=await launchBrowser();
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage();
page.setDefaultTimeout(240000);
page.on('console',m=>{const t=m.text();if(/IPAE|escolas|museus|campus|bibliotec|Falha|erro|Malha/i.test(t))console.log('[browser] '+t);});
page.on('pageerror',e=>console.error('[pageerror] '+e.message));

try{
  const url=`http://127.0.0.1:${port}/index.html`;
  console.log('Atlas local · '+url);
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.calculateIPAE250==='function'&&typeof window.loadMasterTerritorialGrid250==='function',{timeout:180000});
  const master=await page.evaluate(()=>window.loadMasterTerritorialGrid250());
  const masterIds=validateGrid(master);
  console.log(`Malha territorial · ${master.features.length} hexágonos`);
  console.log('Calculando IPAE...');
  const data=await page.evaluate(()=>window.calculateIPAE250());
  validateIPAE(data,masterIds);

  const values=data.features.map(f=>Number(f.properties.ipae_100));
  const min=Math.min(...values),max=Math.max(...values),mean=values.reduce((a,b)=>a+b,0)/values.length;
  const coverageVals=data.features.map(f=>Number(f.properties.ipae_cobertura_pct)).filter(Number.isFinite);
  const positionalVals=data.features.map(f=>Number(f.properties.ipae_posicional_pct)).filter(Number.isFinite);
  const schoolCounts=data.features.reduce((a,f)=>a+Number(f.properties.escolas_n||0),0);
  const output={...data,atlas_metadata:{...(data.atlas_metadata||{}),corte_dados:corte,status_materializacao:'materializado_isoladamente',fonte_escolas:'INEP 2025 + Catálogo de Escolas com latitude/longitude oficial quando disponível'}};

  const preFile=path.join(preDir,'ipae_250km2.geojson');
  const datedFile=path.join(outDir,'ipae_articulacao_educativa_250km2.geojson');
  fs.writeFileSync(preFile,JSON.stringify(output),'utf8');
  fs.writeFileSync(datedFile,JSON.stringify(output),'utf8');
  const report={project:'JOAJU MS',cut:corte,index:'IPAE',status:'PASS',hexagons:output.features.length,school_points_counted_across_hexagons:schoolCounts,ipae_min:Number(min.toFixed(2)),ipae_max:Number(max.toFixed(2)),ipae_mean:Number(mean.toFixed(2)),ipae_coverage_pct:coverageVals.length?Number((coverageVals.reduce((a,b)=>a+b,0)/coverageVals.length).toFixed(2)):null,ipae_positional_pct:positionalVals.length?Number((positionalVals.reduce((a,b)=>a+b,0)/positionalVals.length).toFixed(2)):null,formula:'25% escolas + 25% museus e memória + 25% ensino superior + 25% bibliotecas e arquivos. Cada componente usa 70% densidade + 30% proximidade.',precomputed:path.relative(root,preFile).replaceAll('\\','/'),sha256:sha256File(preFile),generated_at:new Date().toISOString(),note:'Materialização isolada do IPAE. Não declara o snapshot geral dos oito índices como fechado.'};
  const reportFile=path.join(docsDir,`VALIDACAO_IPAE_250KM2_${corte}.json`);
  fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n','utf8');
  console.log(`IPAE · PASS · ${output.features.length} hexágonos`);
  console.log(`IPAE 100 · mínimo ${report.ipae_min} · média ${report.ipae_mean} · máximo ${report.ipae_max}`);
  console.log(`Cobertura IPAE registrada · ${report.ipae_coverage_pct}%`);
  console.log(`Adequação posicional IPAE · ${report.ipae_positional_pct}%`);
  console.log(`GeoJSON · ${path.relative(root,preFile)}`);
  console.log(`Validação · ${path.relative(root,reportFile)}`);
} catch(e){
  console.error('\nFALHA IPAE · '+(e?.stack||e));
  process.exitCode=1;
} finally {
  await context.close().catch(()=>{});
  await browser.close().catch(()=>{});
  await new Promise(r=>server.close(r));
}
