import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import crypto from "node:crypto"

const root = path.resolve(process.argv[2] || process.cwd())
const corte = "2026-08-10"
const evidenceCut = "2026-08-06"

const paths = {
  inventory: path.join(root, "dados", "inventario_geocientifico_fase3.js"),
  legacy: path.join(root, "dados", "potencial_geocientifico_territorial_250km2.js"),
  master: path.join(root, "dados", "malha_itinerarios_snapshot_2026_08_10.js"),
  activation: path.join(root, "dados", "ativacao_geocientifica_extensao.js"),
  output: path.join(root, "dados", "precalculados", "ipg_250km2.geojson"),
  result: path.join(root, "resultados_indices", corte, "ipg_potencial_geocientifico_250km2.geojson")
}

for (const [name, file] of Object.entries(paths)) {
  if (name === "output" || name === "result") continue
  if (!fs.existsSync(file)) throw new Error(`Arquivo obrigatório ausente · ${file}`)
}

function loadAtlasJs(file, id) {
  const sandbox = { window: { ATLAS_DATA: {} } }
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file })
  const data = sandbox.window.ATLAS_DATA?.[id]
  if (!data) throw new Error(`Conjunto ${id} não encontrado em ${file}`)
  return JSON.parse(JSON.stringify(data))
}

const inventory = loadAtlasJs(paths.inventory, "inventario_geocientifico_fase3")
const legacy = loadAtlasJs(paths.legacy, "potencial_geocientifico_territorial_250km2")
const master = loadAtlasJs(paths.master, "malha_itinerarios_250km2")
const activation = loadAtlasJs(paths.activation, "ativacao_geocientifica_extensao")

const THEME_ORDER = [
  "Paleontologia e registro fossilífero",
  "Estratigrafia e história da Terra",
  "Sedimentologia e processos superficiais",
  "Carste, cavernas e precipitação carbonática",
  "Geomorfologia e evolução da paisagem",
  "Tectônica e geologia estrutural",
  "Mineralogia, petrologia e recursos minerais",
  "Hidrogeologia e hidrogeoquímica",
  "Paleoclimas e registros glaciais"
]

const THEME_INDEX = new Map(THEME_ORDER.map((x, i) => [x, i]))
const IPG_COLORS = ["#f2e5ff", "#d6b8f0", "#b58cde", "#8a5cc9", "#54278f"]

function round(value, digits = 4) {
  if (!Number.isFinite(Number(value))) return null
  return Number(Number(value).toFixed(digits))
}

function pointOnSegment(p, a, b) {
  const px = Number(p[0]), py = Number(p[1])
  const ax = Number(a[0]), ay = Number(a[1])
  const bx = Number(b[0]), by = Number(b[1])
  const cross = (px - ax) * (by - ay) - (py - ay) * (bx - ax)
  if (Math.abs(cross) > 1e-12) return false
  return px >= Math.min(ax, bx) - 1e-12 &&
         px <= Math.max(ax, bx) + 1e-12 &&
         py >= Math.min(ay, by) - 1e-12 &&
         py <= Math.max(ay, by) + 1e-12
}

function pointInRing(point, ring) {
  if (!Array.isArray(ring) || ring.length < 3) return false
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j], b = ring[i]
    if (pointOnSegment(point, a, b)) return true
    const xi = Number(b[0]), yi = Number(b[1])
    const xj = Number(a[0]), yj = Number(a[1])
    const px = Number(point[0]), py = Number(point[1])
    const hit = ((yi > py) !== (yj > py)) &&
      (px < ((xj - xi) * (py - yi) / ((yj - yi) || 1e-15) + xi))
    if (hit) inside = !inside
  }
  return inside
}

function pointInPolygon(point, coordinates) {
  if (!coordinates?.[0] || !pointInRing(point, coordinates[0])) return false
  for (const hole of coordinates.slice(1)) {
    if (pointInRing(point, hole)) return false
  }
  return true
}

function pointInGeometry(point, geometry) {
  if (!geometry) return false
  if (geometry.type === "Polygon") return pointInPolygon(point, geometry.coordinates)
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates || []).some(poly => pointInPolygon(point, poly))
  }
  return false
}

function splitThemes(props) {
  return String(props?.themes || "")
    .split("|")
    .map(x => x.trim())
    .filter(Boolean)
}

