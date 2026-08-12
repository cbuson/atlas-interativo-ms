import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import crypto from "node:crypto"
import { spawnSync } from "node:child_process"

const root = path.resolve(process.cwd())
const sourcePage = "https://dados.gov.br/dados/conjuntos-dados/cobertura_movel"
const apiBase = "https://dados.gov.br/dados/api/publico/conjuntos-dados"
const knownPortalFileDate = "2026-01-27"

function norm(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

function csvEscape(v) {
  const s = String(v ?? "")
  return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function detectDelimiter(line) {
  const counts = [
    [",", (line.match(/,/g) || []).length],
    [";", (line.match(/;/g) || []).length],
    ["\t", (line.match(/\t/g) || []).length]
  ].sort((a,b)=>b[1]-a[1])
  return counts[0][1] > 0 ? counts[0][0] : ","
}

function parseCsv(text, delimiter) {
  const rows = []
  let row = []
  let field = ""
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += c
      }
      continue
    }

    if (c === '"') {
      quoted = true
    } else if (c === delimiter) {
      row.push(field)
      field = ""
    } else if (c === "\n") {
      row.push(field.replace(/\r$/, ""))
      rows.push(row)
      row = []
      field = ""
    } else {
      field += c
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""))
    rows.push(row)
  }

  return rows.filter(r => r.some(v => String(v).trim() !== ""))
}

function decodeBuffer(buf) {
  const utf = new TextDecoder("utf-8", { fatal: false }).decode(buf)
  const bad = (utf.match(/\uFFFD/g) || []).length
  if (bad <= 3) return { text: utf.replace(/^\uFEFF/, ""), encoding: "utf-8" }
  const win = new TextDecoder("windows-1252").decode(buf)
  return { text: win.replace(/^\uFEFF/, ""), encoding: "windows-1252" }
}

function walk(dir) {
  const out = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

function latestCandidateZip() {
  const dirs = [
    path.join(os.homedir(), "Downloads"),
    path.join(os.homedir(), "Desktop"),
    path.join(root, "capturas_fontes_2026_08_10"),
    root
  ].filter(fs.existsSync)

  const files = []
  for (const dir of dirs) {
    for (const f of walk(dir)) {
      if (!f.toLowerCase().endsWith(".zip")) continue
      const n = norm(path.basename(f))
      if (n.includes("cobertura") && (n.includes("movel") || n.includes("anatel"))) {
        const st = fs.statSync(f)
        files.push({ file: f, mtime: st.mtimeMs })
      }
    }
  }

  files.sort((a,b)=>b.mtime-a.mtime)
  return files[0]?.file || null
}

function findStringsDeep(value, out = []) {
  if (typeof value === "string") out.push(value)
  else if (Array.isArray(value)) value.forEach(v => findStringsDeep(v, out))
  else if (value && typeof value === "object") Object.values(value).forEach(v => findStringsDeep(v, out))
  return out
}

async function tryPortalDownload(dest) {
  const names = [
    "Infraestrutura - Cobertura da Telefonia Móvel",
    "Cobertura Móvel",
    "Cobertura da Telefonia Móvel"
  ]

  for (const name of names) {
    try {
      const url = `${apiBase}?nomeConjuntoDados=${encodeURIComponent(name)}&pagina=1`
      const r = await fetch(url, { headers: { "User-Agent": "JOAJU-MS/1.8.0" } })
      if (!r.ok) continue

      const list = await r.json()
      const strings = findStringsDeep(list)
      const ids = strings.filter(s => /^[a-zA-Z0-9_-]{8,}$/.test(s))

      const detailCandidates = []

      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && typeof item === "object") {
            for (const key of ["id", "identificador", "name", "nome", "slug"]) {
              if (typeof item[key] === "string") detailCandidates.push(item[key])
            }
          }
        }
      }

      detailCandidates.push(...ids)

      for (const id of [...new Set(detailCandidates)]) {
        try {
          const d = await fetch(`${apiBase}/${encodeURIComponent(id)}`, {
            headers: { "User-Agent": "JOAJU-MS/1.8.0" }
          })
          if (!d.ok) continue
          const detail = await d.json()
          const all = findStringsDeep(detail)

          const links = all.filter(s =>
            /^https?:\/\//i.test(s) &&
            /\.zip(?:$|\?)/i.test(s) &&
            /cobertura|movel|anatel/i.test(s)
          )

          for (const link of links) {
            const rr = await fetch(link, { headers: { "User-Agent": "JOAJU-MS/1.8.0" } })
            if (!rr.ok) continue
            const ab = await rr.arrayBuffer()
            if (ab.byteLength < 1000) continue
            fs.writeFileSync(dest, Buffer.from(ab))
            return { file: dest, link }
          }
        } catch {}
      }
    } catch {}
  }

  return null
}

