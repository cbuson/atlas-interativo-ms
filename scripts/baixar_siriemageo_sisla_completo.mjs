import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SERVICE = 'https://www.pinms.ms.gov.br/arcgis/rest/services/IMASUL/SiriemaGeo_Sisla/MapServer';
const CORTE = '2026-08-10';
const ROOT = process.cwd();
const OUTDIR = path.join(ROOT, 'capturas_fontes_2026_08_10', 'pinms_imasul_siriemageo_sisla_full');
const LAYERSDIR = path.join(OUTDIR, 'camadas');
const METADIR = path.join(OUTDIR, 'metadados');
const CHUNK = 150;
const USER_AGENT = 'JOAJU-MS/1.8 scientific materializer';

fs.mkdirSync(LAYERSDIR, { recursive: true });
fs.mkdirSync(METADIR, { recursive: true });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function safeName(s) {
  return String(s || 'sem_nome')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 120) || 'sem_nome';
}

function sha256File(file) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(file));
  return h.digest('hex');
}

function writeJson(file, value, pretty = true) {
  fs.writeFileSync(file, JSON.stringify(value, null, pretty ? 2 : 0), 'utf8');
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

async function fetchTextNode(url, attempt = 1) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  try {
    const r = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, 'accept': '*/*' },
      signal: ctrl.signal,
      redirect: 'follow'
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } catch (e) {
    if (attempt < 3) {
      await sleep(1200 * attempt);
      return fetchTextNode(url, attempt + 1);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function fetchTextCurl(url) {
  const exe = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const r = spawnSync(exe, [
    '-L', '--fail', '--silent', '--show-error',
    '--retry', '5', '--retry-all-errors',
    '--connect-timeout', '30', '--max-time', '300',
    '-A', USER_AGENT,
    url
  ], { encoding: 'utf8', maxBuffer: 200 * 1024 * 1024 });
  if (r.status !== 0) throw new Error((r.stderr || `curl exit ${r.status}`).trim());
  return r.stdout;
}

async function getText(url) {
  try {
    return await fetchTextNode(url);
  } catch (e) {
    console.log(`  fetch Node falhou · ${e.message || e} · tentando curl`);
    return fetchTextCurl(url);
  }
}

async function getJson(url) {
  const text = await getText(url);
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Resposta não JSON em ${url}`); }
  if (data?.error) {
    const msg = data.error.message || JSON.stringify(data.error);
    throw new Error(`ArcGIS · ${msg}`);
  }
  return data;
}

function encParams(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) p.set(k, String(v));
  return p.toString();
}

async function getGeoJsonForIds(layerId, ids) {
  const url = `${SERVICE}/${layerId}/query?${encParams({
    objectIds: ids.join(','),
    outFields: '*',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson'
  })}`;
  const text = await getText(url);
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('Resposta GeoJSON inválida'); }
  if (data?.error) throw new Error(data.error.message || JSON.stringify(data.error));
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error('Resposta não é FeatureCollection');
  }
  return data;
}

async function getGeoJsonResilient(layerId, ids) {
  try {
    return await getGeoJsonForIds(layerId, ids);
  } catch (e) {
    if (ids.length <= 1) throw e;
    const mid = Math.floor(ids.length / 2);
    const a = await getGeoJsonResilient(layerId, ids.slice(0, mid));
    const b = await getGeoJsonResilient(layerId, ids.slice(mid));
    return { type: 'FeatureCollection', features: [...a.features, ...b.features] };
  }
}

function parentPath(layer, byId) {
  const names = [layer.name];
  let p = layer.parentLayerId;
  const seen = new Set();
  while (Number.isInteger(p) && p >= 0 && !seen.has(p)) {
    seen.add(p);
    const x = byId.get(p);
    if (!x) break;
    names.unshift(x.name);
    p = x.parentLayerId;
  }
  return names.join(' > ');
}

console.log(`JOAJU MS · captura integral PIN/MS IMASUL SiriemaGeo_Sisla`);
console.log(`Corte do Atlas · ${CORTE}`);
console.log(`Serviço · ${SERVICE}`);
console.log(`Saída · ${OUTDIR}`);

const startedAt = new Date().toISOString();
const manifest = {
  project: 'JOAJU MS',
  cut: CORTE,
  source: 'PIN/MS · IMASUL · SiriemaGeo_Sisla',
  service_url: SERVICE,
  capture_started_at: startedAt,
  policy: 'Captura integral das Feature Layers publicamente consultáveis. Sem alteração do Atlas e sem preenchimento artificial.',
  output_spatial_reference: 'EPSG:4326 para GeoJSON',
  layers: []
};

let serviceMeta;
try {
  serviceMeta = await getJson(`${SERVICE}?f=pjson`);
} catch (e) {
  console.error(`FALHA · não foi possível ler o serviço · ${e.message || e}`);
  process.exit(1);
}
writeJson(path.join(METADIR, 'service_metadata.json'), serviceMeta);

const allLayers = Array.isArray(serviceMeta.layers) ? serviceMeta.layers : [];
const byId = new Map(allLayers.map(x => [x.id, x]));
const featureLayers = allLayers.filter(x => x.type === 'Feature Layer');

console.log(`Feature Layers encontradas · ${featureLayers.length}`);

for (let n = 0; n < featureLayers.length; n++) {
  const layer = featureLayers[n];
  const prefix = `layer_${String(layer.id).padStart(3, '0')}_${safeName(layer.name)}`;
  const metaFile = path.join(METADIR, `${prefix}_metadata.json`);
  const idsFile = path.join(METADIR, `${prefix}_ids.json`);
  const geoFile = path.join(LAYERSDIR, `${prefix}.geojson`);
  const rec = {
    id: layer.id,
    name: layer.name,
    hierarchy: parentPath(layer, byId),
    geometryType: layer.geometryType || null,
    source_layer_url: `${SERVICE}/${layer.id}`,
    status: 'PENDING',
    count_ids: null,
    count_geojson: null,
    file: path.relative(OUTDIR, geoFile).replaceAll('\\', '/'),
    sha256: null,
    error: null
  };
  manifest.layers.push(rec);

  console.log(`[${n + 1}/${featureLayers.length}] ${layer.id} · ${layer.name}`);
  try {
    const layerMeta = await getJson(`${SERVICE}/${layer.id}?f=pjson`);
    writeJson(metaFile, layerMeta);

    const idsResp = await getJson(`${SERVICE}/${layer.id}/query?${encParams({
      where: '1=1',
      returnIdsOnly: 'true',
      f: 'pjson'
    })}`);
    const ids = Array.isArray(idsResp.objectIds) ? idsResp.objectIds : [];
    ids.sort((a, b) => Number(a) - Number(b));
    writeJson(idsFile, {
      objectIdFieldName: idsResp.objectIdFieldName || layerMeta.objectIdField || null,
      count: ids.length,
      objectIds: ids
    });
    rec.count_ids = ids.length;

    const features = [];
    if (ids.length) {
      for (let i = 0; i < ids.length; i += CHUNK) {
        const batch = ids.slice(i, i + CHUNK);
        const fc = await getGeoJsonResilient(layer.id, batch);
        features.push(...fc.features);
        process.stdout.write(`  ${Math.min(i + CHUNK, ids.length)}/${ids.length}\r`);
      }
      process.stdout.write('\n');
    }

    const oidField = idsResp.objectIdFieldName || layerMeta.objectIdField || 'OBJECTID';
    const dedup = new Map();
    let fallbackKey = 0;
    for (const f of features) {
      const oid = f?.properties?.[oidField] ?? f?.id;
      const key = oid == null ? `__row_${fallbackKey++}` : String(oid);
      if (!dedup.has(key)) dedup.set(key, f);
    }
    const out = {
      type: 'FeatureCollection',
      name: layer.name,
      crs_note: 'GeoJSON solicitado ao ArcGIS com outSR=4326',
      source: `${SERVICE}/${layer.id}`,
      captured_at: new Date().toISOString(),
      features: [...dedup.values()]
    };
    writeJson(geoFile, out, false);
    rec.count_geojson = out.features.length;
    rec.sha256 = sha256File(geoFile);

    if (rec.count_geojson !== rec.count_ids) {
      rec.status = 'WARNING_COUNT_MISMATCH';
      rec.error = `IDs ${rec.count_ids} · GeoJSON ${rec.count_geojson}`;
      console.log(`  AVISO · ${rec.error}`);
    } else {
      rec.status = 'PASS';
      console.log(`  PASS · ${rec.count_geojson} feições`);
    }
  } catch (e) {
    rec.status = 'FAIL';
    rec.error = String(e?.message || e);
    console.log(`  FALHOU · ${rec.error}`);
  }

  manifest.capture_checkpoint_at = new Date().toISOString();
  writeJson(path.join(OUTDIR, 'manifest_siriemageo_sisla.json'), manifest);
}

const csvRows = [
  ['id','nome','hierarquia','tipo_geometria','status','n_ids','n_geojson','arquivo','sha256','url_fonte','erro'],
  ...manifest.layers.map(x => [x.id,x.name,x.hierarchy,x.geometryType,x.status,x.count_ids,x.count_geojson,x.file,x.sha256,x.source_layer_url,x.error])
];
fs.writeFileSync(path.join(OUTDIR, 'catalogo_camadas.csv'), csvRows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n', 'utf8');

const sums = manifest.layers.filter(x => x.sha256).map(x => `${x.sha256}  ${x.file}`);
sums.unshift(`${sha256File(path.join(METADIR, 'service_metadata.json'))}  metadados/service_metadata.json`);
fs.writeFileSync(path.join(OUTDIR, 'SHA256SUMS.txt'), sums.join('\n') + '\n', 'utf8');

const passed = manifest.layers.filter(x => x.status === 'PASS').length;
const warnings = manifest.layers.filter(x => x.status.startsWith('WARNING')).length;
const failed = manifest.layers.filter(x => x.status === 'FAIL').length;
manifest.capture_finished_at = new Date().toISOString();
manifest.summary = {
  feature_layers_total: featureLayers.length,
  pass: passed,
  warning: warnings,
  fail: failed,
  complete: failed === 0 && warnings === 0
};
writeJson(path.join(OUTDIR, 'manifest_siriemageo_sisla.json'), manifest);

const readme = `# JOAJU MS · captura PIN/MS IMASUL SiriemaGeo_Sisla\n\n` +
`Corte do Atlas: ${CORTE}\n\n` +
`Serviço oficial: ${SERVICE}\n\n` +
`Esta pasta é uma captura independente para uso posterior. O script não altera o catálogo nem o index.html do Atlas.\n\n` +
`Foram varridas automaticamente todas as camadas declaradas como Feature Layer no serviço, preservando metadados, IDs, GeoJSON em EPSG:4326, contagens e SHA-256.\n\n` +
`Resultado desta execução deve ser consultado em manifest_siriemageo_sisla.json e catalogo_camadas.csv.\n`;
fs.writeFileSync(path.join(OUTDIR, 'README.md'), readme, 'utf8');

console.log('');
console.log(`RESUMO · PASS ${passed} · WARNING ${warnings} · FAIL ${failed} · TOTAL ${featureLayers.length}`);
console.log(`Manifesto · ${path.join(OUTDIR, 'manifest_siriemageo_sisla.json')}`);
console.log(`Catálogo · ${path.join(OUTDIR, 'catalogo_camadas.csv')}`);
if (failed || warnings) {
  console.log('STATUS · PARTIAL · revisar manifesto antes de usar como snapshot fechado.');
  process.exitCode = 1;
} else {
  console.log('STATUS · PASS · captura integral concluída.');
}
