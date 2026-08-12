# Preparar o snapshot completo no Windows

A distribuição GitHub já contém o snapshot territorial fechado de 10/08/2026. Este procedimento é para reprodução, atualização de fontes ou preparação de um corte posterior.

## Pré-requisitos

- Node.js 22 ou superior
- conexão à Internet
- espaço em disco para snapshots grandes

## Execução

```powershell
npm ci
npx playwright install chromium
$env:CORTE_DATA="2026-08-10"
npm run preparar-snapshot
```

O comando sobe um servidor HTTP temporário e tenta materializar as fontes configuradas.

Snapshots integrais como rede hídrica e geomorfologia podem ultrapassar o limite normal de arquivo do GitHub. Eles podem existir no computador de trabalho mesmo quando não são versionados no repositório.

## Fechamento territorial

```powershell
$env:CORTE_DATA="2026-08-10"
npm run fechar-snapshot
```

Depois execute

```powershell
npm run validar-precalculados
npm run audit-release
```

Nenhum valor ausente deve ser preenchido artificialmente para forçar o fechamento.
