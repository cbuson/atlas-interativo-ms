# Protocolo IAT · Acessibilidade territorial · 250 km²

## Objeto

O IAT mede acessibilidade territorial relativa a partir de infraestrutura de mobilidade. É independente do IPG.

## Componentes implementados

- RPn, extensão normalizada de rodovias pavimentadas na célula
- EVn, extensão normalizada de estradas vicinais
- DPn, proximidade normalizada à rede pavimentada
- NUn, proximidade normalizada a sedes municipais
- MMn, componente multimodal composto por aeroportos e ferrovias

`MMn = 0,50 × aeron + 0,50 × fern`

## Fórmula

`IAT100 = 100 × (0,30 RPn + 0,20 EVn + 0,25 DPn + 0,15 NUn + 0,10 MMn)`

A normalização positiva e de distância usa limites robustos calculados na execução conforme a implementação do Atlas.

## Fontes configuradas

AGESUL/PIN MS, DNIT/PIN MS, AGRAER/PIN MS, Infra S.A./ANTT/ANAC e sedes municipais IBGE, conforme as camadas carregadas na execução.

## Limites

O índice não mede trânsito, tempo real de viagem, autorização de acesso, segurança viária ou condição momentânea das estradas.
