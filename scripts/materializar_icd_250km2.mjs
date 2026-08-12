import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"

const root = path.resolve(process.argv[2] || process.cwd())
const corte = "2026-08-10"

const paths = {
  master: path.join(root, "dados", "malha_itinerarios_snapshot_2026_08_10.js"),
  ipg: path.join(root, "dados", "precalculados", "ipg_250km2.geojson"),
  peic: path.join(root, "dados", "precalculados", "peic_250km2.geojson"),
  iati: path.join(root, "dados", "precalculados", "iati_250km2.geojson"),
  iat: path.join(root, "dados", "precalculados", "iat_250km2.geojson"),
  isa: path.join(root, "dados", "precalculados", "isa_250km2.geojson"),
  ict: path.join(root, "dados", "precalculados", "ict_250km2.geojson"),
  ipae: path.join(root, "dados", "precalculados", "ipae_250km2.geojson"),
  output: path.join(root, "dados", "precalculados", "icd_250km2.geojson"),
  result: path.join(root, "resultados_indices", corte, "icd_cobertura_qualidade_dados_250km2.geojson"),
  validation: path.join(root, "docs", "VALIDACAO_ICD_250KM2_2026-08-10.json")
}

for (const [name, file] of Object.entries(paths)) {
  if (["output", "result", "validation"].includes(name)) continue
  if (!fs.existsSync(file)) throw new Error(`Arquivo obrigatório ausente · ${file}`)
}

function loadAtlasJs(file, id) {
  const sandbox = { window: { ATLAS_DATA: {} } }
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file })
  const data = sandbox.window.ATLAS_DATA?.[id]
  if (!data) throw new Error(`Conjunto ${id} não encontrado em ${file}`)
  return JSON.parse(JSON.stringify(data))
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

function canonicalGeometry(g) {
  return JSON.stringify(g ?? null)
}

function validateCollection(fc, label, expected = 1554) {
  if (fc?.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    throw new Error(`${label} não é FeatureCollection`)
  }
  if (fc.features.length !== expected) {
    throw new Error(`${label} contém ${fc.features.length} células e eram esperadas ${expected}`)
  }
  const ids = new Set()
  for (const f of fc.features) {
    const id = String(f?.properties?.hex_id || "")
    if (!id) throw new Error(`${label} contém célula sem hex_id`)
    if (ids.has(id)) throw new Error(`${label} contém hex_id duplicado · ${id}`)
    ids.add(id)
    if (!["Polygon", "MultiPolygon"].includes(f?.geometry?.type)) {
      throw new Error(`${label} contém geometria inválida · ${id}`)
    }
  }
  return ids
}

function rawPresent(value) {
  if (value === null || value === undefined || value === "") return false
  return Number.isFinite(Number(value))
}

function firstText(props, fields) {
  for (const k of fields) {
    if (!k) continue
    const v = props?.[k]
    if (v !== null && v !== undefined && String(v).trim() !== "") return String(v)
  }
  return ""
}

function firstFinite(props, fields) {
  for (const k of fields) {
    if (!k) continue
    const raw = props?.[k]
    if (raw === null || raw === undefined || raw === "") continue
    const v = Number(raw)
    if (Number.isFinite(v)) return v
  }
  return null
}

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0))
}

function indexClass(v) {
  if (!Number.isFinite(Number(v))) return "sem dados suficientes"
  const x = Number(v)
  return x <= 20 ? "muito baixo" :
    x <= 40 ? "baixo" :
    x <= 60 ? "médio" :
    x <= 80 ? "alto" : "muito alto"
}

function stabilityClass(pct) {
  return pct >= 90 ? "alta" : pct >= 75 ? "moderada" : "baixa"
}

