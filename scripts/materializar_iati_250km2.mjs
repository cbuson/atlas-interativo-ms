import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';

const root = path.resolve(process.cwd());
const corte = process.env.CORTE_DATA || '2026-08-10';
const expectedHex = Number(process.env.EXPECTED_HEX || 1554);
const expectedRoutes = Number(process.env.EXPECTED_ROUTES || 32);

const preDir = path.join(root,'dados','precalculados');
const datedDir = path.join(root,'resultados_indices',corte);
const legacyDir = path.join(root,'resultados_indices_v1_8_0');
const docsDir = path.join(root,'docs');
for(const d of [preDir,datedDir,legacyDir,docsDir]) fs.mkdirSync(d,{recursive:true});

const peicFile = path.join(preDir,'peic_250km2.geojson');
const peicValidation = path.join(docsDir,`VALIDACAO_PEIC_250KM2_${corte}.json`);

function readJson(file){
  try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){throw new Error(`JSON inválido ${path.relative(root,file)} · ${e.message}`);}
}
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
        const rel=decodeURIComponent(u.pathname).replace(/^\/+/,'') || 'index.html';
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
    const candidates=process.platform==='win32'?[
      process.env['PROGRAMFILES']&&path.join(process.env['PROGRAMFILES'],'Microsoft','Edge','Application','msedge.exe'),
      process.env['PROGRAMFILES(X86)']&&path.join(process.env['PROGRAMFILES(X86)'],'Microsoft','Edge','Application','msedge.exe'),
      process.env['PROGRAMFILES']&&path.join(process.env['PROGRAMFILES'],'Google','Chrome','Application','chrome.exe'),
      process.env['PROGRAMFILES(X86)']&&path.join(process.env['PROGRAMFILES(X86)'],'Google','Chrome','Application','chrome.exe')
    ].filter(Boolean):[];
    for(const executablePath of candidates){
      if(fs.existsSync(executablePath)){
        console.log(`Navegador local · ${executablePath}`);
        return chromium.launch({headless:true,executablePath});
      }
    }
    throw first;
  }
}
function validateFC(data,label){
  if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error(`${label} não é FeatureCollection`);
}
function validateMaster(master){
  validateFC(master,'Malha territorial');
  if(master.features.length!==expectedHex)throw new Error(`Malha territorial contém ${master.features.length} hexágonos. Esperado ${expectedHex}.`);
  const ids=new Set();
  for(const f of master.features){
    const id=String(f?.properties?.hex_id||'');
    if(!id)throw new Error('Hexágono sem hex_id');
    if(ids.has(id))throw new Error(`hex_id duplicado ${id}`);
    ids.add(id);
  }
  return ids;
}
function validatePeic(peic,masterIds){
  validateFC(peic,'PEIC');
  if(peic.features.length!==expectedHex)throw new Error(`PEIC contém ${peic.features.length} células. Esperado ${expectedHex}.`);
  const byId=new Map();
  for(const f of peic.features){
    const id=String(f?.properties?.hex_id||'');
    if(!masterIds.has(id))throw new Error(`PEIC contém hex_id fora da malha ${id}`);
    if(byId.has(id))throw new Error(`PEIC contém hex_id duplicado ${id}`);
    byId.set(id,f.properties||{});
  }
  return byId;
}
function validateRoutes(routeBase,masterIds){
  validateFC(routeBase,'Convergência de rotas');
  if(routeBase.features.length!==expectedHex)throw new Error(`Convergência contém ${routeBase.features.length} células. Esperado ${expectedHex}.`);
  const byId=new Map();
  for(const f of routeBase.features){
    const p=f?.properties||{},id=String(p.hex_id||'');
    if(!masterIds.has(id))throw new Error(`Convergência contém hex_id fora da malha ${id}`);
    if(byId.has(id))throw new Error(`Convergência contém hex_id duplicado ${id}`);
    const r=Number(p.convergencia_rotas_R100);
    if(!Number.isFinite(r)||r<0||r>100)throw new Error(`R100 inválido em ${id}: ${p.convergencia_rotas_R100}`);
    byId.set(id,p);
  }
  return byId;
}
function classIATI(v){
  if(v===null||v===undefined||!Number.isFinite(Number(v)))return 'Sem valor';
  const n=Number(v);
  if(n>=75)return 'Muito alta';
  if(n>=60)return 'Alta';
  if(n>=45)return 'Média';
  if(n>=25)return 'Baixa';
  return 'Muito baixa';
}
function colorIATI(v){
  if(v===null||v===undefined||!Number.isFinite(Number(v)))return '#d9d9d9';
  const n=Number(v);
  // Regra visual JOAJU MS: baixo = claro, alto = escuro.
  if(n>=75)return '#7f0000';
  if(n>=60)return '#e34a33';
  if(n>=45)return '#fdbb84';
  if(n>=25)return '#fee8c8';
  return '#fff7ec';
}

