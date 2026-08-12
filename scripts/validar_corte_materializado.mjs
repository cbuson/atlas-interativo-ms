import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(process.cwd());
const corte=process.env.CORTE_DATA||'2026-08-10';
if(!/^\d{4}-\d{2}-\d{2}$/.test(corte))throw new Error(`CORTE_DATA inválida: ${corte}`);
const slug=corte.replaceAll('-','_');
const dir=path.join(root,'resultados_indices',corte);
const ids=[
 'potencial_geocientifico_territorial_250km2',
 'polos_estruturantes_itinerarios_culturais_250km2',
 'articulacao_itinerarios_peic_rotas_250km2',
 'iat_acessibilidade_territorial_250km2',
 'isa_sensibilidade_ambiental_250km2',
 'ict_capacidade_turistica_250km2',
 'ipae_articulacao_educativa_250km2',
 'icd_cobertura_qualidade_dados_250km2'
];
const files=[...ids.map(x=>`${x}.geojson`),`perfil_territorial_fechado_${slug}.geojson`,`malha_itinerarios_snapshot_${slug}.geojson`];
const scoreKeys={potencial_geocientifico_territorial_250km2:'ipg_100',polos_estruturantes_itinerarios_culturais_250km2:'peic_100',articulacao_itinerarios_peic_rotas_250km2:'iati_100',iat_acessibilidade_territorial_250km2:'iat_100',isa_sensibilidade_ambiental_250km2:'isa_100',ict_capacidade_turistica_250km2:'ict_100',ipae_articulacao_educativa_250km2:'ipae_100',icd_cobertura_qualidade_dados_250km2:'icd_100'};
const fullCoverageIds=new Set(['iat_acessibilidade_territorial_250km2','isa_sensibilidade_ambiental_250km2','ict_capacidade_turistica_250km2','ipae_articulacao_educativa_250km2','icd_cobertura_qualidade_dados_250km2']);
const load=f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const f of files)if(!fs.existsSync(path.join(dir,f)))throw new Error(`Falta ${path.relative(root,path.join(dir,f))}`);
const grid=load(`malha_itinerarios_snapshot_${slug}.geojson`);
if(grid.type!=='FeatureCollection'||grid.features.length<1500)throw new Error('Malha materializada incompleta');
const ref=new Map();
for(const f of grid.features){
 const p=f.properties||{},id=String(p.hex_id||'');if(!id)throw new Error('Malha contém célula sem hex_id');if(ref.has(id))throw new Error(`hex_id duplicado na malha: ${id}`);
 for(const k of ['area_nominal_km2','area_efetiva_ms_km2','percentual_hexagono_em_ms','celula_borda_estadual'])if(p[k]===undefined||p[k]===null||p[k]==='')throw new Error(`Malha sem ${k} em ${id}`);
 ref.set(id,JSON.stringify(f.geometry));
}
for(const f of files.filter(x=>x!==`malha_itinerarios_snapshot_${slug}.geojson`)){
 const d=load(f);if(d.type!=='FeatureCollection'||d.features.length!==ref.size)throw new Error(`${f} diverge da malha em número de células`);
 const seen=new Set();for(const x of d.features){const id=String(x?.properties?.hex_id||'');if(!ref.has(id))throw new Error(`${f} possui hex_id inválido ${id}`);if(seen.has(id))throw new Error(`${f} duplica ${id}`);seen.add(id);if(JSON.stringify(x.geometry)!==ref.get(id))throw new Error(`${f} possui geometria divergente em ${id}`);}
 const productId=ids.find(id=>f===`${id}.geojson`);
 if(productId){const key=scoreKeys[productId];const finite=d.features.filter(x=>Number.isFinite(Number(x?.properties?.[key]))).length;if(!finite)throw new Error(`${f} não contém valores materiais em ${key}`);if(fullCoverageIds.has(productId)&&finite!==ref.size)throw new Error(`${f} contém ${finite}/${ref.size} valores válidos em ${key}`);}
}
const mf=path.join(dir,`manifesto_corte_${slug}.json`);if(!fs.existsSync(mf))throw new Error('Manifesto do corte ausente');
const manifest=JSON.parse(fs.readFileSync(mf,'utf8'));if(manifest.corte_dados!==corte||manifest.status!=='fechado'||manifest.n_hexagonos!==ref.size)throw new Error('Manifesto do corte inconsistente');
for(const id of ids){if(!(id in (manifest.valores_materializados_por_indice||{})))throw new Error(`Manifesto sem contagem materializada para ${id}`);if(Number(manifest.valores_materializados_por_indice[id])<1)throw new Error(`Manifesto registra índice vazio: ${id}`);}
for(const [f,expected] of Object.entries(manifest.sha256||{})){const actual=digest(fs.readFileSync(path.join(dir,f)));if(actual!==expected)throw new Error(`SHA-256 divergente em ${f}`);}
console.log(`PASS: corte ${corte} validado com ${ref.size} hexágonos e ${files.length} produtos coerentes.`);
