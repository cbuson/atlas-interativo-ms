import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd());
const version=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

let passes=0,warnings=0,failures=0;
const pass=m=>{passes++;console.log(`PASS · ${m}`)};
const warn=m=>{warnings++;console.warn(`WARN · ${m}`)};
const fail=m=>{failures++;console.error(`FAIL · ${m}`)};
const check=(cond,msg)=>cond?pass(msg):fail(msg);

function configsAndManifests(){
  const start=html.indexOf('const configs=');
  const end=html.indexOf('\n\n\nfunction log',start);
  if(start<0||end<0)throw new Error('Bloco configs ausente');
  const ctx={};
  vm.createContext(ctx);
  vm.runInContext(html.slice(start,end)+'\n;globalThis.__configs=configs;',ctx,{timeout:5000});

  const dm=html.match(/const DATA_MANIFEST = (\{.*?\});\nwindow\.ATLAS_DATA/s);
  const rm=html.match(/const RASTER_MANIFEST = (\{.*?\});/s);
  if(!dm||!rm)throw new Error('Manifestos ausentes');

  return {
    configs:ctx.__configs,
    data:JSON.parse(dm[1]),
    raster:JSON.parse(rm[1])
  };
}

function parseDatasetJs(file){
  const txt=fs.readFileSync(file,'utf8');
  const m=txt.match(/=\s*(\{.*\})\s*;?\s*$/s);
  if(!m)throw new Error('atribuição JSON não localizada');
  return JSON.parse(m[1]);
}

const {configs,data,raster}=configsAndManifests();

check(Array.isArray(configs),'catálogo runtime disponível');
check(configs.length===Number(version.runtime_layers),`catálogo runtime contém ${configs.length} camadas`);
check(new Set(configs.map(c=>c.id)).size===configs.length,'IDs de camadas são únicos');
check(Object.keys(data).length===Number(version.vector_manifest_entries),`DATA_MANIFEST contém ${Object.keys(data).length} entradas`);
check(Object.keys(raster).length===Number(version.raster_manifest_entries),`RASTER_MANIFEST contém ${Object.keys(raster).length} entradas`);

for(const [id,item] of Object.entries(data)){
  const file=path.join(root,item.arquivo);
  if(!fs.existsSync(file)){fail(`${id} aponta arquivo ausente · ${item.arquivo}`);continue}
  try{
    const d=parseDatasetJs(file);
    const n=d?.features?.length||0;
    check(n===item.registros,`${id} · ${n} registros`);
  }catch(e){
    fail(`${id} inválido · ${e.message}`);
  }
}

for(const [id,item] of Object.entries(raster)){
  check(fs.existsSync(path.join(root,item.arquivo)),`${id} · snapshot raster/KMZ presente`);
}

const closed={
  potencial_geocientifico_territorial_250km2:'ipg_250km2.geojson',
  polos_estruturantes_itinerarios_culturais_250km2:'peic_250km2.geojson',
  articulacao_itinerarios_peic_rotas_250km2:'iati_250km2.geojson',
  iat_acessibilidade_territorial_250km2:'iat_250km2.geojson',
  isa_sensibilidade_ambiental_250km2:'isa_250km2.geojson',
  ict_capacidade_turistica_250km2:'ict_250km2.geojson',
  ipae_articulacao_educativa_250km2:'ipae_250km2.geojson',
  icd_cobertura_qualidade_dados_250km2:'icd_250km2.geojson'
};

for(const [id,fileName] of Object.entries(closed)){
  const cfg=configs.find(c=>c.id===id);
  check(cfg?.closedSnapshotDate==='2026-08-10',`${id} marcado como corte fechado`);
  const file=path.join(root,'dados','precalculados',fileName);
  check(fs.existsSync(file),`${fileName} presente`);
  if(fs.existsSync(file)){
    const d=JSON.parse(fs.readFileSync(file,'utf8'));
    check(d?.features?.length===1554,`${fileName} possui 1554 células`);
  }
}

const derived=[
  'acessibilidade_rodoviaria_estimada_rotas_base_externa',
  'interacoes_rotas_unidades_conservacao',
  'cavidades_proximas_rotas_estudo',
  'cavidades_em_unidades_conservacao'
];
for(const id of derived){
  const cfg=configs.find(c=>c.id===id);
  check(Boolean(cfg?.precomputedUrl&&fs.existsSync(path.join(root,cfg.precomputedUrl))),`${id} possui produto derivado materializado`);
}