console.log('JOAJU MS · materialização isolada IATI · corte '+corte);
console.log('Somente IATI. Reutiliza PEIC precalculado e recalcula apenas a convergência das rotas na malha mestra.');
console.log('Fórmula congelada · IATI100 = 0,70 PEIC100 + 0,30 R100');
console.log('Regra visual · valores baixos claros · valores altos escuros');

if(!fs.existsSync(peicFile))throw new Error('PEIC precalculado ausente. Execute primeiro materializar_peic_250km2.mjs até PASS.');
if(!fs.existsSync(peicValidation))throw new Error('Validação PEIC ausente. O IATI só pode ser fechado depois de PEIC PASS.');

const peicReport=readJson(peicValidation);
if(String(peicReport.status||'').toUpperCase()!=='PASS')throw new Error(`PEIC ainda não está PASS · status ${peicReport.status||'ausente'}`);
if(Number(peicReport.hexagons)!==expectedHex)throw new Error(`Validação PEIC registra ${peicReport.hexagons} células. Esperado ${expectedHex}.`);

const peic=readJson(peicFile);

const {server,port}=await startServer();
const browser=await launchBrowser();
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage();
page.setDefaultTimeout(300000);
page.on('console',m=>{const t=m.text();if(/IATI|rota|converg|malha|Falha|erro/i.test(t))console.log('[browser] '+t);});
page.on('pageerror',e=>console.error('[pageerror] '+e.message));