function expandZip(zipFile, dest) {
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })

  const ps = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-Command",
      `Expand-Archive -LiteralPath '${zipFile.replace(/'/g,"''")}' -DestinationPath '${dest.replace(/'/g,"''")}' -Force`
    ],
    { encoding: "utf8" }
  )

  if (ps.status !== 0) {
    throw new Error(`Expand-Archive falhou\n${ps.stderr || ps.stdout || ""}`)
  }
}

function chooseUfColumn(headers, dataRows) {
  const normalized = headers.map(norm)
  const preferred = ["uf","siglauf","sguf","estado","unidadefederativa"]

  for (const p of preferred) {
    const idx = normalized.indexOf(p)
    if (idx >= 0) return idx
  }

  const states = new Set([
    "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
    "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
  ])

  let best = -1
  let bestScore = 0

  for (let c = 0; c < headers.length; c++) {
    let tested = 0
    let hits = 0

    for (const row of dataRows.slice(0, 1000)) {
      const v = String(row[c] ?? "").trim().toUpperCase()
      if (!v) continue
      tested++
      if (states.has(v)) hits++
    }

    const score = tested ? hits / tested : 0
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }

  return bestScore >= 0.75 ? best : -1
}

function findColumn(headers, patterns) {
  const h = headers.map(norm)
  for (const p of patterns.map(norm)) {
    const idx = h.findIndex(x => x === p || x.includes(p))
    if (idx >= 0) return idx
  }
  return -1
}

const arg = process.argv[2] ? path.resolve(process.argv[2]) : null
const outDir = path.join(root, "dados", "fontes", "anatel", "cobertura_movel_ms")
const workDir = path.join(root, "temp", "cobertura_movel_anatel")
const autoZip = path.join(workDir, "cobertura_movel_anatel_oficial.zip")

fs.mkdirSync(outDir, { recursive: true })
fs.mkdirSync(workDir, { recursive: true })

let zipFile = arg && fs.existsSync(arg) ? arg : latestCandidateZip()
let downloadedLink = null

if (!zipFile) {
  console.log("")
  console.log("Nenhum ZIP local de cobertura móvel foi encontrado")
  console.log("Tentando localizar o recurso oficial pelo Portal Brasileiro de Dados Abertos")
  const got = await tryPortalDownload(autoZip)
  if (got) {
    zipFile = got.file
    downloadedLink = got.link
  }
}

if (!zipFile) {
  console.log("")
  console.log("AÇÃO NECESSÁRIA")
  console.log("Abra a página oficial")
  console.log(sourcePage)
  console.log("")
  console.log("No recurso Cobertura Móvel, clique em Acessar o recurso e baixe o ZIP CSV")
  console.log("Depois execute novamente")
  console.log("")
  console.log("node .\\EXTRAIR_COBERTURA_MOVEL_MS.mjs \"C:\\caminho\\arquivo.zip\"")
  process.exit(2)
}

console.log("")
console.log("JOAJU MS · EXTRAÇÃO ANATEL")
console.log(`ZIP usado · ${zipFile}`)

const extractDir = path.join(workDir, "extraido")
expandZip(zipFile, extractDir)

const csvFiles = walk(extractDir).filter(f => f.toLowerCase().endsWith(".csv"))
if (!csvFiles.length) throw new Error("O ZIP não contém arquivos CSV")

const batches = []
const fileReports = []

for (const csvFile of csvFiles) {
  const buf = fs.readFileSync(csvFile)
  const decoded = decodeBuffer(buf)
  const firstLine = decoded.text.split(/\r?\n/, 1)[0] || ""
  const delimiter = detectDelimiter(firstLine)
  const rows = parseCsv(decoded.text, delimiter)

  if (rows.length < 2) continue

  const headers = rows[0].map(x => String(x).trim())
  const dataRows = rows.slice(1)
  const ufIndex = chooseUfColumn(headers, dataRows)

  if (ufIndex < 0) {
    fileReports.push({
      arquivo: path.relative(extractDir, csvFile),
      ignorado: true,
      motivo: "coluna UF não identificada",
      encoding: decoded.encoding,
      delimiter
    })
    continue
  }

  const msRows = dataRows.filter(row =>
    String(row[ufIndex] ?? "").trim().toUpperCase() === "MS"
  )

  if (!msRows.length) {
    fileReports.push({
      arquivo: path.relative(extractDir, csvFile),
      ignorado: true,
      motivo: "nenhuma linha MS",
      encoding: decoded.encoding,
      delimiter,
      coluna_uf: headers[ufIndex]
    })
    continue
  }

  batches.push({
    file: csvFile,
    headers,
    rows: msRows,
    encoding: decoded.encoding,
    delimiter,
    ufIndex
  })

  fileReports.push({
    arquivo: path.relative(extractDir, csvFile),
    ignorado: false,
    linhas_ms: msRows.length,
    encoding: decoded.encoding,
    delimiter,
    coluna_uf: headers[ufIndex]
  })
}

