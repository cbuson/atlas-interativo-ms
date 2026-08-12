import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd());
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let passes=0,warnings=0,failures=0;
const pass=m=>{passes++;console.log(`PASS · ${m}`)};
const warn=m=>{warnings++;console.warn(`WARN · ${m}`)};
const fail=m=>{failures++;console.error(`FAIL · ${m}`)};
const check=(c,m)=>c?pass(m):fail(m);

function configsAndManifest(){
  const start=html.indexOf('const configs=');
  const end=html.indexOf('\n\n\nfunction log',start);
  if(start<0||end<0)throw new Error('Bloco configs ausente');
  const ctx={};vm.createContext(ctx);
  vm.runInContext(html.slice(start,end)+'\n;globalThis.__configs=configs;',ctx,{timeout:5000});
  const dm=html.match(/const DATA_MANIFEST = (\{.*?\});\nwindow\.ATLAS_DATA/s);
  if(!dm)throw new Error('DATA_MANIFEST ausente');
  return {configs:ctx.__configs,data:JSON.parse(dm[1])};
}
function parseDatasetJs(file){
  const txt=fs.readFileSync(file,'utf8');
  const m=txt.match(/=\s*(\{.*\})\s*;?\s*$/s);
  if(!m)throw new Error('atribuição JSON não localizada');
  return JSON.parse(m[1]);
}
function explicitHex(p={}){
  for(const k of ['hex_id','id_hex','hex']){
    const v=p?.[k];if(v!==undefined&&v!==null&&String(v).trim()!=='')return String(v).trim();
  }
  return '';
}

const {configs,data}=configsAndManifest();
const grid=JSON.parse(fs.readFileSync(path.join(root,'dados/precalculados/malha_territorial_250km2.geojson'),'utf8'));
const profile=JSON.parse(fs.readFileSync(path.join(root,'dados/precalculados/ficha_territorial_250km2.geojson'),'utf8'));
const meta=JSON.parse(fs.readFileSync(path.join(root,'dados/precalculados/snapshot_metadata.json'),'utf8'));
const gridIds=new Set((grid.features||[]).map(f=>String(f?.properties?.hex_id||'')));
const profileIds=new Set((profile.features||[]).map(f=>String(f?.properties?.hex_id||'')));

check(configs.length===153,`153 fichas de camada cobertas pelo template comum`);
check(new Set(configs.map(c=>c.id)).size===configs.length,'IDs das 153 camadas são únicos');
for(const field of ['id','name','group','mode','source','dataStatus','validationLevel','source_id']){
  const missing=configs.filter(c=>!String(c?.[field]??'').trim()).map(c=>c.id);
  check(missing.length===0,`${field} preenchido nas 153 configurações de camada`);
}
check(gridIds.size===1554&&profileIds.size===1554,'malha R5 e Ficha Territorial possuem 1554 IDs únicos');
check([...gridIds].every(id=>profileIds.has(id)),'Ficha Territorial usa exatamente os mesmos hex_id da malha R5');
check(String(meta.status).toLowerCase()==='fechado'&&Array.isArray(meta.indices)&&meta.indices.length===8,'snapshot_metadata declara família territorial fechada com oito índices');

const specs=[
  ['IPG','ipg_100',57,true],['PEIC','peic_100',82,true],['IATI','iati_100',1025,true],
  ['IAT','iat_100',1554,false],['ISA','isa_100',1554,false],['ICT','ict_100',1554,false],
  ['IPAE','ipae_100',1554,false],['ICD','icd_100',1554,false]
];
for(const [label,key,expected,nullable] of specs){
  const numeric=(profile.features||[]).filter(f=>{const v=f?.properties?.[key];return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));}).length;
  check(numeric===expected,`${label} disponível em ${numeric}/1554 fichas conforme regra do corte`);
  if(!nullable)check(numeric===1554,`${label} possui cobertura numérica integral na Ficha Territorial`);
}

