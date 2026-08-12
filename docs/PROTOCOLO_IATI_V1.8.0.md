# Protocolo IATI v1.8.0

**Corte** 2026-08-10

## Fórmula congelada

`IATI100 = 0,70 × PEIC100 + 0,30 × R100`

A convergência cartográfica das rotas é:

`R100 = 100 × (0,70 Rd + 0,30 Re)`

onde `Rd` é a convergência direta de rotas na célula e `Re` a convergência no entorno imediato, ambas normalizadas pelos limites definidos pelo cálculo vigente.

## Dependência

O IATI só é materializado depois de o PEIC estar validado como `PASS` na malha territorial mestra de 1.554 células.

## Ausência de PEIC

Mantém-se a regra já usada pelo Atlas. Quando `peic_100 = null`, o termo cultural contribui com zero e a convergência de rotas pode aportar no máximo 30 pontos.

Quando não existe PEIC nem convergência de rotas, `iati_100 = null`. A ausência de evidência não é convertida em zero artificial.

## Regra visual

Valores baixos são representados por tons claros e valores altos por tons escuros.

## Interpretação

O IATI identifica articulação territorial potencial entre estrutura cultural documentada e convergência cartográfica das rotas propostas. Não oficializa rotas, não substitui validação territorial e não constitui decisão de investimento.