check(!html.includes('dados/precalculados/snapshot_indices_ficha.js'),'bundle antigo snapshot_indices_ficha.js removido da carga');
check(!configs.some(c=>c.id==='sintese_analitica_territorial_2026_08_09'),'síntese parcial 09/08 removida do runtime');
check(!configs.some(c=>c.id==='perfil_territorial_fechado_2026_08_09'),'perfil parcial 09/08 removido do runtime');

const rede=configs.find(c=>c.id==='rede_hidrica');
const geom=configs.find(c=>c.id==='mapa_geomorfologico_ibge');
check(!data.rede_hidrica&&rede?.mode==='arcgis','rede hídrica não aponta snapshot GitHub inexistente');
check(!data.mapa_geomorfologico_ibge&&geom?.referenceOnly===true,'geomorfologia não aponta snapshot GitHub inexistente');

check(html.includes('JOAJU MS · FICHA UNIVERSAL 1.1'),'Ficha Universal 1.1 incorporada ao runtime');
check(html.includes('Ficha da camada')&&html.includes('showLayerFicha'),'todas as camadas expõem ação de ficha por meio do template comum');
check(html.includes('resolveFeatureHexContext')&&html.includes('analysisGeomIntersectsCell'),'elementos vetoriais podem ser relacionados localmente à malha R5');
check(html.includes('universalFichaCanonicalHexId'),'hex_id explícito é validado contra a malha R5 antes do uso na ficha');
check(html.includes("if(!/^HX-/.test(id))return ''")&&html.includes('universalFichaHexIdSet?.has(id)'),'somente HX-* pertencente à R5 pode ser chave territorial canônica');
check(html.includes('publicSnapshotGrid')&&html.includes('universalFichaIsR5Grid'),'Ficha Universal prioriza a malha pública R5 de 1554 células');
check(html.includes("explicitRaw?'legacy-remapped':'spatial'"),'identificadores de grades históricas usam remapeamento geométrico');
check(!/if\(hid\)html\+=`<section class="universal-ficha-card"/.test(html),'showFeature não aceita hex_id não validado como R5');
check(html.includes('const snapshotClosed=useSnap')&&html.includes("closedOrLoaded(CULTURAL_LAYER_ID)?'sem evidência cultural suficiente'"),'PEIC null em snapshot fechado não aparece como cálculo pendente');
check(html.includes("territorialSnapshotByHex?.size===1554")&&html.includes("publicSnapshotMetadata?.status"),'estado fechado dos índices é reconhecido pelo snapshot público');
check(fs.existsSync(path.join(root,'scripts/auditar_fichas.mjs')),'auditor estrutural de fichas presente');
check(fs.existsSync(path.join(root,'docs/VALIDACAO_FICHAS_2026-08-12.json')),'validação estrutural das fichas presente');
check(fs.existsSync(path.join(root,'docs/FICHA_UNIVERSAL_1.1_2026-08-12.md')),'documentação da Ficha Universal 1.1 presente');
check(html.includes('não escolhe arbitrariamente um hexágono principal'),'geometrias multi-hex preservam todas as células sem escolha arbitrária');
check(html.includes('viewport-fit=cover'),'viewport móvel usa viewport-fit=cover');
check(html.includes('joaju-pwa-runtime')&&html.includes('serviceWorker.register'),'runtime registra Service Worker PWA');
check(html.includes('pwaInstallMenuBtn')&&html.includes('pwaInstallDocsCard'),'interface expõe instalação PWA em desktop e móvel');
for(const f of ['service-worker.js','assets/icons/joaju-192.png','assets/icons/joaju-512.png','assets/icons/joaju-maskable-512.png','assets/icons/apple-touch-icon.png','docs/PWA_MOBILE_1.0_2026-08-12.md','docs/VALIDACAO_PWA_2026-08-12.json']){
  check(fs.existsSync(path.join(root,f)),`${f} presente`);
}
const pwaManifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
check(Boolean(pwaManifest.name&&pwaManifest.short_name&&pwaManifest.start_url&&pwaManifest.display),'manifest PWA possui campos centrais de instalação');
check(pwaManifest.display==='standalone','manifest PWA usa display standalone');
check(Array.isArray(pwaManifest.icons)&&pwaManifest.icons.some(i=>i.sizes==='192x192')&&pwaManifest.icons.some(i=>i.sizes==='512x512'),'manifest PWA possui ícones 192 e 512');
check(pwaManifest.icons.some(i=>String(i.purpose||'').includes('maskable')),'manifest PWA possui ícone maskable');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
try{new Function(sw);pass('service-worker.js possui sintaxe JavaScript válida')}catch(e){fail(`service-worker.js inválido · ${e.message}`)}
check(sw.includes('CACHE_OFFLINE_TERRITORIAL')&&sw.includes('OFFLINE_TERRITORIAL_ASSETS'),'Service Worker oferece pacote territorial offline explícito');
check(sw.includes("2026-08-12-pwa-6-full-layer-ficha-audit")&&sw.includes('networkFirstCached'),'Service Worker usa revisão nova e network-first nos precalculados');
check(html.includes("updateViaCache:'none'")&&html.includes("navigator.serviceWorker?.addEventListener('controllerchange'"),'runtime força atualização do Service Worker e recarrega após troca de controlador');
check(html.includes("input.addEventListener('input',filterLayerCards)")&&html.includes("clear.addEventListener('click'"),'busca de camadas possui eventos de filtro e limpeza');
check(html.includes("if(document.getElementById('layerSearchInput')?.value)filterLayerCards()"),'busca de camadas é reaplicada após atualização dos cards');
check(html.includes("window.addEventListener('pageshow'")&&html.includes('syncLayerSearchState'),'busca é reaplicada após restauração/autofill do navegador');
check(fs.existsSync(path.join(root,'docs/VALIDACAO_FICHAS_R5_PATCH14_2026-08-12.json')),'validação de regressão PATCH 14 presente');
check(fs.existsSync(path.join(root,'scripts/auditar_carga_camadas_fichas.mjs')),'auditor integral de carga de camadas e fichas presente');
check(fs.existsSync(path.join(root,'docs/BARRIDO_COMPLETO_CAMADAS_FICHAS_2026-08-12.csv')),'relatório completo de camadas e fichas presente');
check(html.includes('const closedPreferred=Boolean(cfg.precomputedUrl&&cfg.closedSnapshotDate)'),'loader prioriza produtos territoriais fechados antes de fallback legado');

const staticRefs=new Set();
for(const m of html.matchAll(/(?:src|href)=["']([^"'?#]+)["']/g)){
  const v=m[1];
  if(!v||v.includes('${')||/^(https?:|data:|mailto:|tel:|javascript:|#)/i.test(v)||v.startsWith('/'))continue;
  staticRefs.add(v.replace(/^\.\//,''));
}
for(const v of staticRefs)check(fs.existsSync(path.join(root,v)),`referência local existe · ${v}`);

const maxBytes=95*1024*1024;
let oversize=0;
function walk(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(e.name==='node_modules'||e.name==='.git')continue;
    const p=path.join(dir,e.name);
    if(e.isDirectory())walk(p);
    else if(e.isFile()&&fs.statSync(p).size>maxBytes){oversize++;fail(`arquivo acima de 95 MB · ${path.relative(root,p)}`)}
  }
}
walk(root);
if(!oversize)pass('nenhum arquivo ultrapassa 95 MB');

for(const f of ['README.md','CITATION.cff','manifest.webmanifest','.gitignore','docs/INDICES_FECHADOS_2026-08-10.md']){
  check(fs.existsSync(path.join(root,f)),`${f} presente`);
}

for(const f of ['atlas_ms_v1.8.0-dev_catalogo_camadas.csv','atlas_ms_v1.8.0-dev_mapa_fontes_camadas.csv']){
  if(!fs.existsSync(path.join(root,f))){fail(`${f} ausente`);continue}
  const rows=fs.readFileSync(path.join(root,f),'utf8').trimEnd().split(/\r?\n/).length-1;
  check(rows===configs.length,`${f} contém ${rows} registros`);
}

const inline=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(m=>!/\bsrc\s*=/.test(m[1])&&!/application\/ld\+json/i.test(m[1]))
  .map(m=>m[2]).filter(x=>x.trim());
for(let i=0;i<inline.length;i++){
  try{new Function(inline[i]);pass(`JavaScript inline ${i+1}/${inline.length} válido`)}
  catch(e){fail(`JavaScript inline ${i+1} inválido · ${e.message}`)}
}

console.log(`\nResumo · ${passes} PASS · ${warnings} WARN · ${failures} FAIL`);
if(failures)process.exit(1);
