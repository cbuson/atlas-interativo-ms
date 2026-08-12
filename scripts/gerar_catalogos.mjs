import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

function extractConfigs(){
  const start=html.indexOf('const configs=');
  const end=html.indexOf('\n\n\nfunction log',start);
  if(start<0||end<0)throw new Error('Bloco de configurações não encontrado');
  const code=html.slice(start,end)+'\n;globalThis.__configs=configs;';
  const ctx={};vm.createContext(ctx);vm.runInContext(code,ctx,{timeout:5000});
  if(!Array.isArray(ctx.__configs))throw new Error('Configurações não avaliadas');
  return ctx.__configs;
}
function extractManifest(){
  const m=html.match(/const DATA_MANIFEST = (\{.*?\});\nwindow\.ATLAS_DATA/s);
  const r=html.match(/const RASTER_MANIFEST = (\{.*?\});/s);
  if(!m||!r)throw new Error('Manifestos não encontrados');
  return {data:JSON.parse(m[1]),raster:JSON.parse(r[1])};
}

function csvEscape(v){const s=String(v??'');return /[",\n\r]/.test(s)?`"${s.replaceAll('"','""')}"`:s;}
function writeCsv(file,headers,rows){
  const out=[headers.join(',')];
  for(const r of rows)out.push(headers.map(h=>csvEscape(r[h])).join(','));
  fs.writeFileSync(path.join(root,file),out.join('\n')+'\n','utf8');
}
const configs=extractConfigs();
const manifests=extractManifest();
const manifest=manifests.data, rasterManifest=manifests.raster;
const catalogHeaders=['id','name','group','subgroup','mode','dataStatus','validationLevel','source','originType','expectedGeometry','license','limitations','url','sourcePage','downloadUrl','captureDate','source_id','publicacao_status','snapshot_local','snapshot_arquivo'];
const catalogRows=configs.map(c=>({...c,snapshot_local:(manifest[c.id]||rasterManifest[c.id])?'sim':'não',snapshot_arquivo:manifest[c.id]?.arquivo||rasterManifest[c.id]?.arquivo||''}));
writeCsv('atlas_ms_v1.8.0-dev_catalogo_camadas.csv',catalogHeaders,catalogRows);
const sourceHeaders=['id','name','group','subgroup','source','url','sourcePage','downloadUrl','captureDate','source_id'];
writeCsv('atlas_ms_v1.8.0-dev_mapa_fontes_camadas.csv',sourceHeaders,configs);

const matrixHeaders=['id','name','mode','source','license_declarada','conteudo_local_no_pacote','modo_de_distribuicao','verificacao_juridica','observacao'];
const matrix=configs.map(c=>{
  const local=Boolean(manifest[c.id]||rasterManifest[c.id])||['embedded'].includes(c.mode);
  let dist='referência externa';
  if(local)dist='cópia local ou produto derivado incluído no pacote';
  else if(['xyzTile','arcgisMap','kmzRemote','cogRemote','wfs','arcgis','overpass','ibgezip','remotezip','officialzip','officialxlsx','tainacan','ckan','ibgeChoropleth'].includes(c.mode))dist='visualização, captura ou download a partir de fonte remota';
  else if(c.mode==='external')dist='referência ou importação externa';
  else if(c.mode==='derived')dist='produto derivado pelo código do projeto';
  return {
    id:c.id,name:c.name,mode:c.mode,source:c.source||'',license_declarada:c.license||'não declarada na configuração',
    conteudo_local_no_pacote:local?'sim':'não',modo_de_distribuicao:dist,
    verificacao_juridica:'não verificada juridicamente neste release',
    observacao:'A licença declarada e a proveniência devem ser conferidas na fonte primária antes de redistribuição externa.'
  };
});
writeCsv('docs/MATRIZ_LICENCAS_E_REDISTRIBUICAO.csv',matrixHeaders,matrix);
console.log(`Catálogos regenerados com ${configs.length} camadas. Vetores locais: ${Object.keys(manifest).length}. Rasters/KMZ locais: ${Object.keys(rasterManifest).length}.`);
