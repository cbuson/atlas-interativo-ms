# IAT-01 v1.8.0

Corte do snapshot: 2026-08-10

## Fórmula congelada

`IAT100 = 100 × (0,30 RPn + 0,20 EVn + 0,25 DPn + 0,15 NUn + 0,10 MMn)`

- RPn — densidade normalizada da rede pavimentada
- EVn — densidade normalizada da rede vicinal
- DPn — proximidade normalizada à rede pavimentada
- NUn — proximidade normalizada à sede urbana
- MMn — multimodalidade ferroviária e aérea

`MMn = 0,50 × componente aeroportos + 0,50 × componente ferrovias`

O peso efetivo do IAT é portanto 5% para proximidade aeroportuária e 5% para proximidade ferroviária dentro do componente multimodal de 10%.

## Fontes operacionais

O cálculo vigente utiliza as seis dependências reais do código do Atlas:

1. rodovias estaduais pavimentadas e duplicadas
2. rodovias federais
3. estradas vicinais
4. ferrovias concedidas em operação
5. aeroportos e aeródromos
6. sedes municipais

A materialização falha se qualquer dependência necessária não retorna geometria utilizável. Nenhum valor é inventado.

## Normalização

Os componentes são normalizados segundo o método já implementado no Atlas. Densidades usam normalização positiva e distâncias usam normalização inversa, com limites calculados a partir do percentil 95.

## Sensibilidade

O código vigente executa 500 simulações de perturbação dos pesos para registrar estabilidade do índice.

## Interpretação

IAT é um índice relativo de acessibilidade territorial. Não mede trânsito em tempo real, estado de conservação da via, autorização de acesso, segurança da viagem ou tempo efetivo de deslocamento.
