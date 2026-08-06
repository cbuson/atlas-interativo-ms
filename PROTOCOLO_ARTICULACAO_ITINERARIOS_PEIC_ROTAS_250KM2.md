# Protocolo da camada combinada de articulação territorial de itinerários — 250 km²

## Finalidade

Identificar células capazes de articular vários itinerários culturais combinando a estrutura cultural documentada e a convergência cartográfica das 32 rotas propostas pelo projeto.

A camada não afirma que as rotas estejam operacionais, aprovadas ou validadas em campo. Indica prioridades de investigação territorial.

## Componente cultural independente

`PEIC100 = 100 × (0,45 Dn + 0,25 Sn + 0,20 Qn + 0,10 Cn)`

As rotas não entram no PEIC. Isso evita que as propostas autorais confirmem circularmente a própria estrutura cultural.

## Componente de convergência de rotas

`R100 = 100 × (0,70 Rd + 0,30 Re)`

- `Rd` corresponde ao número de rotas distintas que atravessam diretamente a célula, normalizado pelo percentil 95 da distribuição positiva. Na versão atual, o teto é 5 rotas.
- `Re` corresponde ao número de rotas distintas presentes na célula e nas seis células vizinhas, normalizado pelo percentil 95. Na versão atual, o teto é 8 rotas.

A base `dados/convergencia_rotas_itinerarios_250km2.js` é pré-calculada para evitar repetir interseções entre 1.690 hexágonos e 32 geometrias a cada clique.

## Índice combinado

`IATI100 = 0,70 PEIC100 + 0,30 R100`

A estrutura cultural representa 70% do resultado. A convergência das rotas representa no máximo 30%.

Quando uma célula não possui dimensão cultural não sensível, o PEIC é nulo e a contribuição máxima das rotas fica limitada a 30 pontos. Essas células são apresentadas como convergência cartográfica a validar.

## Classes

- menos de 25 — conexão incipiente
- 25 a menos de 45 — articulação baixa
- 45 a menos de 60 — articulação potencial
- 60 a menos de 75 — nodo articulador prioritário
- 75 a 100 — nodo articulador estratégico

## Condições auxiliares

Um nodo prioritário para validação exige IATI igual ou superior a 60, suporte cultural não sensível e ao menos duas rotas diretas.

Um nodo estratégico para validação exige IATI igual ou superior a 75, suporte cultural não sensível e ao menos três rotas diretas.

Essas categorias não equivalem a prioridade pública, viabilidade financeira, consentimento comunitário, produto turístico ou aprovação pelo PRICI.
