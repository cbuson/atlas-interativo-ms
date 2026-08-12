# PATCH 15 · Painel Dados e Estatísticas snapshot-first

## Problemas vistos no celular

- cobertura dos oito índices aparecia como 0,0% antes de ativar visualmente as camadas
- território, comunidades, patrimônio e geodiversidade apareciam como zero na escala estadual
- `Number(null)` podia transformar ausência em zero dentro do painel
- o bloco de escala e município permanecia fixo durante a rolagem e cobria os resultados
- o estado da base podia aparecer como `núcleo parcial` mesmo com o snapshot territorial fechado

## Correções

- cobertura derivada de `dados/precalculados/ficha_territorial_250km2.geojson`
- IPG 57/1554
- PEIC 82/1554
- IATI 1025/1554
- IAT 1554/1554
- ISA 1554/1554
- ICT 1554/1554
- IPAE 1554/1554
- ICD 1554/1554
- `null` preservado
- escala estadual usa `DATA_MANIFEST` para conjuntos incorporados
- gráficos detalhados carregam apenas dados locais necessários
- nenhuma captura remota automática
- nenhum recálculo de índices
- toolbar de filtros deixa de ser sticky no celular
- badge passa a indicar `snapshot fechado`
- cache PWA revisionado para `2026-08-12-pwa-5-statistics-snapshotfix`

Este patch não altera a malha R5, os oito GeoJSON dos índices, a Ficha Territorial nem as quatro análises derivadas.
