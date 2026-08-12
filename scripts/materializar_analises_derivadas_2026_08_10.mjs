import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"

const root = path.resolve(process.argv[2] || process.cwd())
const cut = "2026-08-10"
const skipRoad = process.env.PATCH09_SKIP_ROAD === "1"

const files = {
  routes: path.join(root, "dados", "rotas_culturais_propostas.js"),
  ucs: path.join(root, "dados", "materializados", "2026_08_10", "unidades_conservacao.js"),
  caves: path.join(root, "dados", "materializados", "2026_08_10", "cavernas_canie.js")
}

for (const [name, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) throw new Error(`Fonte local ausente · ${name} · ${file}`)
}

function loadAtlasJs(file, id) {
  const sandbox = { window: { ATLAS_DATA: {} } }
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file })
  const data = sandbox.window.ATLAS_DATA?.[id]
  if (!data?.features) throw new Error(`Conjunto ${id} não encontrado em ${file}`)
  return JSON.parse(JSON.stringify(data))
}

const routes = loadAtlasJs(files.routes, "rotas_culturais_propostas")
const ucs = loadAtlasJs(files.ucs, "unidades_conservacao")
const caves = loadAtlasJs(files.caves, "cavernas_canie")

if (routes.features.length !== 32) throw new Error(`Rotas inesperadas · ${routes.features.length}/32`)
if (ucs.features.length !== 8) throw new Error(`Unidades de conservação inesperadas · ${ucs.features.length}/8`)
if (caves.features.length !== 341) throw new Error(`Cavidades CANIE inesperadas · ${caves.features.length}/341`)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function lineParts(g) {
  if (!g) return []
  if (g.type === "LineString") return [g.coordinates || []]
  if (g.type === "MultiLineString") return g.coordinates || []
  return []
}

function pointCoord(g) {
  if (!g) return null
  if (g.type === "Point") return g.coordinates || null
  if (g.type === "MultiPoint") return g.coordinates?.[0] || null
  return null
}

function pointInRing(p, ring) {
  if (!p || !Array.isArray(ring) || ring.length < 3) return false
  const x = Number(p[0])
  const y = Number(p[1])
  let inside = false

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = Number(ring[i][0])
    const yi = Number(ring[i][1])
    const xj = Number(ring[j][0])
    const yj = Number(ring[j][1])

    const intersects =
      ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-30) + xi)

    if (intersects) inside = !inside
  }

  return inside
}

function pointInPolygonCoords(p, poly) {
  if (!poly?.[0] || !pointInRing(p, poly[0])) return false
  for (let i = 1; i < poly.length; i++) {
    if (pointInRing(p, poly[i])) return false
  }
  return true
}

function pointInGeometry(p, g) {
  if (!g) return false
  if (g.type === "Polygon") return pointInPolygonCoords(p, g.coordinates)
  if (g.type === "MultiPolygon") {
    return (g.coordinates || []).some(poly => pointInPolygonCoords(p, poly))
  }
  return false
}

function cross(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

function segmentIntersectionPoint(a, b, c, d) {
  const x1 = Number(a[0]), y1 = Number(a[1])
  const x2 = Number(b[0]), y2 = Number(b[1])
  const x3 = Number(c[0]), y3 = Number(c[1])
  const x4 = Number(d[0]), y4 = Number(d[1])

  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(den) < 1e-12) return null

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den

  if (t < -1e-10 || t > 1 + 1e-10 || u < -1e-10 || u > 1 + 1e-10) return null

  return [
    x1 + t * (x2 - x1),
    y1 + t * (y2 - y1)
  ]
}

function polygonParts(g) {
  if (!g) return []
  if (g.type === "Polygon") return [g.coordinates || []]
  if (g.type === "MultiPolygon") return g.coordinates || []
  return []
}

