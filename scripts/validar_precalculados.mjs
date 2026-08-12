import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(process.cwd());
const dir=path.join(root,'dados','precalculados');

const expected=[
  'malha_territorial_250km2.geojson',
  'ipg_250km2.geojson',
  'peic_250km2.geojson',
  'iati_250km2.geojson',
  'iat_250km2.geojson',
  'isa_250km2.geojson',
  'ict_250km2.geojson',
  'ipae_250km2.geojson',
  'icd_250km2.geojson',
  'ficha_territorial_250km2.geojson',
  'snapshot_metadata.json'
];

const scoreRules={
  'ipg_250km2.geojson':{
    key:'ipg_100',
    allowNull:true,
    nullReason:['classe_ipg','status_calculo','status_valor','interpretacao','regra_sem_evidencia']
  },
  'peic_250km2.geojson':{
    key:'peic_100',
    allowNull:true,
    nullReason:['classe_estruturacao','status_calculo','elegivel_peic','interpretacao']
  },
  'iati_250km2.geojson':{
    key:'iati_100',
    allowNull:true,
    nullReason:['classe_iati','classe_articulacao','regra_sem_evidencia','suporte_cultural_nao_sensivel']
  },
  'iat_250km2.geojson':{
    key:'iat_100',
    allowNull:false
  },
  'isa_250km2.geojson':{
    key:'isa_100',
    allowNull:false
  },
  'ict_250km2.geojson':{
    key:'ict_100',
    allowNull:false
  },
  'ipae_250km2.geojson':{
    key:'ipae_100',
    allowNull:false
  },
  'icd_250km2.geojson':{
    key:'icd_100',
    allowNull:false
  }
};

function sha(file){
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function read(name){
  const file=path.join(dir,name);
  if(!fs.existsSync(file))throw new Error(`Falta ${name}`);
  return JSON.parse(fs.readFileSync(file,'utf8'));
}

function collectionMap(fc,name){
  if(fc?.type!=='FeatureCollection'||!Array.isArray(fc.features)){
    throw new Error(`${name} não é FeatureCollection`);
  }
  const map=new Map();
  for(const f of fc.features){
    const id=String(f?.properties?.hex_id||'');
    if(!id)throw new Error(`${name} contém célula sem hex_id`);
    if(map.has(id))throw new Error(`${name} contém hex_id duplicado ${id}`);
    map.set(id,f);
  }
  return map;
}

function canonicalGeometry(geometry){
  return JSON.stringify(geometry??null);
}

function isNullValue(value){
  return value===null||value===undefined||value==='';
}

function hasNullReason(props,fields=[]){
  return fields.some(k=>{
    const v=props?.[k];
    return v!==null&&v!==undefined&&String(v).trim()!=='';
  });
}

for(const f of expected){
  if(!fs.existsSync(path.join(dir,f))){
    throw new Error(`Snapshot incompleto. Falta ${f}`);
  }
}

const grid=read('malha_territorial_250km2.geojson');
const gridMap=collectionMap(grid,'malha');

if(gridMap.size<1500){
  throw new Error(`Malha contém somente ${gridMap.size} células`);
}

const summaries=[];

for(const [file,rule] of Object.entries(scoreRules)){
  const fc=read(file);
  const map=collectionMap(fc,file);

  if(map.size!==gridMap.size){
    throw new Error(`${file} contém ${map.size} células e a malha ${gridMap.size}`);
  }

  let finite=0;
  let nulls=0;

  for(const [id,gridFeature] of gridMap){
    const f=map.get(id);

    if(!f){
      throw new Error(`${file} não contém o hex_id ${id}`);
    }

    if(canonicalGeometry(f.geometry)!==canonicalGeometry(gridFeature.geometry)){
      throw new Error(`${file} possui geometria divergente da malha em ${id}`);
    }

    const props=f.properties||{};
    const raw=props[rule.key];

    if(isNullValue(raw)){
      if(!rule.allowNull){
        throw new Error(`${file} possui valor nulo não permitido em ${rule.key} · ${id}`);
      }

      if(!hasNullReason(props,rule.nullReason)){
        throw new Error(`${file} possui valor nulo sem justificativa documental em ${id}`);
      }

      nulls++;
      continue;
    }

    const value=Number(raw);

    if(!Number.isFinite(value)||value<0||value>100){
      throw new Error(`${file} possui valor inválido em ${rule.key} · ${id} · ${raw}`);
    }

    finite++;
  }

  if(finite<1){
    throw new Error(`${file} não contém nenhum valor numérico válido em ${rule.key}`);
  }

  if(!rule.allowNull&&finite!==gridMap.size){
    throw new Error(`${file} possui ${finite}/${gridMap.size} valores válidos em ${rule.key}`);
  }

  summaries.push({
    file,
    key:rule.key,
    finite,
    nulls,
    policy:rule.allowNull?'nulos documentados permitidos':'cobertura numérica integral'
  });
}

const ficha=read('ficha_territorial_250km2.geojson');
const fichaMap=collectionMap(ficha,'ficha');

if(fichaMap.size!==gridMap.size){
  throw new Error(`Ficha contém ${fichaMap.size} células e a malha ${gridMap.size}`);
}

for(const [id,gridFeature] of gridMap){
  const f=fichaMap.get(id);

  if(!f){
    throw new Error(`Ficha não contém o hex_id ${id}`);
  }

  if(canonicalGeometry(f.geometry)!==canonicalGeometry(gridFeature.geometry)){
    throw new Error(`Ficha possui geometria divergente da malha em ${id}`);
  }
}

const required=[
  'hex_id',
  'area_nominal_km2',
  'area_efetiva_ms_km2',
  'municipio_principal',
  'municipios_intersectados',
  'percentuais_municipais',
  'ipg_100',
  'peic_100',
  'iati_100',
  'iat_100',
  'isa_100',
  'ict_100',
  'ipae_100',
  'icd_100',
  'classe_ipg',
  'classe_peic',
  'classe_iati',
  'classe_iat',
  'classe_isa',
  'classe_ict',
  'classe_ipae',
  'classe_icd',
  'fontes',
  'data_corte',
  'versao_metodo',
  'qualidade_dados',
  'limitacoes'
];

for(const f of ficha.features){
  for(const k of required){
    if(!(k in (f.properties||{}))){
      throw new Error(`Ficha ${f.properties?.hex_id||'?'} sem campo ${k}`);
    }
  }
}

const meta=read('snapshot_metadata.json');

if(meta.status!=='fechado'){
  throw new Error('snapshot_metadata.json não está fechado');
}

if(Number(meta.n_hexagonos)!==gridMap.size){
  throw new Error('n_hexagonos do metadata diverge da malha');
}

for(const file of expected.filter(x=>x.endsWith('.geojson'))){
  const actual=sha(path.join(dir,file));
  if(meta.sha256?.[file]!==actual){
    throw new Error(`SHA256 divergente em ${file}`);
  }
}

console.log('');
console.log(`PASS · snapshot precalculado completo · ${gridMap.size} hexágonos`);

for(const s of summaries){
  console.log(
    `OK · ${s.file} · ${s.finite} numéricos · ${s.nulls} nulos · ${s.policy}`
  );
}

console.log('OK · identidade de hex_id validada');
console.log('OK · identidade geométrica validada');
console.log('OK · ficha territorial validada');
console.log('OK · SHA256 validado');
