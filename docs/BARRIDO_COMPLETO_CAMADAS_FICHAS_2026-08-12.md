# Barrido completo de camadas e fichas · 12/08/2026

## Escopo

Auditoria integral da distribuição PATCH 15 e correções incorporadas como PATCH 16 antes da publicação. Foram verificados os 153 registros de configuração, o DATA_MANIFEST, o RASTER_MANIFEST, os produtos precalculados, a Ficha Territorial R5 e os arquivos locais usados pelas fichas.

## Resultado estrutural

- 153 configurações de camada
- 90 conjuntos vetoriais no DATA_MANIFEST, dos quais 89 correspondem diretamente a camadas e 1 é auxiliar interno de convergência
- 9 snapshots raster/KMZ
- 12 produtos precalculados declarados, incluindo a família territorial fechada e quatro análises derivadas
- 50.912 feições vetoriais locais percorridas
- 0 geometrias GeoJSON inválidas encontradas
- 14 registros documentais sem geometria, todos preservados como ausência explícita de vínculo espacial
- 1.554 fichas R5 e oito índices verificados contra os produtos precalculados

## Erro de carregamento encontrado e corrigido

A configuração do IPG possuía simultaneamente `precomputedUrl = dados/precalculados/ipg_250km2.geojson` e um fallback histórico no `DATA_MANIFEST` com 1.690 células. A função genérica `ensureLayerLoaded()` consultava o manifesto antes do produto fechado. Assim, a ativação normal do IPG podia abrir a grade histórica apesar de a ficha e o snapshot usarem R5.

PATCH 16 dá prioridade a qualquer produto `precomputedUrl` com `closedSnapshotDate` antes de consultar `window.ATLAS_DATA` ou `DATA_MANIFEST`. O fallback histórico continua preservado apenas para rastreabilidade e não é usado na ativação normal do corte fechado.

## Segundo erro de ativação encontrado e corrigido

Os modos de visualização remota direta `arcgisMap`, `xyzTile`, `kmzRemote` e `cogRemote` eram classificados pela interface como se exigissem preparação. Entretanto, a própria função de carregamento já sabe abri-los diretamente e o cartão não oferecia um botão de preparação equivalente. Na distribuição atual isso podia bloquear quatro mapas ArcGIS sem snapshot local, `mapa_altimetria_ms`, `mapa_bacias_uepgrh`, `mapa_disponibilidade_hidrica` e `mapa_macrozoneamento_zae`.

PATCH 16 diferencia visualização remota direta de captura/processamento. Esses quatro mapas voltam a ter caminho de ativação normal sem disparar captura ou materialização.

## Achado de escopo espacial

A auditoria identificou registros que não intersectam a R5 em vários snapshots locais provenientes de capturas por envelope retangular. Exemplos incluem localidades IBGE de UFs vizinhas, resultados OSM e determinados serviços ArcGIS. Esses registros são estruturalmente válidos e carregam, mas não pertencem ao domínio territorial R5 de Mato Grosso do Sul. O arquivo `BARRIDO_COMPLETO_CAMADAS_FICHAS_2026-08-12.csv` contém o total por conjunto.

Este achado não altera os oito índices fechados. Recomenda-se tratá-lo em saneamento específico de snapshots de fonte, com preservação dos arquivos originais de captura e sem recalcular retroativamente o corte 10/08/2026.