function firstLinePolygonRelationPoint(line, polygonGeometry) {
  for (const p of line || []) {
    if (pointInGeometry(p, polygonGeometry)) return p
  }

  for (let i = 0; i < (line || []).length - 1; i++) {
    const a = line[i]
    const b = line[i + 1]

    for (const poly of polygonParts(polygonGeometry)) {
      for (const ring of poly || []) {
        for (let j = 0; j < ring.length - 1; j++) {
          const hit = segmentIntersectionPoint(a, b, ring[j], ring[j + 1])
          if (hit) return hit
        }
      }
    }
  }

  return null
}

function geometryRelationPoint(lineGeometry, polygonGeometry) {
  for (const line of lineParts(lineGeometry)) {
    const hit = firstLinePolygonRelationPoint(line, polygonGeometry)
    if (hit) return hit
  }
  return null
}

function pointSegmentDistanceKm(p, a, b) {
  const lon0 = Number(p[0])
  const lat0 = Number(p[1])
  const cos = Math.cos(lat0 * Math.PI / 180)
  const kx = 111.320 * cos
  const ky = 110.574

  const ax = (Number(a[0]) - lon0) * kx
  const ay = (Number(a[1]) - lat0) * ky
  const bx = (Number(b[0]) - lon0) * kx
  const by = (Number(b[1]) - lat0) * ky

  const dx = bx - ax
  const dy = by - ay
  const den = dx * dx + dy * dy

  if (den <= 1e-18) return Math.hypot(ax, ay)

  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / den))
  const x = ax + t * dx
  const y = ay + t * dy

  return Math.hypot(x, y)
}

function minDistanceToRouteKm(point, geometry) {
  let best = Infinity

  for (const line of lineParts(geometry)) {
    for (let i = 0; i < line.length - 1; i++) {
      best = Math.min(best, pointSegmentDistanceKm(point, line[i], line[i + 1]))
    }
  }

  return best
}

function routeName(f) {
  return String(f?.properties?.nome || f?.properties?.id || "Rota")
}

function ucName(f) {
  return String(
    f?.properties?.nomeuc ||
    f?.properties?.nome ||
    f?.properties?.cnuc ||
    "Unidade de conservação"
  )
}

function caveName(f) {
  return String(
    f?.properties?.nome ||
    f?.properties?.num_canie ||
    "Cavidade"
  )
}

function buildRouteUc() {
  const features = []

  for (const route of routes.features) {
    for (const uc of ucs.features) {
      const point = geometryRelationPoint(route.geometry, uc.geometry)
      if (!point) continue

      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: point
        },
        properties: {
          id_relacao: `ROTA-UC-${String(features.length + 1).padStart(3, "0")}`,
          id_rota: route.properties?.id || "",
          nome_rota: routeName(route),
          cnuc: uc.properties?.cnuc || "",
          nome_uc: ucName(uc),
          categoria_uc: uc.properties?.categoria_ || "",
          esfera_administrativa: uc.properties?.esferaadm || "",
          tipo_relacao: "interseção espacial exploratória",
          metodo: "segmento da rota esquemática intersecta ou possui vértice dentro do polígono CNUC",
          fonte_rota: "JOAJU MS · propostas metodológicas de rotas · corte 10/08/2026",
          fonte_uc: "CNUC/MMA · snapshot local capturado em 10/08/2026",
          data_corte: cut,
          natureza_resultado: "análise espacial derivada",
          limitacoes: "A relação espacial não implica autorização de acesso, visitação, integração turística, compatibilidade com plano de manejo ou validação institucional."
        }
      })
    }
  }

  return {
    type: "FeatureCollection",
    name: "interacoes_rotas_unidades_conservacao",
    features,
    atlas_metadata: {
      produto: "Interações exploratórias entre rotas e unidades de conservação",
      data_corte: cut,
      rotas_base: routes.features.length,
      unidades_conservacao_base: ucs.features.length,
      metodo: "interseção geométrica rota–polígono",
      natureza: "análise derivada exploratória"
    }
  }
}

