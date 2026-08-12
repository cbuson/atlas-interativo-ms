import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';

const root = path.resolve(process.cwd());
const corte = process.env.CORTE_DATA || '2026-08-10';
const expectedHex = Number(process.env.EXPECTED_HEX || 1554);
const captureDir = path.join(root, 'capturas_fontes_2026_08_10', 'pinms_imasul_siriemageo_sisla_full');
const manifestFile = path.join(captureDir, 'manifest_siriemageo_sisla.json');
const preDir = path.join(root, 'dados', 'precalculados');
const matDir = path.join(root, 'dados', 'materializados', '2026_08_10');
const outDir = path.join(root, 'resultados_indices', corte);
const docsDir = path.join(root, 'docs');
const indexFile = path.join(root, 'index.html');

for (const d of [preDir, matDir, outDir, docsDir]) fs.mkdirSync(d, { recursive: true });

const MAP = [
  { atlasId: 'isa_uc_ms', layerId: 3, label: 'Mosaico das UCs em MS' },
  { atlasId: 'isa_za_ms', layerId: 4, label: 'Zonas de Amortecimento das UCs - MS' },
  { atlasId: 'isa_corredores_ecologicos', layerId: 6, label: 'Corredores Ecológicos' },
  { atlasId: 'isa_uso_restrito', layerId: 49, label: 'Áreas de Uso Restrito - Decreto Normativo 15.661 de 04 de maio de 2021' },
  { atlasId: 'isa_aur_pantanal', layerId: 47, label: 'Áreas Uso Restrito Pantanal' }
];