function siteWeight(props) {
  const value = Number(props?.site_documentary_weight)
  return Number.isFinite(value) ? value : 0
}

function factorEvidence(props) {
  const value = Number(props?.fator_evidencia)
  return Number.isFinite(value) ? value : 0
}

function complexId(props) {
  return String(props?.complexo_contagem || props?.canonical_id || "")
}

function officialRecord(props) {
  return String(props?.origem_canonica || "").includes("Decreto Estadual")
}

function orderedThemes(values) {
  return [...values].sort((a, b) => {
    const ai = THEME_INDEX.has(a) ? THEME_INDEX.get(a) : 999
    const bi = THEME_INDEX.has(b) ? THEME_INDEX.get(b) : 999
    return ai - bi || String(a).localeCompare(String(b), "pt-BR")
  })
}

function classIPG(score) {
  if (score === null || score === undefined) return "sem evidência suficiente"
  if (score >= 75) return "muito alto"
  if (score >= 60) return "alto"
  if (score >= 40) return "médio"
  if (score >= 20) return "baixo"
  return "muito baixo"
}

function colorIPG(score) {
  if (score === null || score === undefined) return "#d9d9d9"
  if (score >= 75) return IPG_COLORS[4]
  if (score >= 60) return IPG_COLORS[3]
  if (score >= 40) return IPG_COLORS[2]
  if (score >= 20) return IPG_COLORS[1]
  return IPG_COLORS[0]
}

function validateGrid(grid, label, expected = null) {
  if (grid?.type !== "FeatureCollection" || !Array.isArray(grid.features)) {
    throw new Error(`${label} não é FeatureCollection`)
  }
  if (expected !== null && grid.features.length !== expected) {
    throw new Error(`${label} contém ${grid.features.length} células e eram esperadas ${expected}`)
  }
  const ids = new Set()
  for (const f of grid.features) {
    const p = f?.properties || {}
    const id = String(p.hex_id || "")
    if (!id) throw new Error(`${label} contém célula sem hex_id`)
    if (ids.has(id)) throw new Error(`${label} contém hex_id duplicado · ${id}`)
    ids.add(id)
    if (!Number.isFinite(Number(p.q)) || !Number.isFinite(Number(p.r))) {
      throw new Error(`${label} contém q ou r inválido · ${id}`)
    }
    if (!["Polygon", "MultiPolygon"].includes(f?.geometry?.type)) {
      throw new Error(`${label} contém geometria inválida · ${id}`)
    }
  }
}

function assignPoints(grid, source) {
  const assigned = grid.features.map(() => [])
  const unassigned = []
  const multiple = []

  for (const feature of source.features || []) {
    if (feature?.geometry?.type !== "Point") {
      throw new Error(`O inventário contém geometria não pontual · ${feature?.properties?.canonical_id || "sem id"}`)
    }

    const point = feature.geometry.coordinates
    const hits = []

    for (let i = 0; i < grid.features.length; i++) {
      if (pointInGeometry(point, grid.features[i].geometry)) hits.push(i)
    }

    if (!hits.length) {
      unassigned.push(feature)
      continue
    }

    if (hits.length > 1) multiple.push({ feature, hits })
    assigned[hits[0]].push(feature)
  }

  return { assigned, unassigned, multiple }
}

