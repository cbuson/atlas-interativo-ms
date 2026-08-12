import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const root = path.resolve(process.cwd());
const dataDir = path.join(root, 'dados');
const corte = process.env.CORTE_DATA || '2026-08-10';
if (!/^\d{4}-\d{2}-\d{2}$/.test(corte)) throw new Error(`CORTE_DATA inválida: ${corte}`);
const corteSlug = corte.replaceAll('-', '_');
const outDir = path.join(root, 'resultados_indices', corte);
const precomputedDir = path.join(root, 'dados', 'precalculados');
const sourceDir = path.join(root, `capturas_fontes_${corteSlug}`);
const baseUrl = process.env.ATLAS_URL || 'http://127.0.0.1:8000/index.html';
const expectedMin = Number(process.env.MIN_HEX || 1500);
const allowOverwrite = process.env.ALLOW_OVERWRITE === '1';
const releaseCut = '2026-08-10';

const ids = [
  'potencial_geocientifico_territorial_250km2',
  'polos_estruturantes_itinerarios_culturais_250km2',
  'articulacao_itinerarios_peic_rotas_250km2',
  'iat_acessibilidade_territorial_250km2',
  'isa_sensibilidade_ambiental_250km2',
  'ict_capacidade_turistica_250km2',
  'ipae_articulacao_educativa_250km2',
  'icd_cobertura_qualidade_dados_250km2'
];

const scoreKeys = {
  potencial_geocientifico_territorial_250km2: 'ipg_100',
  polos_estruturantes_itinerarios_culturais_250km2: 'peic_100',
  articulacao_itinerarios_peic_rotas_250km2: 'iati_100',
  iat_acessibilidade_territorial_250km2: 'iat_100',
  isa_sensibilidade_ambiental_250km2: 'isa_100',
  ict_capacidade_turistica_250km2: 'ict_100',
  ipae_articulacao_educativa_250km2: 'ipae_100',
  icd_cobertura_qualidade_dados_250km2: 'icd_100'
};

const publicAliases = {
  potencial_geocientifico_territorial_250km2: 'ipg_250km2.geojson',
  polos_estruturantes_itinerarios_culturais_250km2: 'peic_250km2.geojson',
  articulacao_itinerarios_peic_rotas_250km2: 'iati_250km2.geojson',
  iat_acessibilidade_territorial_250km2: 'iat_250km2.geojson',
  isa_sensibilidade_ambiental_250km2: 'isa_250km2.geojson',
  ict_capacidade_turistica_250km2: 'ict_250km2.geojson',
  ipae_articulacao_educativa_250km2: 'ipae_250km2.geojson',
  icd_cobertura_qualidade_dados_250km2: 'icd_250km2.geojson'
};
const indexPrefixes = {
  potencial_geocientifico_territorial_250km2: 'ipg',
  polos_estruturantes_itinerarios_culturais_250km2: 'peic',
  articulacao_itinerarios_peic_rotas_250km2: 'iati',
  iat_acessibilidade_territorial_250km2: 'iat',
  isa_sensibilidade_ambiental_250km2: 'isa',
  ict_capacidade_turistica_250km2: 'ict',
  ipae_articulacao_educativa_250km2: 'ipae',
  icd_cobertura_qualidade_dados_250km2: 'icd'
};
const frozenFormulas = {
  IPG: '40% diversidade geocientífica + 35% riqueza + 25% continuidade territorial',
  PEIC: '45% diversidade cultural + 25% equilíbrio + 20% riqueza cultural + 10% continuidade territorial',
  IATI: '70% PEIC + 30% convergência de rotas',
  IAT: '30% rede pavimentada + 20% rede vicinal + 25% proximidade à rede pavimentada + 15% proximidade a núcleo urbano + 10% multimodalidade ferroviária e aérea',
  ISA: '25% unidades de conservação + 25% zonas de amortecimento + 25% corredores ecológicos + 25% áreas de uso restrito',
  ICT: '50% hospedagem formal + 50% serviços Cadastur',
  IPAE: '25% escolas + 25% museus e memória + 25% ensino superior + 25% bibliotecas e arquivos. Cada componente usa 70% densidade + 30% proximidade',
  ICD: '20% completude + 20% atualidade + 20% adequação posicional + 20% completude temática + 20% rastreabilidade'
};

