# Protocolo ICD · Cobertura e qualidade dos dados · 250 km²

## Objeto

O ICD avalia a qualidade e a cobertura da informação disponível para os módulos territoriais. Não representa potencial territorial.

## Módulos considerados

IPG, PEIC, IATI, IAT, ISA, ICT e IPAE.

## Dimensões

- completude
- atualidade
- adequação posicional
- completude temática
- rastreabilidade

## Fórmula

`ICD100 = 100 × média igual das cinco dimensões`

Cada dimensão recebe peso de 0,20.

A implementação atribui adequação posicional parcial ao ICT porque seus valores são contexto municipal ponderado por área e não localização individual dos registros.

## Regra de ausência

Um módulo sem resultado não deve ser transformado em valor territorial zero. Sua ausência afeta a dimensão de completude da informação conforme a implementação.

## Limites

O ICD não valida a veracidade substantiva de cada fonte nem substitui revisão metodológica ou institucional.


## Materialização do corte de 10/08/2026

O ICD foi materializado sobre as 1.554 células da malha mestra R5 a partir dos sete produtos territoriais já materializados

IPG, PEIC, IATI, IAT, ISA, ICT e IPAE.

A materialização não executa nova captura externa nem recalcula esses sete índices.

### Regra de nulos

Um valor `null` em IPG, PEIC ou IATI significa ausência de resultado territorial para a célula e não valor zero. Na dimensão de completude, esse módulo é contado como ausente. A mesma ausência também não recebe adequação posicional ou completude temática artificial.

### Atualidade operacional

Na implementação ICD-01, a dimensão de atualidade verifica se o módulo possui referência temporal documentada, como data de captura, data de cálculo ou data de corte. Essa dimensão não pretende estimar sozinha a obsolescência substantiva de uma fonte.

### Adequação posicional do ICT

O ICT conserva adequação posicional parcial quando utiliza contexto municipal ponderado por área, pois esse procedimento não equivale à localização individual dos estabelecimentos dentro da célula.

### Validação

O produto deve conter as mesmas 1.554 células, os mesmos `hex_id` e exatamente a mesma geometria da malha R5.

A validação isolada é registrada em `docs/VALIDACAO_ICD_250KM2_2026-08-10.json`.