try{
  const url=`http://127.0.0.1:${port}/index.html`;
  console.log('Atlas local · '+url);
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.loadMasterTerritorialGrid250==='function' && (typeof window.routeConvergenceForCurrentGrid==='function'||typeof window.buildRouteConvergenceForGrid==='function'),{timeout:180000});

  const master=await page.evaluate(()=>window.loadMasterTerritorialGrid250());
  const masterIds=validateMaster(master);
  console.log(`Malha territorial · ${master.features.length} hexágonos`);

  const peicById=validatePeic(peic,masterIds);
  console.log('PEIC precalculado · PASS · '+peic.features.length+' hexágonos');

  console.log('Calculando convergência das rotas...');
  const routeBase=await page.evaluate(async()=>{
    const grid=await window.loadMasterTerritorialGrid250();
    // R2: força o recálculo sobre a malha mestra atual.
    // O wrapper routeConvergenceForCurrentGrid pode cair na base embutida histórica
    // quando boundarySource não contém literalmente "mestra".
    if(typeof window.buildRouteConvergenceForGrid==='function')return window.buildRouteConvergenceForGrid(grid);
    if(typeof window.routeConvergenceForCurrentGrid==='function')return window.routeConvergenceForCurrentGrid(grid);
    throw new Error('Função de convergência de rotas indisponível');
  });
  const routeById=validateRoutes(routeBase,masterIds);
  const routesAnalyzed=Number(routeBase?.atlas_metadata?.rotas_analisadas||0);
  if(expectedRoutes>0 && routesAnalyzed!==expectedRoutes)throw new Error(`Convergência analisou ${routesAnalyzed} rotas. Esperado ${expectedRoutes}.`);
  console.log(`Rotas analisadas · ${routesAnalyzed}`);

  let numeric=0,nulls=0,routeOnly=0,priority=0,strategic=0;
  const fullFeatures=master.features.map(m=>{
    const mp=m.properties||{},id=String(mp.hex_id||'');
    const pp=peicById.get(id)||{},rp=routeById.get(id)||{};
    const pvRaw=pp.peic_100;
    const peicValue=(pvRaw===null||pvRaw===undefined||pvRaw==='')?null:Number(pvRaw);
    if(peicValue!==null && (!Number.isFinite(peicValue)||peicValue<0||peicValue>100))throw new Error(`PEIC inválido em ${id}: ${pvRaw}`);
    const routeScore=Number(rp.convergencia_rotas_R100||0);
    const T=Number(rp.rotas_diretas_n||0),Te=Number(rp.rotas_entorno_n||0);

    // Mantém a regra já usada pelo Atlas:
    // sem PEIC, a convergência de rotas pode contribuir no máximo 30 pontos.
    // sem PEIC e sem convergência, não se fabrica zero: IATI fica null.
    let iati=null;
    if(peicValue!==null || routeScore>0){
      iati=.70*(peicValue===null?0:peicValue)+.30*routeScore;
      iati=Number(iati.toFixed(2));
      numeric++;
      if(peicValue===null && routeScore>0)routeOnly++;
    }else nulls++;

    const isPriority=Boolean(peicValue!==null&&T>=2&&iati!==null&&iati>=60);
    const isStrategic=Boolean(peicValue!==null&&T>=3&&iati!==null&&iati>=75);
    if(isPriority)priority++;
    if(isStrategic)strategic++;

    return {
      type:'Feature',
      geometry:m.geometry,
      properties:{
        ...mp,
        iati_100:iati,
        peic_cultural_100:peicValue,
        convergencia_rotas_R100:Number(routeScore.toFixed(2)),
        classe_iati:classIATI(iati),
        __atlas_color:colorIATI(iati),
        __atlas_fill_opacity:iati===null?.12:.80,
        __atlas_weight:isStrategic?1.8:isPriority?1.35:.75,
        rotas_diretas_n:T,
        rotas_diretas_ids:String(rp.rotas_diretas_ids||''),
        rotas_diretas_nomes:String(rp.rotas_diretas_nomes||''),
        rotas_entorno_n:Te,
        rotas_entorno_ids:String(rp.rotas_entorno_ids||''),
        rotas_entorno_nomes:String(rp.rotas_entorno_nomes||''),
        rotas_adicionais_vizinhas_n:Number(rp.rotas_adicionais_vizinhas_n||0),
        normalizacao_direta_cap_p95:Number(rp.normalizacao_direta_cap_p95||0),
        normalizacao_entorno_cap_p95:Number(rp.normalizacao_entorno_cap_p95||0),
        convergencia_direta_Rd:Number(rp.convergencia_direta_Rd||0),
        convergencia_entorno_Re:Number(rp.convergencia_entorno_Re||0),
        nodo_prioritario_validacao:isPriority?'Sim':'Não',
        nodo_estrategico_validacao:isStrategic?'Sim':'Não',
        suporte_cultural_nao_sensivel:peicValue!==null?'Sim':'Não. Contribuição limitada à convergência cartográfica',
        formula:'IATI100 = 0,70 PEIC100 + 0,30 R100',
        formula_rotas:'R100 = 100 × (0,70 Rd + 0,30 Re)',
        regra_sem_peic:'PEIC null contribui 0 ao termo cultural. A convergência de rotas pode aportar no máximo 30 pontos.',
        regra_sem_evidencia:'Sem PEIC e sem convergência, iati_100 = null, nunca zero artificial.',
        governanca:'As rotas são hipóteses metodológicas revisáveis. O IATI orienta investigação e validação territorial, não oficializa rotas.',
        fonte_malha:master.boundarySource||master?.atlas_metadata?.boundary_source||'Malha territorial mestra',
        data_corte:corte,
        versao_metodo_iati:'IATI-01 v1.8.0'
      }
    };
  });

  const full={
    type:'FeatureCollection',
    features:fullFeatures,
    atlas_metadata:{
      sigla:'IATI',
      metodo:'IATI-01 v1.8.0',
      corte_dados:corte,
      n_hexagonos:fullFeatures.length,
      formula:'IATI100 = 0,70 PEIC100 + 0,30 R100',
      formula_rotas:'R100 = 100 × (0,70 Rd + 0,30 Re)',
      base_peic:'dados/precalculados/peic_250km2.geojson',
      rotas_analisadas:routesAnalyzed,
      cap_direto_percentil_95:routeBase?.atlas_metadata?.cap_direto_percentil_95,
      cap_entorno_percentil_95:routeBase?.atlas_metadata?.cap_entorno_percentil_95,
      regra_visual:'valores baixos claros, valores altos escuros',
      regra_sem_evidencia:'iati_100 = null quando não há PEIC nem convergência',
      status_materializacao:'materializado_isoladamente'
    }
  };

  if(full.features.length!==expectedHex)throw new Error(`IATI final contém ${full.features.length} células. Esperado ${expectedHex}.`);
  const ids=new Set();
  for(const f of full.features){
    const id=String(f.properties?.hex_id||'');
    if(ids.has(id))throw new Error(`IATI contém hex_id duplicado ${id}`);
    ids.add(id);
    const v=f.properties?.iati_100;
    if(v===null||v===undefined||v==='')continue;
    const n=Number(v);
    if(!Number.isFinite(n)||n<0||n>100)throw new Error(`IATI inválido em ${id}: ${v}`);
    const expected=.70*(f.properties.peic_cultural_100===null?0:Number(f.properties.peic_cultural_100))+.30*Number(f.properties.convergencia_rotas_R100||0);
    if(Math.abs(n-expected)>0.011)throw new Error(`Fórmula IATI divergente em ${id}: ${n} vs ${expected.toFixed(2)}`);
  }

  const vals=full.features.map(f=>f.properties?.iati_100).filter(v=>v!==null&&v!==undefined&&v!=='').map(Number).filter(Number.isFinite);
  const min=vals.length?Math.min(...vals):null,max=vals.length?Math.max(...vals):null,mean=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;

  const preFile=path.join(preDir,'iati_250km2.geojson');
  const datedFile=path.join(datedDir,'iati_250km2.geojson');
  const legacyFile=path.join(legacyDir,'articulacao_itinerarios_peic_rotas_250km2.geojson');

  fs.writeFileSync(preFile,JSON.stringify(full),'utf8');
  fs.writeFileSync(datedFile,JSON.stringify(full),'utf8');

  // Compatibilidade visual da camada histórica: somente células com valor IATI.
  const legacy={
    type:'FeatureCollection',
    features:full.features.filter(f=>Number.isFinite(Number(f.properties?.iati_100))),
    atlas_metadata:{...full.atlas_metadata,uso:'compatibilidade com camada de articulação do Atlas'}
  };
  fs.writeFileSync(legacyFile,JSON.stringify(legacy),'utf8');

  const report={
    project:'JOAJU MS',
    cut:corte,
    index:'IATI',
    status:'PASS',
    hexagons:full.features.length,
    routes_analyzed:routesAnalyzed,
    cells_with_iati_value:numeric,
    cells_without_iati_value:nulls,
    cells_route_only:routeOnly,
    priority_nodes:priority,
    strategic_nodes:strategic,
    iati_min:min===null?null:Number(min.toFixed(2)),
    iati_mean:mean===null?null:Number(mean.toFixed(2)),
    iati_max:max===null?null:Number(max.toFixed(2)),
    formula:'IATI100 = 0,70 PEIC100 + 0,30 R100',
    route_formula:'R100 = 100 × (0,70 Rd + 0,30 Re)',
    visual_rule:'baixo claro, alto escuro',
    peic_validation:path.relative(root,peicValidation).replaceAll('\\','/'),
    precomputed:path.relative(root,preFile).replaceAll('\\','/'),
    sha256:sha256File(preFile),
    generated_at:new Date().toISOString()
  };
  const reportFile=path.join(docsDir,`VALIDACAO_IATI_250KM2_${corte}.json`);
  fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n','utf8');

  console.log(`IATI · PASS · ${full.features.length} hexágonos`);
  console.log(`IATI numérico · ${numeric}/${full.features.length} · sem valor ${nulls} · somente rotas ${routeOnly}`);
  console.log(`IATI 100 · mínimo ${report.iati_min} · média ${report.iati_mean} · máximo ${report.iati_max}`);
  console.log(`Nodos prioritários · ${priority} · estratégicos · ${strategic}`);
  console.log(`GeoJSON snapshot · ${path.relative(root,preFile)}`);
  console.log(`Validação · ${path.relative(root,reportFile)}`);
} catch(e){
  console.error('\nFALHA IATI · '+(e?.stack||e));
  process.exitCode=1;
} finally {
  await context.close().catch(()=>{});
  await browser.close().catch(()=>{});
  await new Promise(r=>server.close(r));
}