function assertFreshTarget(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir).filter(x => !/^README/i.test(x));
  if (entries.length && !allowOverwrite) {
    throw new Error(`O corte ${corte} já possui arquivos em ${path.relative(root, dir)}. Use uma nova data ou ALLOW_OVERWRITE=1 de forma explícita.`);
  }
}
assertFreshTarget(outDir);
assertFreshTarget(sourceDir);
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(sourceDir, { recursive: true });
fs.mkdirSync(precomputedDir, { recursive: true });

function sha256Text(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function canonicalGeometry(g) { return JSON.stringify(g ?? null); }
function writeJson(file, value, pretty = false) {
  fs.writeFileSync(file, JSON.stringify(value, null, pretty ? 2 : 0), 'utf8');
}
function writeAtlasJs(id, data, file) {
  fs.writeFileSync(file, `window.ATLAS_DATA=window.ATLAS_DATA||{};\nwindow.ATLAS_DATA[${JSON.stringify(id)}]=${JSON.stringify(data)};\n`, 'utf8');
}
function validateCollection(id, data, min = expectedMin) {
  if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error(`${id} não retornou FeatureCollection`);
  if (data.features.length < min) throw new Error(`${id} retornou ${data.features.length} células, mínimo esperado ${min}`);
  const idsSeen = new Set();
  for (const f of data.features) {
    const hid = String(f?.properties?.hex_id || '');
    if (!hid) throw new Error(`${id} contém célula sem hex_id`);
    if (idsSeen.has(hid)) throw new Error(`${id} contém hex_id duplicado: ${hid}`);
    idsSeen.add(hid);
    if (!['Polygon', 'MultiPolygon'].includes(f?.geometry?.type)) throw new Error(`${id} contém geometria inválida em ${hid}`);
  }
}
function validateRawResult(id, data, master) {
  validateCollection(id, data, 1);
  const scoreKey = scoreKeys[id];
  const finite = (data.features || []).filter(f => Number.isFinite(Number(f?.properties?.[scoreKey]))).length;
  if (!finite) throw new Error(`${id} não contém nenhum valor materializado em ${scoreKey}`);
  const fullCoverageIds = new Set([
    'iat_acessibilidade_territorial_250km2',
    'isa_sensibilidade_ambiental_250km2',
    'ict_capacidade_turistica_250km2',
    'ipae_articulacao_educativa_250km2',
    'icd_cobertura_qualidade_dados_250km2'
  ]);
  if (fullCoverageIds.has(id)) {
    if (data.features.length !== master.features.length) throw new Error(`${id} retornou ${data.features.length} células; esperado ${master.features.length}`);
    if (finite !== master.features.length) throw new Error(`${id} contém ${finite}/${master.features.length} valores válidos em ${scoreKey}`);
  }
  return finite;
}

function validateMasterGrid(grid) {
  validateCollection('malha_territorial_mestra', grid);
  for (const f of grid.features) {
    const p = f.properties || {};
    for (const k of ['area_nominal_km2','area_efetiva_ms_km2','percentual_hexagono_em_ms','celula_borda_estadual']) {
      if (p[k] === undefined || p[k] === null || p[k] === '') throw new Error(`Malha mestra sem ${k} em ${p.hex_id}`);
    }
  }
}
function alignToMaster(id, data, master) {
  const byId = new Map((data?.features || []).map(f => [String(f?.properties?.hex_id || ''), f]));
  const scoreKey = scoreKeys[id];
  const features = master.features.map(m => {
    const hid = String(m.properties.hex_id);
    const src = byId.get(hid);
    const props = { ...(m.properties || {}), ...(src?.properties || {}) };
    if (!src && scoreKey) props[scoreKey] = null;
    props.hex_id = hid;
    const scoreValue = scoreKey ? src?.properties?.[scoreKey] : null;
    props.status_materializacao = Number.isFinite(Number(scoreValue)) ? 'materializado_com_valor' : 'sem_evidencia_materializada';
    props.corte_dados = corte;
    return { type: 'Feature', geometry: m.geometry, properties: props };
  });
  return {
    type: 'FeatureCollection',
    features,
    atlas_metadata: {
      ...(data?.atlas_metadata || {}),
      corte_joaju_ms: corte,
      produto: 'resultado territorial materializado fora do dispositivo do usuário',
      materializacao: 'GitHub Actions com o mesmo código metodológico da aplicação',
      consulta_publica: 'estática, sem recálculo no navegador',
      malha_referencia: 'Malha territorial mestra recortada no limite oficial de Mato Grosso do Sul',
      n_hexagonos: features.length
    }
  };
}
function validateSameGrid(reference, id, data) {
  validateCollection(id, data, reference.features.length);
  if (data.features.length !== reference.features.length) throw new Error(`${id} diverge em número de células`);
  const refById = new Map(reference.features.map(f => [String(f.properties.hex_id), canonicalGeometry(f.geometry)]));
  for (const f of data.features) {
    const hid = String(f.properties.hex_id);
    if (!refById.has(hid)) throw new Error(`${id} possui hex_id fora da malha mestra: ${hid}`);
    if (canonicalGeometry(f.geometry) !== refById.get(hid)) throw new Error(`${id} possui geometria divergente em ${hid}`);
  }
}
function uniqueTextValues(props, matcher) {
  const out=[];
  for (const [k,v] of Object.entries(props||{})) {
    if (!matcher.test(k) || v===null || v===undefined || v==='') continue;
    for (const x of (Array.isArray(v)?v:[v])) {
      const t=String(x).trim(); if (t && !out.includes(t)) out.push(t);
    }
  }
  return out;
}
function classFor(prefix, props) {
  const candidates={ipg:['classe_ipg'],peic:['classe_peic','classe_estruturacao'],iati:['classe_iati','classe_articulacao'],iat:['classe_iat'],isa:['classe_isa'],ict:['classe_ict'],ipae:['classe_ipae'],icd:['classe_icd']}[prefix]||[];
  for (const k of candidates) if (props?.[k]!==undefined && props?.[k]!==null && props?.[k]!=='') return props[k];
  return null;
}
function indexQuality(prefix, props) {
  const pick=(suffixes)=>{for(const x of suffixes){const k=`${prefix}_${x}`,v=props?.[k];if(v!==undefined&&v!==null&&v!=='')return v;}return null;};
  return {cobertura_pct:pick(['cobertura_pct','completude_pct']),atualidade_pct:pick(['atualidade_pct']),posicional_pct:pick(['posicional_pct','adequacao_posicional_pct']),tematico_pct:pick(['tematico_pct','completude_tematica_pct']),rastreabilidade_pct:pick(['rastreabilidade_pct'])};
}
async function retry(label, fn, attempts = 2) {
  let last;
  for (let n = 1; n <= attempts; n++) {
    try { console.log(`\n[${label}] tentativa ${n}/${attempts}`); return await fn(); }
    catch (e) { last = e; console.error(`[${label}] ${e?.message || e}`); if (n < attempts) await new Promise(r => setTimeout(r, 5000 * n)); }
  }
  throw last;
}

async function launchChromiumForMaterialization(){
  try{return await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});}
  catch(first){
    const candidates=process.platform==='win32'?[
      path.join(process.env.PROGRAMFILES||'C:/Program Files','Microsoft','Edge','Application','msedge.exe'),
      path.join(process.env['PROGRAMFILES(X86)']||'C:/Program Files (x86)','Microsoft','Edge','Application','msedge.exe'),
      path.join(process.env.PROGRAMFILES||'C:/Program Files','Google','Chrome','Application','chrome.exe'),
      path.join(process.env.LOCALAPPDATA||'','Google','Chrome','Application','chrome.exe')
    ]:[];
    for(const executablePath of candidates){if(!executablePath||!fs.existsSync(executablePath))continue;try{console.log(`Playwright Chromium não encontrado. Usando navegador do sistema · ${executablePath}`);return await chromium.launch({headless:true,executablePath,args:['--disable-dev-shm-usage']});}catch{}}
    throw new Error(`Não foi possível iniciar Chromium, Edge ou Chrome para materialização. ${first.message||first}`);
  }
}
const browser = await launchChromiumForMaterialization();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(180000);
page.setDefaultNavigationTimeout(180000);
page.on('console', msg => { const t = msg.text(); if (/Falha|erro|Índice|territorial|captur|Cálculo|Malha|Cadastur|INEP|Museus/i.test(t)) console.log(`[browser] ${t}`); });
page.on('pageerror', e => console.error(`[pageerror] ${e.message}`));

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.calculateIAT250 === 'function' && typeof window.collectTerritorialIndicesData === 'function' && typeof window.loadMasterTerritorialGrid250 === 'function', null, { timeout: 180000 });

  const master = await retry('MALHA OFICIAL', () => page.evaluate(() => window.loadMasterTerritorialGrid250()), 2);
  validateMasterGrid(master);

  const jobs = [
    ['IPG', () => page.evaluate(() => window.calculateDerived('potencial_geocientifico_territorial_250km2'))],
    ['PEIC', () => page.evaluate(() => window.calculateDerived('polos_estruturantes_itinerarios_culturais_250km2'))],
    ['IATI', () => page.evaluate(() => window.calculateDerived('articulacao_itinerarios_peic_rotas_250km2'))],
    ['IAT', () => page.evaluate(() => window.calculateIAT250())],
    ['ISA', () => page.evaluate(() => window.calculateISA250())],
    ['ICT', () => page.evaluate(() => window.calculateICT250())],
    ['IPAE', () => page.evaluate(() => window.calculateIPAE250())],
    ['ICD', () => page.evaluate(() => window.calculateICD250())]
  ];
  for (const [label, job] of jobs) await retry(label, job, label === 'IPAE' ? 3 : 2);

  const materializationSources = await page.evaluate(() => window.collectMaterializationSources());
  const sourceManifest = { projeto: 'JOAJU MS', corte_dados: corte, fontes: {}, hex_municipios: null };
  for (const [id, item] of Object.entries(materializationSources.sources || {})) {
    const raw = Buffer.from(JSON.stringify(item.data), 'utf8');
    const gz = zlib.gzipSync(raw, { level: 9 });
    const file = `${id}.geojson.gz`;
    fs.writeFileSync(path.join(sourceDir, file), gz);
    sourceManifest.fontes[id] = { ...(item.config || {}), arquivo: file, registros: item.data?.features?.length || 0, bytes_json: raw.length, bytes_gzip: gz.length, sha256_json: sha256Text(raw), atlas_metadata: item.data?.atlas_metadata || null };
  }
  if (materializationSources.hexMunicipalCrosswalk) {
    const cross = { metadata: materializationSources.hexMunicipalMetadata || null, rows: materializationSources.hexMunicipalCrosswalk };
    const raw = Buffer.from(JSON.stringify(cross), 'utf8');
    const gz = zlib.gzipSync(raw, { level: 9 });
    const file = `hex_municipios_${corteSlug}.json.gz`;
    fs.writeFileSync(path.join(sourceDir, file), gz);
    sourceManifest.hex_municipios = { arquivo: file, bytes_json: raw.length, bytes_gzip: gz.length, sha256_json: sha256Text(raw), metadata: cross.metadata };
  }
  writeJson(path.join(sourceDir, `manifesto_fontes_${corteSlug}.json`), sourceManifest, true);

  const rawAll = await page.evaluate(() => window.collectTerritorialIndicesData());
  const all = {};
  const scoreCounts = {};
  for (const id of ids) {
    scoreCounts[id] = validateRawResult(id, rawAll[id], master);
    all[id] = alignToMaster(id, rawAll[id], master);
    validateSameGrid(master, id, all[id]);
    writeJson(path.join(outDir, `${id}.geojson`), all[id]);
    writeJson(path.join(precomputedDir, publicAliases[id]), all[id]);
  }

  const maps = Object.fromEntries(ids.map(id => [id, new Map(all[id].features.map(f => [String(f.properties.hex_id), f]))]));
  const mergedFeatures = master.features.map(m => {
    const hid = String(m.properties.hex_id);
    const props = { ...(m.properties || {}) };
    for (const id of ids) {
      const x = maps[id].get(hid);
      if (x?.properties) Object.assign(props, x.properties);
    }
    const inter=Array.isArray(props.municipios_intersecoes)?props.municipios_intersecoes:[];
    props.area_nominal_km2 = Number(props.area_nominal_km2);
    props.area_efetiva_ms_km2 = Number(props.area_efetiva_ms_km2 ?? props.area_dentro_ms_km2);
    props.municipio_principal = props.municipio_principal || inter[0]?.municipio || null;
    props.municipios_intersectados = inter.length ? inter.map(x=>x.municipio).filter(Boolean) : (Array.isArray(props.municipios_intersectados)?props.municipios_intersectados:[]);
    props.percentuais_municipais = inter.map(x=>({municipio:x.municipio||null,codigo_ibge:x.codigo_ibge||null,percentual:Number(x.pct_area_ms)}));
    for (const [id,prefix] of Object.entries(indexPrefixes)) props[`classe_${prefix}`]=classFor(prefix,maps[id].get(hid)?.properties||props);
    props.fontes = uniqueTextValues(props,/^font(es|e)(_|$)/i);
    props.data_corte = corte;
    props.versao_metodo = '1.8.0';
    props.qualidade_dados = Object.fromEntries(Object.entries(indexPrefixes).map(([id,prefix])=>[prefix.toUpperCase(),indexQuality(prefix,maps[id].get(hid)?.properties||props)]));
    props.limitacoes = uniqueTextValues(props,/(limit|nota_|alerta|ressalva)/i);
    props.status_snapshot = 'fechado';
    props.corte_dados = corte;
    props.familia_indices_materializada = 'IPG | PEIC | IATI | IAT | ISA | ICT | IPAE | ICD';
    props.consulta_sem_recalculo = 'Sim';
    return { type: 'Feature', geometry: m.geometry, properties: props };
  });
  const profileId = `perfil_territorial_fechado_${corteSlug}`;
  const profile = {
    type: 'FeatureCollection',
    name: `perfil_territorial_fechado_joaju_${corteSlug}`,
    features: mergedFeatures,
    atlas_metadata: {
      produto: 'Perfil territorial fechado por hexágono JOAJU MS',
      corte_dados: corte,
      status: 'fechado',
      n_hexagonos: mergedFeatures.length,
      indices: ids,
      fonte_geometria: 'Malha territorial mestra recortada no limite oficial de Mato Grosso do Sul usada pelos cálculos',
      regra_consulta: 'A abertura da camada não executa captura, interseção ou recálculo',
      atualizacao: 'Somente por workflow de materialização ou ação avançada explicitamente solicitada'
    }
  };
  validateSameGrid(master, profileId, profile);
  writeAtlasJs(profileId, profile, path.join(dataDir, `${profileId}.js`));
  writeJson(path.join(outDir, `${profileId}.geojson`), profile);
  writeJson(path.join(precomputedDir, 'ficha_territorial_250km2.geojson'), profile);

  const gridId = `malha_itinerarios_snapshot_${corteSlug}`;
  const grid = {
    type: 'FeatureCollection',
    name: gridId,
    features: master.features.map(f => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        hex_id: f.properties.hex_id,
        q: f.properties.q,
        r: f.properties.r,
        area_nominal_km2: f.properties.area_nominal_km2,
        area_efetiva_ms_km2: f.properties.area_efetiva_ms_km2,
        percentual_hexagono_em_ms: f.properties.percentual_hexagono_em_ms,
        celula_borda_estadual: f.properties.celula_borda_estadual,
        fonte_limite: f.properties.fonte_limite,
        status_snapshot: 'fechado',
        corte_dados: corte
      }
    })),
    atlas_metadata: {
      produto: 'Malha hexagonal de análise de itinerários ajustada ao limite de Mato Grosso do Sul',
      corte_dados: corte,
      status: 'fechado',
      n_hexagonos: master.features.length,
      regra: 'Geometria idêntica à utilizada na materialização dos índices'
    }
  };
  validateSameGrid(master, gridId, grid);
  // Para o corte público desta versão, o arquivo datado coincide com o
  // ponteiro declarado em DATA_MANIFEST. Cortes posteriores ficam históricos
  // e só passam ao visor quando uma nova versão atualizar esse ponteiro.
  writeAtlasJs('malha_itinerarios_250km2', grid, path.join(dataDir, `${gridId}.js`));
  writeJson(path.join(outDir, `${gridId}.geojson`), grid);
  const publicGrid={type:'FeatureCollection',name:'malha_territorial_250km2',features:master.features,atlas_metadata:{...(master.atlas_metadata||{}),data_corte:corte,versao_metodo:'1.8.0',status_snapshot:'fechado'}};
  validateSameGrid(master,'malha_territorial_250km2',publicGrid);
  writeJson(path.join(precomputedDir,'malha_territorial_250km2.geojson'),publicGrid);

  const files = [
    ...ids.map(id => `${id}.geojson`),
    `${profileId}.geojson`,
    `${gridId}.geojson`
  ];
  const checksums = {};
  for (const file of files) checksums[file] = sha256Text(fs.readFileSync(path.join(outDir, file)));
  const manifest = {
    projeto: 'JOAJU MS',
    corte_dados: corte,
    status: 'fechado',
    n_hexagonos: master.features.length,
    grid_revision: master?.atlas_metadata?.grid_revision || null,
    release_corte_publico: releaseCut,
    promovido_ao_visor: corte === releaseCut,
    valores_materializados_por_indice: scoreCounts,
    arquivos: files,
    sha256: checksums,
    regra: 'Consulta pública usa arquivos estáticos. Nenhum índice é calculado ao marcar a camada.'
  };
  writeJson(path.join(outDir, `manifesto_corte_${corteSlug}.json`), manifest, true);
  const publicFiles=['malha_territorial_250km2.geojson',...Object.values(publicAliases),'ficha_territorial_250km2.geojson'];
  const publicSha={};
  for(const file of publicFiles) publicSha[file]=sha256Text(fs.readFileSync(path.join(precomputedDir,file)));
  const snapshotMetadata={projeto:'JOAJU MS',data_corte:corte,versao_metodo:'1.8.0',status:'fechado',n_hexagonos:master.features.length,grid_revision:master?.atlas_metadata?.grid_revision||null,formulas:frozenFormulas,arquivos:publicFiles,sha256:publicSha,regra_publica:'O Atlas lê malha, ficha e índices precalculados. Nenhum cálculo territorial pesado é iniciado ao ativar uma camada.',regra_atualizacao:'Novos cálculos exigem ação avançada explícita e não substituem automaticamente o corte publicado.',validacao:'A publicação é interrompida se qualquer um dos oito índices não cobrir a malha exigida ou não possuir valores numéricos válidos conforme o protocolo do materializador.'};
  writeJson(path.join(precomputedDir,'snapshot_metadata.json'),snapshotMetadata,true);
  console.log(`\nCorte fechado concluído com ${master.features.length} hexágonos em ${path.relative(root, outDir)} e ${path.relative(root, precomputedDir)}`);
} finally {
  await browser.close();
}
