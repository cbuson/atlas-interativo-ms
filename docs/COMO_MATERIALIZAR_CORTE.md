# Como materializar um novo corte

A distribuição GitHub já contém o corte territorial fechado de 10/08/2026.

Este procedimento é necessário somente para reproduzir o processamento ou preparar um corte posterior.

## Preparação

```bash
npm ci
npx playwright install chromium
```

No PowerShell

```powershell
$env:CORTE_DATA="2026-08-10"
npm run preparar-snapshot
```

A preparação tenta atualizar as fontes operacionais e gera os snapshots locais disponíveis.

## Fechamento territorial

```powershell
$env:CORTE_DATA="2026-08-10"
npm run fechar-snapshot
```

O fechamento executa os materializadores e rejeita divergência de malha, geometrias, identificadores ou cobertura obrigatória.

## Validação do produto público

```bash
npm run validar-precalculados
npm run audit-release
```

Os produtos públicos fechados ficam em `dados/precalculados/`.

Diretórios de execução como `resultados_indices/` são artefatos reproduzíveis e não precisam permanecer versionados no repositório GitHub.

## Novo corte

Um corte posterior deve atualizar explicitamente `VERSION.json`, documentação, metadados e ponteiros de publicação. Um workflow não deve substituir silenciosamente o corte publicado.