function computeCore(grid, source) {
  const allocation = assignPoints(grid, source)
  const stats = []

  for (const records of allocation.assigned) {
    const complexes = new Map()

    for (const feature of records) {
      const id = complexId(feature.properties)
      if (!id) throw new Error(`Registro sem complexo_contagem ou canonical_id`)
      if (!complexes.has(id)) complexes.set(id, [])
      complexes.get(id).push(feature)
    }

    const themeWeights = new Map()
    let richnessQ = 0

    for (const recordsComplex of complexes.values()) {
      const themeMax = new Map()
      const weights = []

      for (const feature of recordsComplex) {
        const weight = siteWeight(feature.properties)
        weights.push(weight)

        for (const theme of splitThemes(feature.properties)) {
          const previous = themeMax.get(theme) || 0
          if (weight > previous) themeMax.set(theme, weight)
        }
      }

      for (const [theme, weight] of themeMax) {
        themeWeights.set(theme, (themeWeights.get(theme) || 0) + weight)
      }

      weights.sort((a, b) => b - a)
      if (weights.length) {
        const contribution = weights[0] + 0.20 * weights.slice(1).reduce((a, b) => a + b, 0)
        richnessQ += Math.min(1.5, contribution)
      }
    }

    const nThemes = themeWeights.size
    const themeTotal = [...themeWeights.values()].reduce((a, b) => a + b, 0)
    const simpson = themeTotal
      ? 1 - [...themeWeights.values()].reduce((sum, value) => sum + Math.pow(value / themeTotal, 2), 0)
      : 0

    const maxSimpson = 1 - 1 / THEME_ORDER.length
    const diversityDn = nThemes
      ? 0.60 * (nThemes / THEME_ORDER.length) + 0.40 * (simpson / maxSimpson)
      : 0

    stats.push({
      active: records.length > 0,
      records,
      complexes,
      themeWeights,
      nThemes,
      diversityDn,
      richnessQ
    })
  }

  const qMax = Math.max(0, ...stats.filter(x => x.active).map(x => x.richnessQ))
  const byAxial = new Map()

  grid.features.forEach((feature, index) => {
    const p = feature.properties || {}
    byAxial.set(`${Number(p.q)},${Number(p.r)}`, index)
  })

  const directions = [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]]

  stats.forEach((stat, index) => {
    const p = grid.features[index].properties || {}
    const q = Number(p.q), r = Number(p.r)

    let activeNeighbors = 0
    for (const [dq, dr] of directions) {
      const j = byAxial.get(`${q + dq},${r + dr}`)
      if (j !== undefined && stats[j].active) activeNeighbors++
    }

    const continuityCn = activeNeighbors / 6
    const richnessQn = stat.active && qMax > 0
      ? Math.log1p(stat.richnessQ) / Math.log1p(qMax)
      : 0

    const score = stat.active
      ? 100 * (0.40 * stat.diversityDn + 0.35 * richnessQn + 0.25 * continuityCn)
      : null

    Object.assign(stat, {
      activeNeighbors,
      continuityCn,
      richnessQn,
      score
    })
  })

  return { ...allocation, stats, qMax }
}

function selfTestLegacy() {
  validateGrid(legacy, "IPG legado", 1690)
  const computed = computeCore(legacy, inventory)

  if (computed.unassigned.length !== 0) {
    throw new Error(`Autoteste legado falhou · ${computed.unassigned.length} registros ficaram sem associação`)
  }

  if (computed.multiple.length !== 0) {
    throw new Error(`Autoteste legado falhou · ${computed.multiple.length} registros tiveram associação múltipla`)
  }

  if (Math.abs(computed.qMax - 3.816) > 1e-9) {
    throw new Error(`Autoteste legado falhou · Qmax ${computed.qMax} diferente de 3.816`)
  }

  let active = 0
  const mismatches = []

  for (let i = 0; i < legacy.features.length; i++) {
    const expected = legacy.features[i].properties || {}
    const got = computed.stats[i]

    if (got.active) active++

    const values = {
      n_temas: got.nThemes,
      n_complexos: got.complexes.size,
      n_unidades: got.records.length,
      diversidade_Dn: round(got.diversityDn, 4),
      riqueza_Q: round(got.richnessQ, 4),
      riqueza_Qn: round(got.richnessQn, 4),
      vizinhos_ativos: got.activeNeighbors,
      continuidade_Cn: round(got.continuityCn, 4),
      ipg_100: got.active ? round(got.score, 2) : null,
      classe_ipg: got.active ? classIPG(round(got.score, 2)) : "sem evidência suficiente",
      nucleo_territorial_candidato: got.active && got.score >= 60 ? "Sim" : "Não"
    }

    for (const [key, value] of Object.entries(values)) {
      if (expected[key] !== value) {
        mismatches.push(`${expected.hex_id} · ${key} · esperado ${expected[key]} · obtido ${value}`)
        if (mismatches.length >= 10) break
      }
    }

    if (mismatches.length >= 10) break
  }

  if (active !== 55) throw new Error(`Autoteste legado falhou · ${active} células ativas em vez de 55`)
  if (mismatches.length) throw new Error(`Autoteste legado falhou · ${mismatches.join(" | ")}`)

  return computed
}

