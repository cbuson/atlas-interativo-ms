# JOAJU MS · dados precalculados v1.8.0

Esta pasta é o contrato público do Atlas em modo snapshot-first.

Arquivos gerados pelo fechamento do corte

- `malha_territorial_250km2.geojson`
- `ipg_250km2.geojson`
- `peic_250km2.geojson`
- `iati_250km2.geojson`
- `iat_250km2.geojson`
- `isa_250km2.geojson`
- `ict_250km2.geojson`
- `ipae_250km2.geojson`
- `icd_250km2.geojson`
- `ficha_territorial_250km2.geojson`
- `snapshot_metadata.json`

O Atlas público lê estes arquivos e não recalcula os índices ao ativar uma camada.

Para fechar um novo corte no computador de trabalho

```bash
npm install
npm run fechar-snapshot
```

O processo interrompe o fechamento se algum dos oito índices estiver incompleto. Não são criados zeros, coordenadas artificiais ou substituições silenciosas.