const SERVICE = 'https://www.pinms.ms.gov.br/arcgis/rest/services/IMASUL/SiriemaGeo_Sisla/MapServer';
const URL_REPLACEMENTS = new Map([
  ['https://www.pinms.ms.gov.br/arcgis/rest/services/IMASUL/CAMADAS_API_SISGEO_v1/MapServer/3', `${SERVICE}/3`],
  ['https://www.pinms.ms.gov.br/arcgis/rest/services/IMASUL/CAMADAS_API_SISGEO_v1/MapServer/2', `${SERVICE}/4`],
  ['https://www.pinms.ms.gov.br/arcgis/rest/services/IMASUL/CAMADAS_API_SISGEO_v1/MapServer/16', `${SERVICE}/6`],
  ['https://www.pinms.ms.gov.br/arcgis/rest/services/IMASUL/CAMADAS_API_SISGEO_v1/MapServer/12', `${SERVICE}/49`],
  ['https://www.pinms.ms.gov.br/arcgis/rest/services/IMASUL/CAMADAS_API_SISGEO_v1/MapServer/17', `${SERVICE}/47`]
]);

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value), 'utf8'); }
function mime(file) {
  const e = path.extname(file).toLowerCase();
  return ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8','.css':'text/css; charset=utf-8','.csv':'text/csv; charset=utf-8','.kml':'application/vnd.google-earth.kml+xml','.webmanifest':'application/manifest+json'})[e] || 'application/octet-stream';
}
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url, 'http://127.0.0.1');
        const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
        const file = path.resolve(root, rel);
        if (!file.startsWith(root + path.sep) && file !== indexFile) { res.writeHead(403); res.end('forbidden'); return; }
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, {'Content-Type': mime(file), 'Cache-Control': 'no-store'});
        fs.createReadStream(file).pipe(res);
      } catch (e) { res.writeHead(500); res.end(String(e)); }
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}
async function launchBrowser() {
  try { return await chromium.launch({ headless: true }); }
  catch (first) {
    const candidates = process.platform === 'win32' ? [
      process.env['PROGRAMFILES'] && path.join(process.env['PROGRAMFILES'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      process.env['PROGRAMFILES'] && path.join(process.env['PROGRAMFILES'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
      process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe')
    ].filter(Boolean) : [];
    for (const executablePath of candidates) {
      if (fs.existsSync(executablePath)) {
        console.log(`Navegador local · ${executablePath}`);
        return chromium.launch({ headless: true, executablePath });
      }
    }
    throw first;
  }
}
function validateGrid(grid) {
  if (grid?.type !== 'FeatureCollection' || !Array.isArray(grid.features)) throw new Error('Malha territorial não retornou FeatureCollection');
  if (grid.features.length !== expectedHex) throw new Error(`Malha territorial contém ${grid.features.length} hexágonos. Esperado ${expectedHex}.`);
  const ids = new Set();
  for (const f of grid.features) {
    const id = String(f?.properties?.hex_id || '');
    if (!id) throw new Error('Hexágono sem hex_id');
    if (ids.has(id)) throw new Error(`hex_id duplicado ${id}`);
    ids.add(id);
  }
  return ids;
}
function validatePolygonFC(data, label) {
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error(`${label} não é FeatureCollection`);
  if (!data.features.length) throw new Error(`${label} não contém feições`);
  const bad = data.features.filter(f => !['Polygon','MultiPolygon'].includes(f?.geometry?.type));
  if (bad.length) throw new Error(`${label} contém ${bad.length} geometrias não poligonais`);
}
function validateISA(data, masterIds) {
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('ISA não retornou FeatureCollection');
  if (data.features.length !== masterIds.size) throw new Error(`ISA contém ${data.features.length} hexágonos. Esperado ${masterIds.size}.`);
  const seen = new Set();
  let finite = 0;
  for (const f of data.features) {
    const p = f?.properties || {};
    const id = String(p.hex_id || '');
    if (!masterIds.has(id)) throw new Error(`ISA contém hex_id fora da malha ${id}`);
    if (seen.has(id)) throw new Error(`ISA contém hex_id duplicado ${id}`);
    seen.add(id);
    const score = Number(p.isa_100);
    const comps = ['uc_area_pct','za_area_pct','corredores_area_pct','uso_restrito_area_pct'].map(k => Number(p[k]));
    if (!Number.isFinite(score) || score < -1e-9 || score > 100 + 1e-9) throw new Error(`ISA inválido em ${id}`);
    if (comps.some(v => !Number.isFinite(v) || v < -1e-9 || v > 100 + 1e-9)) throw new Error(`Componente ISA inválido em ${id}`);
    const expected = .25 * comps.reduce((a,b) => a + b, 0);
    if (Math.abs(score - expected) > 0.06) throw new Error(`Fórmula ISA inconsistente em ${id} · obtido ${score} · esperado ${expected.toFixed(2)}`);
    finite++;
  }
  if (finite !== masterIds.size) throw new Error(`ISA contém ${finite}/${masterIds.size} valores numéricos válidos`);
}
function patchManifestCount(html, id, count) {
  const re = new RegExp(`("${id}"\\s*:\\s*\\{[^{}]*?"registros"\\s*:\\s*)\\d+`);
  if (!re.test(html)) throw new Error(`DATA_MANIFEST sem entrada reconhecível para ${id}`);
  return html.replace(re, `$1${count}`);
}

console.log('JOAJU MS · materialização isolada ISA · SiriemaGeo_Sisla · corte ' + corte);
console.log('Somente ISA. Usa a captura oficial PIN/MS já concluída e não executa a materialização geral.');

if (!fs.existsSync(manifestFile)) throw new Error(`Captura SiriemaGeo_Sisla não encontrada · ${manifestFile}`);
if (!fs.existsSync(indexFile)) throw new Error(`index.html não encontrado · ${indexFile}`);

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const byId = new Map((manifest.layers || []).map(x => [Number(x.id), x]));
const captureTimestamp = manifest.capture_finished_at || manifest.capture_checkpoint_at || manifest.capture_started_at || `${corte}T00:00:00Z`;
const injected = {};
const sourceReport = [];

for (const m of MAP) {
  const rec = byId.get(m.layerId);
  if (!rec) throw new Error(`Camada Siriema ${m.layerId} ausente do manifesto`);
  if (rec.status !== 'PASS') throw new Error(`Camada Siriema ${m.layerId} não está PASS · ${rec.status}`);
  const file = path.join(captureDir, rec.file);
  if (!fs.existsSync(file)) throw new Error(`Arquivo da camada ${m.layerId} não encontrado · ${file}`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  validatePolygonFC(data, `${m.layerId} · ${m.label}`);
  if (Number(rec.count_geojson) !== data.features.length) throw new Error(`Contagem divergente na camada ${m.layerId} · manifesto ${rec.count_geojson} · arquivo ${data.features.length}`);
  const enriched = {
    ...data,
    atlas_metadata: {
      ...(data.atlas_metadata || {}),
      capturado_em: captureTimestamp,
      corte_dados: corte,
      fonte_institucional: 'IMASUL/PIN MS',
      servico: SERVICE,
      camada_id: m.layerId,
      camada_nome: m.label,
      uso_no_isa: m.atlasId
    }
  };
  for (const f of enriched.features) {
    f.properties = {...(f.properties || {}), __atlas_capturado_em: captureTimestamp, __atlas_fonte_servico: SERVICE, __atlas_layer_id: m.layerId};
  }
  injected[m.atlasId] = enriched;

  const geoOut = path.join(matDir, `${m.atlasId}.geojson`);
  const jsOut = path.join(matDir, `${m.atlasId}.js`);
  writeJson(geoOut, enriched);
  fs.writeFileSync(jsOut, `window.ATLAS_DATA=window.ATLAS_DATA||{};\nwindow.ATLAS_DATA[${JSON.stringify(m.atlasId)}]=${JSON.stringify(enriched)};\n`, 'utf8');
  sourceReport.push({
    atlas_id: m.atlasId,
    siriema_layer_id: m.layerId,
    siriema_layer_name: m.label,
    features: enriched.features.length,
    source_file: path.relative(root, file).replaceAll('\\','/'),
    source_sha256: sha256File(file),
    materialized_geojson: path.relative(root, geoOut).replaceAll('\\','/'),
    materialized_js: path.relative(root, jsOut).replaceAll('\\','/')
  });
  console.log(`Fonte ISA · ${m.atlasId} ← Siriema ${m.layerId} · ${enriched.features.length} feições`);
}

// Atualização cirúrgica das cinco rotas ISA e das contagens do DATA_MANIFEST.
let html = fs.readFileSync(indexFile, 'utf8');
const backup = path.join(root, 'docs', `BACKUP_index_pre_ISA_SIRIEMA_${corte}.html`);
if (!fs.existsSync(backup)) fs.writeFileSync(backup, html, 'utf8');
for (const [oldUrl, newUrl] of URL_REPLACEMENTS) html = html.split(oldUrl).join(newUrl);
for (const m of MAP) html = patchManifestCount(html, m.atlasId, injected[m.atlasId].features.length);
fs.writeFileSync(indexFile, html, 'utf8');
console.log('Rotas ISA do index.html atualizadas para SiriemaGeo_Sisla · 5/5');
console.log(`Backup do index anterior · ${path.relative(root, backup)}`);

const { server, port } = await startServer();
const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(300000);
page.on('console', m => { const t = m.text(); if (/ISA|ambient|Malha|Falha|erro/i.test(t)) console.log('[browser] ' + t); });
page.on('pageerror', e => console.error('[pageerror] ' + e.message));

try {
  const url = `http://127.0.0.1:${port}/index.html`;
  console.log('Atlas local · ' + url);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.calculateISA250 === 'function' && typeof window.loadMasterTerritorialGrid250 === 'function', { timeout: 180000 });

  // A injeção é deliberada. Faz o cálculo usar exatamente a captura Siriema já validada,
  // sem consultar novamente os serviços ArcGIS durante o fechamento.
  await page.evaluate(payload => {
    window.ATLAS_DATA = window.ATLAS_DATA || {};
    for (const [id, data] of Object.entries(payload)) window.ATLAS_DATA[id] = data;
  }, injected);

  const master = await page.evaluate(() => window.loadMasterTerritorialGrid250());
  const masterIds = validateGrid(master);
  console.log(`Malha territorial · ${master.features.length} hexágonos`);
  console.log('Calculando ISA...');
  const data = await page.evaluate(() => window.calculateISA250());
  validateISA(data, masterIds);

  const values = data.features.map(f => Number(f.properties.isa_100));
  const min = Math.min(...values), max = Math.max(...values), mean = values.reduce((a,b) => a+b, 0) / values.length;
  const positive = values.filter(v => v > 0).length;
  const output = {
    ...data,
    atlas_metadata: {
      ...(data.atlas_metadata || {}),
      corte_dados: corte,
      status_materializacao: 'materializado_isoladamente',
      fonte_snapshot: 'IMASUL/PIN MS · SiriemaGeo_Sisla',
      fonte_servico: SERVICE,
      fonte_camadas: sourceReport.map(x => ({atlas_id:x.atlas_id, layer_id:x.siriema_layer_id, nome:x.siriema_layer_name, feicoes:x.features, sha256:x.source_sha256})),
      captura_fonte_em: captureTimestamp,
      nota_data_fonte: 'A data de captura do Atlas não deve ser confundida com a data de atualização declarada pelo serviço de origem.'
    }
  };

  const preFile = path.join(preDir, 'isa_250km2.geojson');
  const datedFile = path.join(outDir, 'isa_sensibilidade_ambiental_250km2.geojson');
  writeJson(preFile, output);
  writeJson(datedFile, output);

  const report = {
    project: 'JOAJU MS',
    cut: corte,
    index: 'ISA',
    status: 'PASS',
    hexagons: output.features.length,
    isa_min: Number(min.toFixed(2)),
    isa_max: Number(max.toFixed(2)),
    isa_mean: Number(mean.toFixed(2)),
    hexagons_with_isa_gt_0: positive,
    formula: '100 × (0,25 UC + 0,25 ZA + 0,25 corredores + 0,25 uso restrito)',
    denominator_rule: 'Área efetiva da geometria do hexágono já recortada ao limite de Mato Grosso do Sul.',
    source_service: SERVICE,
    source_capture_manifest: path.relative(root, manifestFile).replaceAll('\\','/'),
    source_capture_manifest_sha256: sha256File(manifestFile),
    source_capture_finished_at: captureTimestamp,
    source_layers: sourceReport,
    restricted_use_union: ['Siriema layer 49', 'Siriema layer 47'],
    precomputed: path.relative(root, preFile).replaceAll('\\','/'),
    precomputed_sha256: sha256File(preFile),
    generated_at: new Date().toISOString(),
    note: 'Materialização isolada do ISA. Não declara o snapshot geral dos oito índices como fechado.'
  };
  const reportFile = path.join(docsDir, `VALIDACAO_ISA_250KM2_${corte}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(`ISA · PASS · ${output.features.length} hexágonos`);
  console.log(`ISA 100 · mínimo ${report.isa_min} · média ${report.isa_mean} · máximo ${report.isa_max}`);
  console.log(`Hexágonos com ISA > 0 · ${positive}/${output.features.length}`);
  console.log(`GeoJSON · ${path.relative(root, preFile)}`);
  console.log(`Validação · ${path.relative(root, reportFile)}`);
} catch (e) {
  console.error('\nFALHA ISA · ' + (e?.stack || e));
  process.exitCode = 1;
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  await new Promise(r => server.close(r));
}