function seededRandom(seed = 22062026) {
  let a = seed >>> 0
  return function () {
    a += 0x6D2B79F5
    let t = a
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function computeRankPercentiles(features, scoreKey, rankKey, pctKey) {
  const rows = features
    .map((f, i) => ({ i, v: Number(f.properties?.[scoreKey]) }))
    .filter(x => Number.isFinite(x.v))
    .sort((a, b) => b.v - a.v)

  rows.forEach((r, j) => {
    features[r.i].properties[rankKey] = j + 1
    features[r.i].properties[pctKey] = rows.length > 1
      ? Number((100 * (rows.length - 1 - j) / (rows.length - 1)).toFixed(2))
      : 100
  })
}

function applySensitivity(features) {
  const keys = [
    "completude_norm",
    "atualidade_norm",
    "posicional_norm",
    "tematica_norm",
    "rastreabilidade_norm"
  ]
  const baseWeights = [.2, .2, .2, .2, .2]
  const rng = seededRandom(22062026)
  const n = features.length
  const baseClasses = features.map(f => indexClass(f.properties.icd_100))
  const minScore = Array(n).fill(Infinity)
  const maxScore = Array(n).fill(-Infinity)
  const minRank = Array(n).fill(Infinity)
  const maxRank = Array(n).fill(-Infinity)
  const same = Array(n).fill(0)

  for (let sim = 0; sim < 500; sim++) {
    let w = baseWeights.map(x => x * (.8 + .4 * rng()))
    const sum = w.reduce((a, b) => a + b, 0)
    w = w.map(x => x / sum)

    const vals = features.map((f, i) => {
      const p = f.properties || {}
      const s = 100 * keys.reduce((a, k, j) => a + w[j] * clamp01(p[k]), 0)
      minScore[i] = Math.min(minScore[i], s)
      maxScore[i] = Math.max(maxScore[i], s)
      if (indexClass(s) === baseClasses[i]) same[i]++
      return { i, v: s }
    })

    vals.sort((a, b) => b.v - a.v)
    vals.forEach((x, j) => {
      minRank[x.i] = Math.min(minRank[x.i], j + 1)
      maxRank[x.i] = Math.max(maxRank[x.i], j + 1)
    })
  }

  features.forEach((f, i) => {
    const p = f.properties
    p.score_min_sensibilidade = Number(minScore[i].toFixed(2))
    p.score_max_sensibilidade = Number(maxScore[i].toFixed(2))
    p.rank_min_sensibilidade = minRank[i]
    p.rank_max_sensibilidade = maxRank[i]
    p.estabilidade_classe_pct = Number((same[i] / 5).toFixed(1))
    p.estabilidade_indice = stabilityClass(p.estabilidade_classe_pct)
  })
}

const master = loadAtlasJs(paths.master, "malha_itinerarios_250km2")
validateCollection(master, "Malha R5", 1554)

const specs = [
  {
    name: "IPG",
    file: paths.ipg,
    key: "ipg_100",
    posDefault: 1
  },
  {
    name: "PEIC",
    file: paths.peic,
    key: "peic_100",
    posDefault: 1
  },
  {
    name: "IATI",
    file: paths.iati,
    key: "iati_100",
    posDefault: 1
  },
  {
    name: "IAT",
    file: paths.iat,
    key: "iat_100",
    posDefault: 1,
    posField: "iat_posicional_pct",
    covField: "iat_cobertura_pct"
  },
  {
    name: "ISA",
    file: paths.isa,
    key: "isa_100",
    posDefault: 1,
    posField: "isa_posicional_pct",
    covField: "isa_cobertura_pct"
  },
  {
    name: "ICT",
    file: paths.ict,
    key: "ict_100",
    posDefault: .5,
    posField: "ict_posicional_pct",
    covField: "ict_cobertura_pct"
  },
  {
    name: "IPAE",
    file: paths.ipae,
    key: "ipae_100",
    posDefault: 1,
    posField: "ipae_posicional_pct",
    covField: "ipae_cobertura_pct"
  }
]

const masterGeom = new Map(
  master.features.map(f => [
    String(f.properties.hex_id),
    canonicalGeometry(f.geometry)
  ])
)

for (const spec of specs) {
  spec.data = readJson(spec.file)
  validateCollection(spec.data, spec.name, 1554)
  spec.map = new Map()

  for (const f of spec.data.features) {
    const id = String(f.properties.hex_id)
    if (!masterGeom.has(id)) throw new Error(`${spec.name} possui hex_id fora da R5 · ${id}`)
    if (canonicalGeometry(f.geometry) !== masterGeom.get(id)) {
      throw new Error(`${spec.name} possui geometria divergente da R5 · ${id}`)
    }
    spec.map.set(id, f)
  }
}

const dateFields = [
  "dados_capturados_em",
  "data_calculo_iat",
  "data_calculo_isa",
  "data_calculo_ict",
  "data_calculo_ipae",
  "calculado_em",
  "data_corte",
  "data_corte_evidencia",
  "corte_dados"
]

const traceFields = [
  "versao_metodo",
  "versao_metodo_ipg",
  "versao_metodo_peic",
  "versao_metodo_iati",
  "versao_metodo_iat",
  "versao_metodo_isa",
  "versao_metodo_ict",
  "versao_metodo_ipae",
  "formula",
  "formula_ipg",
  "formula_peic",
  "formula_iati",
  "formula_iat",
  "formula_isa",
  "formula_ict",
  "formula_ipae"
]

const calcDate = new Date().toISOString()
const features = []

for (const m of master.features) {
  const id = String(m.properties.hex_id)

  let complete = 0
  let current = 0
  let positional = 0
  let thematic = 0
  let trace = 0

  const presentModules = []
  const absentModules = []

  for (const spec of specs) {
    const f = spec.map.get(id)
    if (!f) throw new Error(`${spec.name} não contém ${id}`)

    const p = f.properties || {}
    const present = rawPresent(p[spec.key])

    if (present) {
      complete++
      presentModules.push(spec.name)
    } else {
      absentModules.push(spec.name)
    }

    const meta = spec.data.atlas_metadata || {}

    const hasDate = Boolean(
      firstText(p, dateFields) ||
      firstText(meta, [
        "capturado_em",
        "calculado_em",
        "data_calculo",
        "data_corte",
        "corte_dados",
        "captura_fonte_em",
        "evl_materializado_em"
      ])
    )

    if (hasDate) current++

    if (present) {
      const posPct = spec.posField
        ? firstFinite(p, [spec.posField])
        : null

      positional += posPct !== null
        ? clamp01(posPct / 100)
        : spec.posDefault
    }

    if (present) {
      const cov = spec.covField
        ? firstFinite(p, [spec.covField])
        : null

      thematic += cov !== null
        ? clamp01(cov / 100)
        : 1
    }

    const traced = Boolean(
      firstText(p, traceFields) ||
      firstText(meta, ["metodo", "formula", "versao_metodo", "produto"])
    )

    if (traced) trace++
  }

  const n = specs.length
  const c1 = complete / n
  const c2 = current / n
  const c3 = positional / n
  const c4 = thematic / n
  const c5 = trace / n
  const score = 100 * .2 * (c1 + c2 + c3 + c4 + c5)

  features.push({
    type: "Feature",
    geometry: m.geometry,
    properties: {
      ...(m.properties || {}),
      completude_norm: Number(c1.toFixed(6)),
      atualidade_norm: Number(c2.toFixed(6)),
      posicional_norm: Number(c3.toFixed(6)),
      tematica_norm: Number(c4.toFixed(6)),
      rastreabilidade_norm: Number(c5.toFixed(6)),
      icd_100: Number(score.toFixed(2)),
      classe_icd: indexClass(score),
      icd_cobertura_pct: Number((100 * c1).toFixed(1)),
      icd_atualidade_pct: Number((100 * c2).toFixed(1)),
      icd_posicional_pct: Number((100 * c3).toFixed(1)),
      icd_tematico_pct: Number((100 * c4).toFixed(1)),
      icd_rastreabilidade_pct: Number((100 * c5).toFixed(1)),
      modulos_com_resultado_n: presentModules.length,
      modulos_com_resultado: presentModules.join(" | "),
      modulos_sem_resultado_n: absentModules.length,
      modulos_sem_resultado: absentModules.join(" | "),
      data_calculo_icd: calcDate,
      data_corte: corte,
      versao_metodo_icd: "ICD-01 v1.8.0 operacional",
      formula_icd: "100 × média igual de completude, atualidade, adequação posicional, completude temática e rastreabilidade",
      nota_atualidade_icd: "Nesta implementação, atualidade representa a existência de referência temporal documentada no módulo. O ICD não estima sozinho a obsolescência substantiva da fonte.",
      nota_icd: "ICD mede qualidade e cobertura da informação, não potencial territorial. ICT recebe adequação posicional parcial porque é contexto municipal por desenho metodológico. Null em IPG, PEIC ou IATI é ausência de resultado e nunca é convertido em zero."
    }
  })
}

computeRankPercentiles(features, "icd_100", "rank_icd", "percentil_icd")
applySensitivity(features)

const data = {
  type: "FeatureCollection",
  name: "icd_250km2",
  features,
  atlas_metadata: {
    sigla: "ICD",
    metodo: "ICD-01 v1.8.0 operacional",
    n_hexagonos: features.length,
    dimensoes: [
      "completude",
      "atualidade",
      "adequação posicional",
      "completude temática",
      "rastreabilidade"
    ],
    pesos: {
      completude: .20,
      atualidade: .20,
      adequacao_posicional: .20,
      completude_tematica: .20,
      rastreabilidade: .20
    },
    modulos: specs.map(x => x.name),
    regra_nulos: "Null em IPG, PEIC ou IATI é tratado como ausência de resultado. Null nunca é convertido em zero.",
    regra_atualidade: "A dimensão operacional de atualidade verifica a presença de referência temporal documentada no módulo.",
    regra_posicional_ict: "ICT usa adequação posicional parcial quando derivado de contexto municipal ponderado por área.",
    simulacoes_sensibilidade: 500,
    corte_dados: corte,
    grid_revision: master?.atlas_metadata?.grid_revision || "IBGE-MS-MMD2025-FULLCOVER-CLIP-20260810-R5",
    malha_referencia: "Malha territorial mestra R5 de 1554 células"
  }
}

validateCollection(data, "ICD", 1554)

let min = Infinity
let max = -Infinity
let sum = 0

for (const f of data.features) {
  const id = String(f.properties.hex_id)
  if (canonicalGeometry(f.geometry) !== masterGeom.get(id)) {
    throw new Error(`ICD possui geometria divergente da R5 · ${id}`)
  }
  const v = Number(f.properties.icd_100)
  if (!Number.isFinite(v) || v < 0 || v > 100) {
    throw new Error(`ICD inválido · ${id} · ${f.properties.icd_100}`)
  }
  min = Math.min(min, v)
  max = Math.max(max, v)
  sum += v
}

fs.mkdirSync(path.dirname(paths.output), { recursive: true })
fs.mkdirSync(path.dirname(paths.result), { recursive: true })
fs.mkdirSync(path.dirname(paths.validation), { recursive: true })

const tmp = `${paths.output}.tmp`
fs.writeFileSync(tmp, JSON.stringify(data), "utf8")
fs.renameSync(tmp, paths.output)
fs.writeFileSync(paths.result, JSON.stringify(data), "utf8")

const validation = {
  status: "PASS",
  produto: "ICD territorial 250 km²",
  corte_dados: corte,
  hexagons: data.features.length,
  grid_revision: data.atlas_metadata.grid_revision,
  valores_numericos: data.features.length,
  minimo: Number(min.toFixed(2)),
  media: Number((sum / data.features.length).toFixed(2)),
  maximo: Number(max.toFixed(2)),
  regra_nulos: data.atlas_metadata.regra_nulos,
  dimensoes: data.atlas_metadata.dimensoes,
  modulos: data.atlas_metadata.modulos,
  validacoes: [
    "1554 células",
    "mesmos hex_id da malha R5",
    "mesma geometria da malha R5",
    "valores ICD entre 0 e 100",
    "null não convertido em zero",
    "500 simulações de sensibilidade"
  ],
  validado_em: new Date().toISOString()
}

fs.writeFileSync(paths.validation, JSON.stringify(validation, null, 2), "utf8")

console.log("")
console.log("JOAJU MS · ICD MATERIALIZADO")
console.log(`ICD · PASS · ${data.features.length} hexágonos`)
console.log(`ICD 100 · mínimo ${validation.minimo} · média ${validation.media} · máximo ${validation.maximo}`)
console.log(`GeoJSON · ${path.relative(root, paths.output)}`)
console.log(`Resultado · ${path.relative(root, paths.result)}`)
console.log(`Validação · ${path.relative(root, paths.validation)}`)