function buildCavesRoutes() {
  const features = []
  const thresholdKm = 50

  for (const cave of caves.features) {
    const point = pointCoord(cave.geometry)
    if (!point) continue

    let best = Infinity
    let nearest = null

    for (const route of routes.features) {
      const d = minDistanceToRouteKm(point, route.geometry)
      if (d < best) {
        best = d
        nearest = route
      }
    }

    if (!nearest || !Number.isFinite(best) || best > thresholdKm) continue

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: point
      },
      properties: {
        ...(cave.properties || {}),
        id_rota_mais_proxima: nearest.properties?.id || "",
        rota_mais_proxima: routeName(nearest),
        distancia_minima_rota_km: Number(best.toFixed(3)),
        limiar_exploratorio_km: thresholdKm,
        metodo: "menor distância euclidiana local aproximada entre ponto CANIE e segmentos das rotas esquemáticas",
        fonte_cavidade: "CANIE/CECAV/ICMBio · snapshot local capturado em 10/08/2026",
        fonte_rotas: "JOAJU MS · propostas metodológicas de rotas · corte 10/08/2026",
        data_corte: cut,
        natureza_resultado: "análise espacial derivada",
        limitacoes: "Proximidade cartográfica não implica acesso, visitação, segurança, integração cultural ou autorização."
      }
    })
  }

  return {
    type: "FeatureCollection",
    name: "cavidades_proximas_rotas_estudo",
    features,
    atlas_metadata: {
      produto: "Cavidades próximas às rotas em estudo",
      data_corte: cut,
      cavidades_base: caves.features.length,
      rotas_base: routes.features.length,
      limiar_km: thresholdKm,
      metodo: "distância mínima ponto–segmento",
      natureza: "análise derivada exploratória"
    }
  }
}

function buildCavesUc() {
  const features = []

  for (const cave of caves.features) {
    const point = pointCoord(cave.geometry)
    if (!point) continue

    const hits = ucs.features.filter(uc => pointInGeometry(point, uc.geometry))
    if (!hits.length) continue

    for (const uc of hits) {
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: point
        },
        properties: {
          ...(cave.properties || {}),
          cnuc: uc.properties?.cnuc || "",
          nome_uc: ucName(uc),
          categoria_uc: uc.properties?.categoria_ || "",
          esfera_administrativa: uc.properties?.esferaadm || "",
          tipo_relacao: "ponto CANIE dentro do polígono CNUC",
          metodo: "teste ponto–polígono sobre snapshots locais",
          fonte_cavidade: "CANIE/CECAV/ICMBio · snapshot local capturado em 10/08/2026",
          fonte_uc: "CNUC/MMA · snapshot local capturado em 10/08/2026",
          data_corte: cut,
          natureza_resultado: "análise espacial derivada",
          limitacoes: "A relação cartográfica depende da precisão e atualização das bases CANIE e CNUC e não substitui validação institucional ou de campo."
        }
      })
    }
  }

  return {
    type: "FeatureCollection",
    name: "cavidades_em_unidades_conservacao",
    features,
    atlas_metadata: {
      produto: "Cavidades registradas em unidades de conservação",
      data_corte: cut,
      cavidades_base: caves.features.length,
      unidades_conservacao_base: ucs.features.length,
      metodo: "ponto CANIE dentro de polígono CNUC",
      natureza: "análise derivada exploratória"
    }
  }
}

const ROAD_IDS = [
  "ROTA-EST-008",
  "ROTA-EST-009",
  "ROTA-EST-010",
  "ROTA-EST-014",
  "ROTA-EST-021",
  "ROTA-EST-022",
  "ROTA-EST-023",
  "ROTA-EST-024",
  "ROTA-EST-026"
]

function routeIdNumber(id) {
  const m = String(id || "").match(/(\d+)$/)
  return m ? Number(m[1]) : 0
}

function roadAccessSpecificNote(routeId) {
  if (routeId === "ROTA-EST-008") {
    return "Representa acesso rodoviário contemporâneo entre referências municipais. Não reconstrói o trajeto histórico da Retirada da Laguna."
  }
  return "Estimativa viária contemporânea entre referências da proposta metodológica. Não substitui validação logística ou de campo."
}

