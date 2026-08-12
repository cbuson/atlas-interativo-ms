import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const m=html.match(/const DATA_MANIFEST = (\{.*?\});\nwindow\.ATLAS_DATA/s);
const rm=html.match(/const RASTER_MANIFEST = (\{.*?\});/s);
if(!m||!rm)throw new Error('Manifestos não encontrados em index.html');

const manifest=JSON.parse(m[1]);
const rasterManifest=JSON.parse(rm[1]);
const marker='\n<script>\n\nconst DATA_MANIFEST = ';
const pos=html.indexOf(marker);
if(pos<0)throw new Error('Ponto de inserção não encontrado');

const version=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'),'utf8'));
const releaseCut=process.env.CORTE_DATA||version.package_date||'2026-08-10';

const closedFiles={
  potencial_geocientifico_territorial_250km2:'ipg_250km2.geojson',
  polos_estruturantes_itinerarios_culturais_250km2:'peic_250km2.geojson',
  articulacao_itinerarios_peic_rotas_250km2:'iati_250km2.geojson',
  iat_acessibilidade_territorial_250km2:'iat_250km2.geojson',
  isa_sensibilidade_ambiental_250km2:'isa_250km2.geojson',
  ict_capacidade_turistica_250km2:'ict_250km2.geojson',
  ipae_articulacao_educativa_250km2:'ipae_250km2.geojson',
  icd_cobertura_qualidade_dados_250km2:'icd_250km2.geojson'
};

function embeddedRasterManifest(){
  const out={};
  for(const [id,item] of Object.entries(rasterManifest)){
    const file=path.join(root,item.arquivo);
    if(!fs.existsSync(file))throw new Error(`Raster/KMZ ausente: ${item.arquivo}`);
    const ext=path.extname(file).toLowerCase();
    const mime=ext==='.png'?'image/png':
      ext==='.jpg'||ext==='.jpeg'?'image/jpeg':
      ext==='.kmz'?'application/vnd.google-earth.kmz':
      'application/octet-stream';
    out[id]={...item,arquivo:`data:${mime};base64,${fs.readFileSync(file).toString('base64')}`,embedded_singlefile:true};
  }
  return out;
}

function loadDataScripts(ids){
  return ids.map(id=>{
    const item=manifest[id];
    if(!item)throw new Error(`ID ausente do manifesto: ${id}`);
    const file=path.join(root,item.arquivo);
    if(!fs.existsSync(file))throw new Error(`Arquivo ausente: ${item.arquivo}`);
    return fs.readFileSync(file,'utf8').trim();
  }).join('\n');
}

function loadClosedResults(){
  const blocks=[];
  for(const [id,name] of Object.entries(closedFiles)){
    const file=path.join(root,'dados','precalculados',name);
    if(!fs.existsSync(file))throw new Error(`Produto fechado ausente: ${name}`);
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    if(data?.type!=='FeatureCollection'||!Array.isArray(data.features)||data.features.length!==1554){
      throw new Error(`Produto fechado inválido: ${name}`);
    }
    blocks.push(`window.ATLAS_DATA[${JSON.stringify(id)}]=${JSON.stringify(data)};`);
  }
  return {
    text:`/* JOAJU_CLOSED_RESULTS ${releaseCut}: ${Object.keys(closedFiles).join(',')} */\n${blocks.join('\n')}`,
    count:blocks.length
  };
}

function build(file,ids,label){
  const closed=loadClosedResults();
  const block=`\n<script>\n/* ${label}. Gerado automaticamente a partir de index.html. */\nwindow.ATLAS_DATA=window.ATLAS_DATA||{};\n${loadDataScripts(ids)}\n${closed.text}\n</script>`;
  let out=html.slice(0,pos)+block+html.slice(pos);
  out=out.replace(rm[0],`const RASTER_MANIFEST = ${JSON.stringify(embeddedRasterManifest())};`);
  fs.writeFileSync(path.join(root,file),out,'utf8');
  console.log(`${file}: ${ids.length} conjuntos locais + ${closed.count} índices fechados, ${Buffer.byteLength(out)} bytes`);
}

const all=Object.keys(manifest);
const fast=all.filter(id=>id!=='malha_itinerarios_250km2');

build(`JOAJU_MS_SINGLEFILE_FAST_${releaseCut}.html`,fast,'JOAJU MS SINGLEFILE FAST');
build(`JOAJU_MS_SINGLEFILE_SNAPSHOT_${releaseCut}.html`,all,'JOAJU MS SINGLEFILE SNAPSHOT');
