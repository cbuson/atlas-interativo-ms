import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const root=path.resolve(process.cwd());
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let pass=0,warn=0,fail=0;
const P=m=>{pass++;console.log(`PASS · ${m}`)};
const W=m=>{warn++;console.warn(`WARN · ${m}`)};
const F=m=>{fail++;console.error(`FAIL · ${m}`)};
const C=(cond,m)=>cond?P(m):F(m);

function extractObject(prefix){
 const k=html.indexOf(prefix);if(k<0)throw new Error(`${prefix} ausente`);let i=k+prefix.length;while(/\s/.test(html[i]))i++;
 let d=0,ins=false,esc=false;for(let j=i;j<html.length;j++){const c=html[j];if(ins){if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')ins=false;}else{if(c==='"')ins=true;else if(c==='{')d++;else if(c==='}'){d--;if(d===0)return JSON.parse(html.slice(i,j+1));}}}throw new Error(`${prefix} incompleto`);
}
function getConfigs(){const a=html.indexOf('const configs='),b=html.indexOf('\n\n\nfunction log',a),ctx={};if(a<0||b<0)throw new Error('configs ausente');vm.createContext(ctx);vm.runInContext(html.slice(a,b)+'\n;globalThis.__configs=configs;',ctx,{timeout:5000});return ctx.__configs;}
function executeDataset(file,id,expected){const txt=fs.readFileSync(file,'utf8'),ctx={window:{ATLAS_DATA:{}}};ctx.window.window=ctx.window;vm.createContext(ctx);vm.runInContext(txt,ctx,{timeout:15000});const d=ctx.window.ATLAS_DATA[id];if(!d?.features||d.type!=='FeatureCollection')throw new Error('arquivo não publicou FeatureCollection no ID esperado');if(d.features.length!==expected)throw new Error(`registros ${d.features.length} != manifesto ${expected}`);return d;}
function validGeometry(g){if(g===null)return true;if(!g||typeof g!=='object'||!g.type)return false;if(g.type==='GeometryCollection')return Array.isArray(g.geometries)&&g.geometries.every(validGeometry);let n=0,bad=0;const rec=x=>{if(Array.isArray(x)&&x.length>=2&&typeof x[0]==='number'&&typeof x[1]==='number'){n++;if(!Number.isFinite(x[0])||!Number.isFinite(x[1])||x[0]<-180||x[0]>180||x[1]<-90||x[1]>90)bad++;}else if(Array.isArray(x))x.forEach(rec)};rec(g.coordinates);return n>0&&bad===0;}

const configs=getConfigs(),dm=extractObject('const DATA_MANIFEST ='),rm=extractObject('const RASTER_MANIFEST =');
const byId=new Map(configs.map(c=>[c.id,c]));
C(configs.length===153,'153 configurações de camada presentes');
C(new Set(configs.map(c=>c.id)).size===153,'153 IDs de camada únicos');
for(const k of ['id','name','group','mode','source','dataStatus','validationLevel','source_id'])C(configs.every(c=>String(c?.[k]??'').trim()),`${k} preenchido nas 153 configurações`);

let totalFeatures=0,nullGeometry=0,badGeometry=0;
for(const [id,item] of Object.entries(dm)){
 const fp=path.join(root,item.arquivo);if(!fs.existsSync(fp)){F(`${id} · arquivo DATA_MANIFEST ausente`);continue;}
 try{const d=executeDataset(fp,id,item.registros);totalFeatures+=d.features.length;for(const f of d.features){if(!f.geometry)nullGeometry++;else if(!validGeometry(f.geometry))badGeometry++;}P(`${id} · ${d.features.length} registros carregáveis pelo manifesto`);}catch(e){F(`${id} · ${e.message}`)}
}
C(Object.keys(dm).length===90,'90 conjuntos DATA_MANIFEST verificados');
C(totalFeatures===50912,'50.912 feições locais percorridas');
C(badGeometry===0,'nenhuma geometria GeoJSON inválida nos conjuntos locais');
if(nullGeometry===14)P('14 registros documentais sem geometria preservados explicitamente');else W(`${nullGeometry} registros sem geometria · conferir relatório espacial`);

for(const [id,item] of Object.entries(rm)){
 const fp=path.join(root,item.arquivo);if(!fs.existsSync(fp)){F(`${id} · snapshot raster/KMZ ausente`);continue;}
 if(item.sha256){const h=crypto.createHash('sha256').update(fs.readFileSync(fp)).digest('hex');C(h===item.sha256,`${id} · SHA256 do snapshot raster/KMZ`);}else P(`${id} · snapshot raster/KMZ presente`);
}
C(Object.keys(rm).length===9,'9 snapshots raster/KMZ verificados');

const pre=configs.filter(c=>c.precomputedUrl);C(pre.length===12,'12 produtos precalculados declarados');
for(const c of pre){const fp=path.join(root,c.precomputedUrl);if(!fs.existsSync(fp)){F(`${c.id} · precalculado ausente`);continue;}try{const d=JSON.parse(fs.readFileSync(fp,'utf8'));C(d.type==='FeatureCollection'&&Array.isArray(d.features)&&d.features.length>0,`${c.id} · precalculado carregável · ${d.features?.length||0} registros`);}catch(e){F(`${c.id} · precalculado inválido · ${e.message}`)}}

const conflicts=pre.filter(c=>dm[c.id]);C(conflicts.length===1&&conflicts[0].id==='potencial_geocientifico_territorial_250km2','único conflito manifesto/precalculado é o fallback histórico do IPG');
C(html.includes('const closedPreferred=Boolean(cfg.precomputedUrl&&cfg.closedSnapshotDate)'),'loader dá prioridade explícita ao corte fechado');
C(html.indexOf('const closedPreferred=Boolean(cfg.precomputedUrl&&cfg.closedSnapshotDate)')<html.indexOf('if(window.ATLAS_DATA?.[id]?.features?.length'),'loader consulta o corte fechado antes de ATLAS_DATA legado');
C(html.includes('O fallback histórico não é usado no lugar do corte'),'loader bloqueia substituição silenciosa do corte fechado por legado');
C(html.includes("if(['arcgisMap','xyzTile','imageOverlay','kmzRemote','cogRemote'].includes(cfg.mode))return false"),'modos de visualização direta não são bloqueados como se exigissem preparação');
for(const id of ['mapa_altimetria_ms','mapa_bacias_uepgrh','mapa_disponibilidade_hidrica','mapa_macrozoneamento_zae']){const c=byId.get(id);C(c?.mode==='arcgisMap',`${id} · visualização ArcGIS Map diretamente ativável`);}


const profile=JSON.parse(fs.readFileSync(path.join(root,'dados/precalculados/ficha_territorial_250km2.geojson'),'utf8'));
const profileMap=new Map(profile.features.map(f=>[String(f.properties?.hex_id||''),f.properties||{}]));
C(profileMap.size===1554,'1.554 fichas territoriais R5 presentes');
for(const [name,key,expected] of [['IPG','ipg_100',57],['PEIC','peic_100',82],['IATI','iati_100',1025],['IAT','iat_100',1554],['ISA','isa_100',1554],['ICT','ict_100',1554],['IPAE','ipae_100',1554],['ICD','icd_100',1554]]){
 const file=path.join(root,`dados/precalculados/${name.toLowerCase()}_250km2.geojson`),d=JSON.parse(fs.readFileSync(file,'utf8'));let numeric=0,diff=0;for(const f of d.features){const id=String(f.properties?.hex_id||''),a=f.properties?.[key],b=profileMap.get(id)?.[key];if(a!==null&&a!==undefined&&a!==''&&Number.isFinite(Number(a)))numeric++;if((a===null)!==(b===null)||(a!==null&&Number(a)!==Number(b)))diff++;}C(d.features.length===1554&&numeric===expected&&diff===0,`${name} · produto e ficha coerentes · ${numeric}/1554 numéricos`);
}

C(html.includes('showLayerFicha(\'${cfg.id}\')'),'template comum oferece Ficha da camada');
C(html.includes('const ctx=await resolveFeatureHexContext(f)'),'toda ficha de elemento usa resolvedor territorial R5');
C(html.includes("if(!/^HX-/.test(id))return ''")&&html.includes('universalFichaHexIdSet?.has(id)'),'IDs históricos não são aceitos como R5');
C(fs.existsSync(path.join(root,'docs/BARRIDO_COMPLETO_CAMADAS_FICHAS_2026-08-12.csv')),'relatório CSV do barrido espacial presente');
C(fs.existsSync(path.join(root,'docs/BARRIDO_COMPLETO_CAMADAS_FICHAS_2026-08-12.json')),'relatório JSON do barrido espacial presente');

console.log(`\nResumo carga/fichas · ${pass} PASS · ${warn} WARN · ${fail} FAIL`);
if(fail)process.exit(1);
