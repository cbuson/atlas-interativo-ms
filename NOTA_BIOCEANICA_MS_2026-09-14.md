# JOAJU MS · atualização contextual da Rota Bioceânica · 14/09/2026

Foi adicionada ao painel de Rotas a camada **Rota Bioceânica em Mato Grosso do Sul** (`ROTA-INST-001`).

## Escopo

A camada representa somente o trecho em Mato Grosso do Sul. A entrada estadual é representada no setor de Três Lagoas, a partir da divisa SP/MS pela BR-262. O eixo segue por Água Clara, Ribas do Rio Pardo e Campo Grande; a partir de Campo Grande continua pelo eixo BR-060/BR-267 por Sidrolândia, Nioaque, Guia Lopes da Laguna e Jardim até Porto Murtinho.

A saída internacional é indicada em Porto Murtinho, em direção a Carmelo Peralta, Paraguai, sem incorporar geometria estrangeira ao recorte estadual.

## Geometria

O traçado foi extraído da camada de rodovias federais já materializada no pacote (`dados/materializados/2026_08_10/rodovias_federais.js`), utilizando BR-262, BR-060 e BR-267. A continuidade dentro da área urbana de Campo Grande é generalizada porque a base rodoviária apresenta descontinuidade cartográfica nesse setor. Essa generalização é declarada nos metadados.

Extensão cartográfica aproximada calculada sobre a geometria incorporada: **774,8 km**. Não deve ser interpretada como distância operacional de viagem.

## Separação analítica

A Bioceânica foi incorporada como **corredor institucional de contexto**, não como 33ª proposta metodológica. Permanecem:

- 32 propostas metodológicas sujeitas às análises internas relacionadas ao PRICI;
- 1 corredor institucional contextual.

O registro possui `participa_analise_prici=false` e `participa_convergencia_rotas=false`. Portanto, a atualização não modifica os índices territoriais fechados nem os produtos de convergência derivados das 32 propostas.

## Fontes institucionais usadas para definir o corredor

- Ministério do Planejamento e Orçamento. Rota 4 — Bioceânica de Capricórnio.
- Superintendência do Desenvolvimento do Centro-Oeste (SUDECO). *Estudo da Dinâmica dos Arranjos Produtivos Locais do Estado de Mato Grosso do Sul e sua Relação com a Multimodalidade de Transporte, Visando Subsídios para seu Fortalecimento*. Página institucional criada em 16/04/2026.
- Governo de Mato Grosso do Sul / SES. Documentação de regionalização que identifica, a partir de Campo Grande, Sidrolândia, Nioaque, Guia Lopes da Laguna, Jardim e Porto Murtinho.
- PIN MS / SEMADESC. Camada de rodovias federais utilizada para a geometria local.

## Validação

A auditoria de release posterior à incorporação registrou **232 PASS, 0 WARN e 0 FAIL**.