function legCoordinates(leg) {
  const out = []

  for (const step of leg?.steps || []) {
    const coords = step?.geometry?.coordinates || []

    for (const xy of coords) {
      if (
        !out.length ||
        out[out.length - 1][0] !== xy[0] ||
        out[out.length - 1][1] !== xy[1]
      ) {
        out.push(xy)
      }
    }
  }

  return out
}

async function fetchJsonWithRetry(url, attempts = 4) {
  let last = null

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 90000)

      try {
        const r = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "JOAJU-MS-PATCH09/1.8.0"
          },
          signal: controller.signal
        })

        if (!r.ok) throw new Error(`HTTP ${r.status}`)

        const j = await r.json()
        if (j.code !== "Ok" || !j.routes?.length) {
          throw new Error(j.message || j.code || "Rota não encontrada")
        }

        return j
      } finally {
        clearTimeout(timeout)
      }
    } catch (e) {
      last = e
      if (attempt < attempts) await sleep(1500 * attempt)
    }
  }

  throw last || new Error("Falha OSRM sem detalhe")
}

async function buildRoadAccess() {
  const selected = routes.features
    .filter(f => ROAD_IDS.includes(f.properties?.id))
    .sort((a, b) => routeIdNumber(a.properties?.id) - routeIdNumber(b.properties?.id))

  if (selected.length !== 9) {
    throw new Error(`Foram localizadas ${selected.length} das 9 rotas priorizadas`)
  }

  const endpoint = String(
    process.env.JOAJU_OSRM_ENDPOINT || "https://router.project-osrm.org"
  ).replace(/\/$/, "")

  const features = []
  const materializedAt = new Date().toISOString()

  for (let rIndex = 0; rIndex < selected.length; rIndex++) {
    const routeFeature = selected[rIndex]
    const p = routeFeature.properties || {}

    if (routeFeature.geometry?.type !== "LineString") {
      throw new Error(`${p.id} não é LineString`)
    }

    const coords = routeFeature.geometry.coordinates || []
    if (coords.length < 2) throw new Error(`${p.id} possui menos de dois pontos`)

    const coordText = coords
      .map(c => `${Number(c[0]).toFixed(6)},${Number(c[1]).toFixed(6)}`)
      .join(";")

    const url =
      `${endpoint}/route/v1/driving/${coordText}` +
      `?steps=true&geometries=geojson&overview=false&annotations=false`

    console.log(`OSRM · ${rIndex + 1}/9 · ${p.id} · ${p.nome || ""}`)

    const j = await fetchJsonWithRetry(url)
    const route = j.routes[0]

    if (route.legs.length !== coords.length - 1) {
      throw new Error(`${p.id} · número de trechos OSRM divergente`)
    }

    const names = String(p.municipios || "")
      .split(",")
      .map(x => x.trim())
      .filter(Boolean)

    for (let i = 0; i < route.legs.length; i++) {
      const leg = route.legs[i]
      const line = legCoordinates(leg)

      if (line.length < 2) {
        throw new Error(`${p.id} · geometria ausente no trecho ${i + 1}`)
      }

      const wpA = j.waypoints?.[i]
      const wpB = j.waypoints?.[i + 1]

      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: line
        },
        properties: {
          id_trecho: `ACESS-${p.id}-${String(i + 1).padStart(2, "0")}`,
          id_rota: p.id,
          nome_rota: p.nome,
          ordem_trecho: i + 1,
          origem: names[i] || `Ponto ${i + 1}`,
          destino: names[i + 1] || `Ponto ${i + 2}`,
          tipo_registro_rota: p.tipo_registro,
          status_institucional_rota: p.status_institucional,
          classe_base_acessibilidade: p.classe_base_acessibilidade,
          natureza: "Estimativa científica de acessibilidade pela rede viária contemporânea",
          distancia_rodoviaria_km: Number((leg.distance / 1000).toFixed(1)),
          duracao_estimada_sem_trafego_min: Math.round(leg.duration / 60),
          resumo_vias: leg.summary || "Não informado pelo motor",
          perfil_roteamento: "driving",
          motor_roteamento: "OSRM route service",
          endpoint_consultado: endpoint,
          fonte_rede: "OpenStreetMap contributors",
          licenca_rede: "ODbL 1.0",
          data_materializacao: materializedAt,
          corte_base_joaju: cut,
          data_versao_rede: j.data_version || "Não informada",
          origem_solicitada_lon: coords[i][0],
          origem_solicitada_lat: coords[i][1],
          destino_solicitado_lon: coords[i + 1][0],
          destino_solicitado_lat: coords[i + 1][1],
          origem_ajustada_lon: wpA?.location?.[0],
          origem_ajustada_lat: wpA?.location?.[1],
          destino_ajustado_lon: wpB?.location?.[0],
          destino_ajustado_lat: wpB?.location?.[1],
          distancia_ajuste_origem_m: Number((wpA?.distance || 0).toFixed(1)),
          distancia_ajuste_destino_m: Number((wpB?.distance || 0).toFixed(1)),
          status_revisao: "Não validado em campo",
          nota_especifica: roadAccessSpecificNote(p.id),
          limitacoes: "Tempo sem trânsito em tempo real. O resultado pode incluir vias privadas, sazonais, não pavimentadas, interrompidas ou com restrições ausentes na base.",
          uso_operacional: "Não representa o traçado cultural, histórico, aquático ou oficialmente aprovado da rota. Não constitui recomendação de viagem, autorização de acesso ou validação das condições da via.",
          natureza_projeto: "Projeto de pesquisa científica",
          referencial_metodologico: "Aplicação e adaptação experimental do marco PRICI"
        }
      })
    }

    if (rIndex < selected.length - 1) await sleep(1200)
  }

  const routeCount = new Set(features.map(f => f.properties.id_rota)).size

  if (routeCount !== 9) throw new Error(`OSRM concluiu ${routeCount}/9 rotas`)
  if (features.length !== 37) throw new Error(`OSRM produziu ${features.length}/37 trechos esperados`)

  return {
    type: "FeatureCollection",
    name: "acessibilidade_rodoviaria_estimada_rotas_base_externa",
    features,
    atlas_metadata: {
      produto: "Acessibilidade rodoviária estimada das rotas com base externa",
      corte_base_joaju: cut,
      data_materializacao: materializedAt,
      rotas_priorizadas: 9,
      trechos: features.length,
      motor: "OSRM route service",
      rede: "OpenStreetMap",
      licenca_rede: "ODbL 1.0",
      natureza: "estimativa técnica não validada em campo",
      nota_temporal: "A base de propostas corresponde ao corte JOAJU de 10/08/2026. A rede viária é a disponibilizada pelo endpoint OSRM na data de materialização."
    }
  }
}

