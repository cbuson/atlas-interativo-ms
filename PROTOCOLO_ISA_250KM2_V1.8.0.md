# Protocolo ISA · Sensibilidade ambiental · 250 km²

## Objeto

O ISA representa sensibilidade ambiental relativa. Valor alto significa maior presença das dimensões ambientais utilizadas e não melhor desempenho territorial.

## Componentes

- UC, percentual de cobertura por unidades de conservação
- ZA, percentual de zonas de amortecimento
- corredores, percentual de corredores ecológicos
- uso restrito, percentual de áreas de uso restrito configuradas

## Fórmula

`ISA100 = 100 × (0,25 UC + 0,25 ZA + 0,25 corredores + 0,25 uso_restrito)`

Cada componente é limitado ao intervalo de 0 a 1 antes da combinação.

## Regra de área de borda

Quando a célula já foi recortada pelo limite de Mato Grosso do Sul, o denominador de cobertura é **a área efetiva da própria geometria recortada**. A fração estadual não deve ser aplicada novamente. Esta regra evita dupla redução do denominador nas células periféricas.

## Fontes configuradas

Camadas ambientais oficiais do IMASUL/PIN MS usadas pela implementação, incluindo UCs, zonas de amortecimento, corredores ecológicos e áreas de uso restrito.

## Limites

O ISA não substitui licenciamento, zoneamento, avaliação de impacto ou verificação ambiental de campo.