function activationTemplateFromLegacy() {
  const fields = [
    "ativacao_geocientifica_documentada",
    "municipio_ativacao",
    "marcos_ativacao",
    "anos_ativacao",
    "tipos_ativacao",
    "pioneirismo_ativacao",
    "qualificador_territorial"
  ]

  const out = new Map()

  for (const act of activation.features || []) {
    if (act?.geometry?.type !== "Point") continue
    const point = act.geometry.coordinates
    const legacyCell = legacy.features.find(f => pointInGeometry(point, f.geometry))
    const template = {}

    for (const field of fields) {
      const value = legacyCell?.properties?.[field]
      if (value !== undefined) template[field] = value
    }

    out.set(String(act?.properties?.id || JSON.stringify(point)), { act, template })
  }

  return out
}

function activationByMasterCell() {
  const templates = activationTemplateFromLegacy()
  const byCell = new Map()

  for (const item of templates.values()) {
    const point = item.act.geometry.coordinates
    const hits = []

    for (let i = 0; i < master.features.length; i++) {
      if (pointInGeometry(point, master.features[i].geometry)) hits.push(i)
    }

    if (hits.length === 1) byCell.set(hits[0], item)
    else if (hits.length > 1) throw new Error(`Ativação geocientífica com associação múltipla na malha R5`)
  }

  return byCell
}

function deterministicId(prefix, value, length) {
  const hash = crypto.createHash("sha256").update(value).digest("hex").slice(0, length)
  return `${prefix}${hash}`
}