function validateProduct(data, name, geometryTypes, expectedCount) {
  if (data?.type !== "FeatureCollection" || !Array.isArray(data.features)) {
    throw new Error(`${name} não é FeatureCollection`)
  }

  if (data.features.length !== expectedCount) {
    throw new Error(`${name} · ${data.features.length}/${expectedCount} registros`)
  }

  for (const [i, f] of data.features.entries()) {
    if (!geometryTypes.includes(f?.geometry?.type)) {
      throw new Error(`${name} · geometria inválida no registro ${i + 1} · ${f?.geometry?.type}`)
    }
  }
}

console.log("")
console.log("JOAJU MS · MATERIALIZAÇÃO DAS ANÁLISES DERIVADAS")
console.log(`Rotas · ${routes.features.length}`)
console.log(`Unidades de conservação · ${ucs.features.length}`)
console.log(`Cavidades CANIE · ${caves.features.length}`)
console.log("")

const routeUc = buildRouteUc()
const cavesRoutes = buildCavesRoutes()
const cavesUc = buildCavesUc()

validateProduct(routeUc, "Rotas × UCs", ["Point"], 8)
validateProduct(cavesRoutes, "Cavidades × rotas", ["Point"], 303)
validateProduct(cavesUc, "Cavidades × UCs", ["Point"], 63)