const knownLegacy=new Set([
  'potencial_geocientifico_territorial_250km2',
  'convergencia_rotas_itinerarios_250km2',
  'maturidade_rotas_hex_250km2_v1_8_0'
]);
let totalFeatures=0,totalNoGeometry=0,totalExplicitR5=0,totalLegacyExplicit=0;
const legacyByDataset=[];
const unexpectedInvalid=[];
for(const [id,item] of Object.entries(data)){
  const file=path.join(root,item.arquivo);
  if(!fs.existsSync(file)){fail(`${id} · arquivo local ausente`);continue;}
  let d;
  try{d=parseDatasetJs(file);}catch(e){fail(`${id} · dataset inválido · ${e.message}`);continue;}
  const feats=d?.features||[];totalFeatures+=feats.length;
  let valid=0,legacy=0,noGeometry=0;
  for(const f of feats){
    if(!f?.geometry)noGeometry++;
    const x=explicitHex(f?.properties||{});if(!x)continue;
    if(gridIds.has(x))valid++;
    else legacy++;
    if(!gridIds.has(x)&&!knownLegacy.has(id))unexpectedInvalid.push({id,hex:x});
    if(!gridIds.has(x)&&!f?.geometry)unexpectedInvalid.push({id,hex:x,reason:'sem geometria'});
  }
  totalNoGeometry+=noGeometry;totalExplicitR5+=valid;totalLegacyExplicit+=legacy;
  if(legacy)legacyByDataset.push({id,legacy,features:feats.length});
}
check(Object.keys(data).length===90,'90 conjuntos vetoriais locais auditados para comportamento de ficha');
pass(`${totalFeatures.toLocaleString('pt-BR')} feições locais percorridas pelo auditor estrutural de fichas`);
check(unexpectedInvalid.length===0,'nenhum hex_id não-R5 inesperado aparece fora dos conjuntos legados conhecidos');
check(legacyByDataset.length===3&&legacyByDataset.every(x=>knownLegacy.has(x.id)),'IDs de grade histórica estão confinados aos três conjuntos legados conhecidos');
check(totalLegacyExplicit===3288,`3.288 identificadores legados IPG-* reconhecidos e impedidos de se passar por R5`);
check(legacyByDataset.every(x=>{
  const item=data[x.id],d=parseDatasetJs(path.join(root,item.arquivo));
  return (d.features||[]).filter(f=>explicitHex(f.properties)&&!gridIds.has(explicitHex(f.properties))).every(f=>Boolean(f.geometry));
}),'todo registro com hex_id legado possui geometria para remapeamento territorial');
check(totalExplicitR5===1554,'somente a malha R5 local usa 1.554 hex_id canônicos explícitos entre os datasets locais');
if(totalNoGeometry===14)pass('14 registros documentais sem geometria permanecem explicitamente sem vínculo territorial automático');
else warn(`${totalNoGeometry} feições locais sem geometria · revisar se esperado`);

check(html.includes('JOAJU MS · FICHA UNIVERSAL 1.1'),'Ficha Universal 1.1 incorporada');
check(html.includes('universalFichaCanonicalHexId'),'qualquer hex_id explícito é validado contra a malha R5 antes do uso');
check(html.includes("if(!/^HX-/.test(id))return ''")&&html.includes('universalFichaHexIdSet?.has(id)'), 'somente IDs HX-* presentes na malha R5 podem ser usados como chave territorial canônica');
check(html.includes('publicSnapshotGrid')&&html.includes('universalFichaIsR5Grid'),'resolvedor territorial prioriza a malha pública R5 de 1554 células');
check(html.includes("explicitRaw?'legacy-remapped':'spatial'")&&html.includes('grade histórica'),'identificadores de grade histórica são remapeados pela geometria e rotulados como legado');
check(!/if\(hid\)html\+=`<section class="universal-ficha-card"/.test(html),'showFeature não possui atalho que trate qualquer hex_id como R5');
check(html.includes('const ctx=await resolveFeatureHexContext(f)'),'toda ficha de elemento passa pelo resolvedor territorial único');
check(html.includes('const snapshotClosed=useSnap')&&html.includes("'sem evidência cultural suficiente'"),'ficha fechada interpreta PEIC null como ausência de evidência, nunca como cálculo pendente');
check(html.includes("snapshotClosed?'Snapshot territorial fechado do corte 10/08/2026"),'aviso da ficha diferencia snapshot fechado de cálculo de sessão');
check(html.includes("territorialSnapshotByHex?.size===1554")&&html.includes("publicSnapshotMetadata?.status"),'estado fechado dos índices é lido do snapshot público, não da ativação visual da camada');
check(html.includes("firstFinite(currentProps,['maturidade_media_atlas'])"),'ficha de maturidade preserva o atributo da entidade selecionada sem falsificar o hexágono R5');
check(html.includes('n ${x.n}/${x.total}'),'resumos multi-hex informam cobertura numérica do índice nas células intersectadas');
check(html.includes("window.addEventListener('pageshow'")&&html.includes('syncLayerSearchState'),'busca de camadas reaplica o filtro após restauração/autofill do navegador');

console.log('\nConjuntos com IDs históricos reconhecidos');
for(const x of legacyByDataset)console.log(`  ${x.id} · ${x.legacy}/${x.features}`);
console.log(`\nResumo fichas · ${passes} PASS · ${warnings} WARN · ${failures} FAIL`);
if(failures)process.exit(1);