function buildR5() {
  validateGrid(master, "Malha mestra R5", 1554)

  const computed = computeCore(master, inventory)

  if (computed.multiple.length !== 0) {
    throw new Error(`Malha R5 produziu ${computed.multiple.length} associações múltiplas`)
  }

  const unassignedIds = computed.unassigned
    .map(f => String(f?.properties?.canonical_id || ""))
    .sort()

  const expectedUnassigned = ["MS-GEO-1B-025", "MS-GEO-1B-027"]

  if (JSON.stringify(unassignedIds) !== JSON.stringify(expectedUnassigned)) {
    throw new Error(`Registros fora da malha R5 inesperados · ${unassignedIds.join(" | ") || "nenhum"}`)
  }

  const activeCount = computed.stats.filter(x => x.active).length
  if (activeCount !== 57) {
    throw new Error(`Malha R5 produziu ${activeCount} células com evidência em vez de 57`)
  }

  if (Math.abs(computed.qMax - 2.888) > 1e-9) {
    throw new Error(`Malha R5 produziu Qmax ${computed.qMax} em vez de 2.888`)
  }

  const activationCells = activationByMasterCell()

  const features = master.features.map((feature, index) => {
    const base = feature.properties || {}
    const stat = computed.stats[index]
    const score = stat.active ? round(stat.score, 2) : null
    const classe = classIPG(score)
    const records = stat.records
    const themes = orderedThemes(stat.themeWeights.keys())
    const complexes = [...stat.complexes.keys()]
    const evidenceMean = records.length
      ? round(records.reduce((sum, f) => sum + factorEvidence(f.properties), 0) / records.length, 4)
      : null
    const officialShare = records.length
      ? round(records.filter(f => officialRecord(f.properties)).length / records.length, 4)
      : null

    const activationItem = activationCells.get(index)
    const activationProps = activationItem?.template || {}

    let priority = "Sem prioridade adicional"
    if (score !== null && score >= 60) priority = "Núcleo geocientífico candidato"
    if (activationItem && !(score !== null && score >= 60)) {
      priority = "Ativação documentada, sem núcleo geocientífico nesta célula"
    }

    const idSeed = `${base.hex_id}|${corte}|IPG-F3.2-R5`

    const props = {
      ...base,
      __atlas_label: score === null
        ? `${base.hex_id} — sem evidência espacial nesta fase`
        : `${base.hex_id} — IPG ${score.toFixed(1)}`,
      __atlas_color: colorIPG(score),
      __atlas_fill_opacity: score === null ? 0.18 : 0.76,
      __atlas_weight: score === null ? 0.5 : 0.8,
      ipg_100: score,
      classe_ipg: classe,
      nucleo_territorial_candidato: score !== null && score >= 60 ? "Sim" : "Não",
      n_temas: stat.nThemes,
      temas_presentes: themes.join(" | "),
      n_complexos: stat.complexes.size,
      complexos_presentes: complexes.join(" | "),
      n_unidades: records.length,
      diversidade_Dn: round(stat.diversityDn, 4),
      riqueza_Q: round(stat.richnessQ, 4),
      riqueza_Qn: round(stat.richnessQn, 4),
      vizinhos_ativos: stat.activeNeighbors,
      continuidade_Cn: round(stat.continuityCn, 4),
      cobertura_inventario: stat.active
        ? "Registros espaciais documentados na Fase 3.2"
        : "Sem registro espacial nesta fase. Não significa ausência de patrimônio geológico",
      confianca_documental: stat.active
        ? (stat.complexes.size >= 2 ? "alta" : "moderada")
        : "não avaliada",
      fator_evidencia_medio: evidenceMean,
      proporcao_fontes_oficiais: officialShare,
      ativacao_geocientifica_documentada: activationItem ? "Sim" : "Não inventariada nesta fase",
      municipio_ativacao: activationItem ? (activationProps.municipio_ativacao || activationItem.act?.properties?.municipio || "") : "",
      marcos_ativacao: activationItem ? (activationProps.marcos_ativacao ?? activationItem.act?.properties?.marcos_documentados ?? 0) : 0,
      anos_ativacao: activationItem ? (activationProps.anos_ativacao || activationItem.act?.properties?.anos || "") : "",
      tipos_ativacao: activationItem ? (activationProps.tipos_ativacao || "") : "",
      pioneirismo_ativacao: activationItem ? (activationProps.pioneirismo_ativacao || activationItem.act?.properties?.pioneirismo || "") : "",
      qualificador_territorial: activationItem
        ? (activationProps.qualificador_territorial || activationItem.act?.properties?.classificacao || "Ativação geocientífica documentada")
        : "Sem qualificador adicional nesta fase",
      prioridade_validacao: priority,
      viabilidade_geoparque: "Não avaliada. Exige matriz própria de governança, conservação, acesso, participação e gestão",
      formula: "IPG100 = 100 × (0,40 Dn + 0,35 Qn + 0,25 Cn)",
      metodo_diversidade: "Dn = 0,60 × riqueza temática normalizada + 0,40 × diversidade de Simpson normalizada. Cada complexo contribui uma vez por tema com o maior peso documental do tema no complexo.",
      metodo_riqueza: "Q soma, por complexo, o maior peso documental mais 20% dos pesos adicionais, com teto de 1,5 por complexo. Qn usa log1p(Q) normalizado pelo Qmax do corte.",
      metodo_continuidade: "Número de vizinhos ativos dividido por 6. A pontuação não é elevada pela ausência de células na borda.",
      interpretacao: "Potencial geocientífico territorial documentado. Não demonstra valor internacional, viabilidade, governança ou reconhecimento UNESCO",
      fonte_malha: "IBGE — Malha Municipal Digital 2025, malha mestra R5 do JOAJU MS",
      grid_revision: master?.atlas_metadata?.grid_revision || "IBGE-MS-MMD2025-FULLCOVER-CLIP-20260810-R5",
      data_corte: corte,
      data_corte_evidencia: evidenceCut,
      versao_metodo: "Fase 3.2 rematerializada na malha R5 · Atlas v1.8.0-dev",
      natureza_registro: "calculo_analitico",
      localizacao_status: "localizada",
      source_id: deterministicId("SRC-IPG-R5-", idSeed, 12),
      validacao_documental: "parcial",
      validacao_espacial: "realizada",
      validacao_institucional: "parcial",
      validacao_campo: "nao_realizada",
      validacao_comunitaria: "nao_realizada",
      validation_next: "dados_insuficientes",
      publicacao_status: "publico",
      evl_schema_version: "1.0",
      trace_id: deterministicId("TRC-EVL-", idSeed, 20),
      status_materializacao: score === null ? "sem_evidencia_materializada" : "materializado_com_valor"
    }

    return {
      type: "Feature",
      properties: props,
      geometry: feature.geometry
    }
  })

  const scores = features
    .map(f => f.properties.ipg_100)
    .filter(v => Number.isFinite(Number(v)) && v !== null)

  const candidateCount = features.filter(f => f.properties.nucleo_territorial_candidato === "Sim").length

  const output = {
    type: "FeatureCollection",
    name: "ipg_250km2",
    features,
    atlas_metadata: {
      produto: "IPG territorial Fase 3.2 rematerializado na malha mestra R5",
      versao: "Atlas v1.8.0-dev",
      data_corte: corte,
      data_corte_evidencia: evidenceCut,
      area_hexagonal_nominal_km2: 250,
      formula: "IPG100 = 100 × (0,40 Dn + 0,35 Qn + 0,25 Cn)",
      registros_entrada: inventory.features.length,
      registros_associados: inventory.features.length - computed.unassigned.length,
      registros_sem_associacao: computed.unassigned.length,
      registros_sem_associacao_ids: unassignedIds,
      regra_registros_sem_associacao: "Os pontos documentais que não intersectam a geometria oficial recortada de Mato Grosso do Sul permanecem explicitamente sem associação. Não são deslocados para a célula mais próxima.",
      complexos: new Set(inventory.features.map(f => complexId(f.properties))).size,
      temas: THEME_ORDER.length,
      hexagonos: features.length,
      hexagonos_com_evidencia: scores.length,
      nucleos_territoriais_candidatos: candidateCount,
      ipg_maximo: round(Math.max(...scores), 2),
      Qmax: round(computed.qMax, 4),
      continuidade: "vizinhos ativos divididos por 6",
      grid_revision: master?.atlas_metadata?.grid_revision || null,
      fonte_malha: "IBGE — Malha Municipal Digital 2025",
      autoteste_legado: "PASS · algoritmo reconstruiu integralmente os campos centrais das 1.690 células da Fase 3.2 antes da rematerialização R5",
      aviso: "Células sem registros são classificadas como sem evidência suficiente e não como baixo potencial. O IPG não avalia viabilidade de geoparque.",
      evl_schema_version: "1.0",
      evl_materializado_em: new Date().toISOString(),
      evl_records: features.length
    }
  }

  validateGrid(output, "IPG R5", 1554)

  const geometryById = new Map(master.features.map(f => [
    String(f.properties.hex_id),
    JSON.stringify(f.geometry)
  ]))

  for (const f of output.features) {
    const id = String(f.properties.hex_id)
    if (JSON.stringify(f.geometry) !== geometryById.get(id)) {
      throw new Error(`Geometria divergente da malha mestra · ${id}`)
    }
  }

  if (scores.length !== 57) throw new Error(`IPG R5 contém ${scores.length} valores numéricos em vez de 57`)
  if (features.filter(f => f.properties.ipg_100 === null).length !== 1497) {
    throw new Error(`IPG R5 não preservou as 1497 células sem evidência como null`)
  }
  if (features.some(f => f.properties.ipg_100 === 0)) {
    throw new Error(`IPG R5 contém zero artificial`)
  }

  return output
}