console.log(`Rotas × UCs · ${routeUc.features.length}`)
console.log(`Cavidades até 50 km das rotas · ${cavesRoutes.features.length}`)
console.log(`Cavidades dentro de UCs · ${cavesUc.features.length}`)

let road = null

if (!skipRoad) {
  road = await buildRoadAccess()
  validateProduct(road, "Acessibilidade rodoviária", ["LineString"], 37)
  console.log(`Acessibilidade rodoviária · ${road.features.length} trechos · 9 rotas`)
} else {
  console.log("TESTE LOCAL · acessibilidade rodoviária ignorada por PATCH09_SKIP_ROAD=1")
}

const products = [
  ["interacoes_rotas_unidades_conservacao.geojson", routeUc],
  ["cavidades_proximas_rotas_estudo.geojson", cavesRoutes],
  ["cavidades_em_unidades_conservacao.geojson", cavesUc]
]

if (road) {
  products.unshift([
    "acessibilidade_rodoviaria_estimada_rotas_base_externa.geojson",
    road
  ])
}

if (!skipRoad) {
  const outDir = path.join(root, "dados", "precalculados")
  const resultDir = path.join(root, "resultados_analises", cut)

  fs.mkdirSync(outDir, { recursive: true })
  fs.mkdirSync(resultDir, { recursive: true })

  for (const [name, data] of products) {
    const target = path.join(outDir, name)
    const result = path.join(resultDir, name)
    const tmp = `${target}.tmp`

    fs.writeFileSync(tmp, JSON.stringify(data), "utf8")
    fs.renameSync(tmp, target)
    fs.writeFileSync(result, JSON.stringify(data), "utf8")
  }

  const validation = {
    status: "PASS",
    corte_base_joaju: cut,
    materializado_em: new Date().toISOString(),
    fontes_base: {
      rotas: 32,
      unidades_conservacao: 8,
      cavernas_canie: 341
    },
    produtos: {
      acessibilidade_rodoviaria_estimada_rotas_base_externa: {
        registros: road.features.length,
        rotas: 9,
        expectedGeometry: "LineString",
        fonte_externa: "OSRM + OpenStreetMap"
      },
      interacoes_rotas_unidades_conservacao: {
        registros: routeUc.features.length,
        expectedGeometry: "Point"
      },
      cavidades_proximas_rotas_estudo: {
        registros: cavesRoutes.features.length,
        limiar_km: 50,
        expectedGeometry: "Point"
      },
      cavidades_em_unidades_conservacao: {
        registros: cavesUc.features.length,
        expectedGeometry: "Point"
      }
    },
    observacoes: [
      "As três análises CNUC/CANIE usam somente snapshots locais do corte 10/08/2026.",
      "A acessibilidade rodoviária usa as nove rotas priorizadas do corte JOAJU e a rede disponibilizada pelo endpoint OSRM na data de materialização.",
      "Nenhum resultado implica autorização de acesso, validação turística, segurança da via, plano de manejo ou validação de campo."
    ]
  }

  const validationPath = path.join(
    root,
    "docs",
    "VALIDACAO_ANALISES_DERIVADAS_2026-08-10.json"
  )

  fs.mkdirSync(path.dirname(validationPath), { recursive: true })
  fs.writeFileSync(validationPath, JSON.stringify(validation, null, 2), "utf8")

  console.log("")
  console.log("ANÁLISES DERIVADAS MATERIALIZADAS")
  for (const [name, data] of products) {
    console.log(`${name} · ${data.features.length} registros`)
  }
  console.log(`Validação · ${path.relative(root, validationPath)}`)
}
