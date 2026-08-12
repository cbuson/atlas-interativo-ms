import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const strictAll=process.env.STRICT_ALL_LAYERS==='1';
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let pass=0,warn=0,fail=0;
const ok=m=>{pass++;console.log('PASS ',m)}, wa=m=>{warn++;console.warn('WARN ',m)}, no=m=>{fail++;console.error('FAIL ',m)};
const start=html.indexOf('const configs='),end=html.indexOf('\n\n\nfunction log',start);if(start<0||end<0)throw new Error('configs ausentes');
const ctx={};vm.createContext(ctx);vm.runInContext(html.slice(start,end)+'\n;globalThis.__configs=configs;',ctx,{timeout:5000});const configs=ctx.__configs;
const mm=html.match(/const DATA_MANIFEST = (\{.*?\});\nwindow\.ATLAS_DATA/s),rm=html.match(/const RASTER_MANIFEST = (\{.*?\});/s);if(!mm||!rm)throw new Error('manifestos ausentes');
const data=JSON.parse(mm[1]),raster=JSON.parse(rm[1]);
const packaged=id=>Boolean(data[id]||raster[id]);
for(const [id,item] of Object.entries(data)){const p=path.join(root,item.arquivo);if(!fs.existsSync(p))no(`${id} aponta arquivo vetorial ausente ${item.arquivo}`);else ok(`${id} snapshot vetorial presente`)}
for(const [id,item] of Object.entries(raster)){const p=path.join(root,item.arquivo);if(!fs.existsSync(p))no(`${id} aponta raster/KMZ ausente ${item.arquivo}`);else ok(`${id} snapshot ${item.kind||'raster'} presente`)}
const publicLayers=configs.filter(c=>!c.hiddenFromPanel&&c.mode!=='import');
const refs=[],docsOnly=[],derived=[],missing=[],ready=[];
for(const c of publicLayers){
  if(c.mode==='derived'){derived.push(c);continue}
  if(c.documentationOnly&&!packaged(c.id)){docsOnly.push(c);continue}
  if(c.mode==='external'&&c.referenceOnly&&!packaged(c.id)){refs.push(c);continue}
  if(packaged(c.id)){ready.push(c);continue}
  missing.push(c);
}
ok(`${ready.length} camadas públicas possuem conteúdo local materializado`);
if(derived.length)wa(`${derived.length} camadas derivadas dependem do corte de índices e são auditadas separadamente`);
for(const c of missing)no(`${c.id} é camada pública operacional sem snapshot local`);
for(const c of docsOnly)wa(`${c.id} é referência metodológica/documental e não é tratada como camada cartográfica ativável`);
for(const c of refs){if(strictAll)no(`${c.id} continua apenas como referência externa e o modo STRICT_ALL_LAYERS exige integração local`);else wa(`${c.id} continua como referência externa sem conteúdo cartográfico local`)}
const visibleCheckboxCandidates=publicLayers.filter(c=>c.mode!=='derived'&&!(c.mode==='external'&&c.referenceOnly&&!packaged(c.id)));
const missingCheckbox=visibleCheckboxCandidates.filter(c=>!packaged(c.id));
if(!missingCheckbox.length)ok('toda camada pública ativável possui snapshot local');else no(`${missingCheckbox.length} camada(s) ativável(is) ainda dependem da rede`);
console.log(`\nResumo snapshots: ${pass} PASS, ${warn} WARN, ${fail} FAIL`);
console.log(`Camadas públicas: ${publicLayers.length} · prontas locais: ${ready.length} · derivadas: ${derived.length} · referências pendentes: ${refs.length} · referências documentais: ${docsOnly.length} · operacionais sem snapshot: ${missing.length}`);
if(fail)process.exit(1);