if (!batches.length) {
  throw new Error("Nenhum CSV com registros de Mato Grosso do Sul foi identificado")
}

const allHeaders = []
const seen = new Set()

for (const b of batches) {
  for (const h of b.headers) {
    const key = norm(h)
    if (!seen.has(key)) {
      seen.add(key)
      allHeaders.push(h)
    }
  }
}

const headerIndex = new Map(allHeaders.map((h,i)=>[norm(h),i]))
const outputRows = []

for (const b of batches) {
  const localMap = b.headers.map(h => headerIndex.get(norm(h)))
  for (const row of b.rows) {
    const out = Array(allHeaders.length).fill("")
    row.forEach((v,i) => {
      const j = localMap[i]
      if (j !== undefined) out[j] = v
    })
    outputRows.push(out)
  }
}

const outCsv = path.join(outDir, "cobertura_movel_ms.csv")
const csvText = [
  allHeaders.map(csvEscape).join(","),
  ...outputRows.map(r => r.map(csvEscape).join(","))
].join("\r\n")

fs.writeFileSync(outCsv, "\uFEFF" + csvText, "utf8")

const techIdx = findColumn(allHeaders, ["tecnologia"])
const opIdx = findColumn(allHeaders, ["operadora","prestadora"])
const munIdx = findColumn(allHeaders, ["municipio","nome municipio","nomemunicipio"])
const geoIdx = findColumn(allHeaders, ["geocodigo","codigomunicipio","codmunicipio","ibge"])

const summary = {
  linhas_ms: outputRows.length,
  municipios: munIdx >= 0 ? new Set(outputRows.map(r => r[munIdx]).filter(Boolean)).size : null,
  geocodigos: geoIdx >= 0 ? new Set(outputRows.map(r => r[geoIdx]).filter(Boolean)).size : null,
  tecnologias: techIdx >= 0 ? [...new Set(outputRows.map(r => r[techIdx]).filter(Boolean))].sort() : [],
  operadoras: opIdx >= 0 ? [...new Set(outputRows.map(r => r[opIdx]).filter(Boolean))].sort() : []
}

const metadata = {
  fonte: "Agência Nacional de Telecomunicações · ANATEL",
  conjunto: "Infraestrutura - Cobertura da Telefonia Móvel",
  pagina_catalogo: sourcePage,
  recurso_portal: downloadedLink,
  data_atualizacao_recurso_catalogada: knownPortalFileDate,
  data_extracao: new Date().toISOString(),
  uf_extraida: "MS",
  arquivo_origem: path.basename(zipFile),
  sha256_origem: sha256(zipFile),
  arquivos_csv_encontrados: csvFiles.length,
  arquivos_processados: batches.length,
  colunas_saida: allHeaders,
  resumo: summary,
  arquivos: fileReports,
  observacao: "Os dados de cobertura da Anatel são estimativas teóricas e devem ser usados como referência. A extração não transforma ausência em zero e não altera os valores originais."
}

const outJson = path.join(outDir, "cobertura_movel_ms_metadata.json")
fs.writeFileSync(outJson, JSON.stringify(metadata, null, 2), "utf8")

console.log("")
console.log("EXTRAÇÃO CONCLUÍDA")
console.log(`CSV MS · ${outCsv}`)
console.log(`Metadados · ${outJson}`)
console.log(`Linhas MS · ${summary.linhas_ms}`)
if (summary.municipios !== null) console.log(`Municípios · ${summary.municipios}`)
if (summary.tecnologias.length) console.log(`Tecnologias · ${summary.tecnologias.join(" · ")}`)
if (summary.operadoras.length) console.log(`Operadoras · ${summary.operadoras.join(" · ")}`)
console.log("")
console.log("Nenhum dado foi incorporado ao Atlas ainda")
