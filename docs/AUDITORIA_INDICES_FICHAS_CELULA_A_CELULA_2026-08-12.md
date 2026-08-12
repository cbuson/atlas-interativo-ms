# PATCH 17 · auditoria célula a célula dos oito índices e correção visual

## Diagnóstico dos casos mostrados nas capturas

Os valores exibidos nas fichas correspondem exatamente ao snapshot fechado. O problema não era perda de valores entre os oito GeoJSON e a Ficha Territorial.

Exemplos conferidos:

- `HX-2-38` · IPG 39.32 · PEIC None · IATI 7.82 · IAT 39.22 · ISA 12.73 · ICT 45.16 · IPAE 17.37 · ICD 89.48
- `HX--3-39` · IPG None · PEIC None · IATI 1.29 · IAT 21.26 · ISA 25 · ICT 100 · IPAE 6.62 · ICD 80.91
- `HX--3-36` · IPG None · PEIC None · IATI 6.54 · IAT 29.04 · ISA 29.92 · ICT 64.45 · IPAE 15.52 · ICD 80.91

Nos exemplos acima, PEIC `null` é um nulo real do corte e não uma falha de carregamento.

## Problema visual encontrado

A camada PEIC desenhava também células sem PEIC numérico. Em 1.399 células sem evidência documental, a ausência de `__atlas_color` fazia o renderer cair na cor verde padrão da camada. Assim, uma célula podia aparecer verde e selecionável embora sua ficha dissesse corretamente `sem evidência cultural suficiente`.

IATI também desenhava 529 células sem resultado em cinza. IPG já ocultava corretamente as células sem evidência.

Isso criava a impressão de que a ficha não tinha carregado o índice, quando na realidade o mapa estava desenhando células que não possuíam valor.

## Regra corrigida

- IPG · desenha somente 57 células com valor numérico.
- PEIC · desenha 82 células com valor numérico e preserva em cinza 73 contextos comunitários protegidos sem PEIC numérico. As outras 1.399 células sem evidência documental não são desenhadas.
- IATI · desenha somente 1.025 células com valor numérico. As 529 células sem resultado não são desenhadas.
- IAT, ISA, ICT, IPAE e ICD · desenham as 1.554 células porque possuem cobertura numérica integral.

A Ficha Territorial continua mostrando os oito módulos para qualquer célula R5 selecionada. `null` em IPG, PEIC ou IATI continua sendo um resultado metodológico legítimo.

## Cobertura fechada

| Índice | Com valor | Null |
|---|---:|---:|
| IPG | 57 | 1497 |
| PEIC | 82 | 1472 |
| IATI | 1025 | 529 |
| IAT | 1554 | 0 |
| ISA | 1554 | 0 |
| ICT | 1554 | 0 |
| IPAE | 1554 | 0 |
| ICD | 1554 | 0 |

## Outras correções

- gradientes de IPG, PEIC e IATI passam a ter fallback explícito de 0–100
- `null` nunca passa por `Number(null)` no gradiente
- cartões das camadas esparsas mostram células com valor, não `1554 registros` como se todas tivessem índice
- a ficha da camada informa produto total, células com valor, contextos especiais e células não desenhadas
- a ficha territorial explica que uma linha sem barra em IPG, PEIC ou IATI não significa erro de carregamento

Nenhum valor dos oito índices foi recalculado.