console.log("")
console.log("IPG R5 · AUTOTESTE DA FASE 3.2")
selfTestLegacy()
console.log("PASS · 1690 células legadas reconstruídas exatamente")
console.log("PASS · 55 células legadas com evidência")
console.log("PASS · Qmax legado 3.816")
console.log("")

const output = buildR5()

fs.mkdirSync(path.dirname(paths.output), { recursive: true })
fs.mkdirSync(path.dirname(paths.result), { recursive: true })

const tmp = `${paths.output}.tmp`
fs.writeFileSync(tmp, JSON.stringify(output), "utf8")
fs.renameSync(tmp, paths.output)
fs.writeFileSync(paths.result, JSON.stringify(output), "utf8")

console.log("IPG R5 MATERIALIZADO COM SUCESSO")
console.log(`Arquivo público · ${paths.output}`)
console.log(`Resultado versionado · ${paths.result}`)
console.log(`Células · ${output.features.length}`)
console.log(`Com evidência · ${output.atlas_metadata.hexagonos_com_evidencia}`)
console.log(`Sem evidência · ${output.features.length - output.atlas_metadata.hexagonos_com_evidencia}`)
console.log(`Registros geocientíficos associados · ${output.atlas_metadata.registros_associados}/${output.atlas_metadata.registros_entrada}`)
console.log(`Registros fora da geometria R5 · ${output.atlas_metadata.registros_sem_associacao_ids.join(" · ")}`)
console.log(`Qmax R5 · ${output.atlas_metadata.Qmax}`)
console.log(`IPG máximo · ${output.atlas_metadata.ipg_maximo}`)
console.log(`Núcleos candidatos · ${output.atlas_metadata.nucleos_territoriais_candidatos}`)
