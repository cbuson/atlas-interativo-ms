# Validação de regressão das fichas R5 · PATCH 14 · 12/08/2026

## Problemas reproduzidos nas capturas públicas

Foram observados dois comportamentos incorretos na interface publicada.

1. Células R5 com `PEIC = null` mostravam `cálculo pendente`, embora o corte territorial de 10/08/2026 esteja fechado.
2. Uma célula histórica da camada de maturidade, como `IPG--13-6`, podia aparecer visualmente como se fosse um perfil territorial atual, com os demais índices ausentes.

Também foi observada restauração do texto de busca pelo navegador sem reaplicação automática do filtro.

## Correção

A ficha territorial passa a usar a própria presença da célula no arquivo fechado `ficha_territorial_250km2.geojson` como prova de que o corte está materializado. Assim, `null` em IPG, PEIC e IATI conserva sua semântica metodológica e não é apresentado como cálculo pendente.

Somente IDs iniciados por `HX-` e presentes na malha R5 são aceitos como identificadores territoriais canônicos. IDs `IPG-*` permanecem históricos e são remapeados apenas por interseção geométrica.

A malha usada pelo resolvedor da Ficha Universal prioriza diretamente `malha_territorial_250km2.geojson`, com 1.554 células.

## Casos das capturas

- `HX--3-30` possui PEIC 24,73, IATI 46,02, IAT 89,54, ISA 34,48, ICT 79,78, IPAE 22,39 e ICD 89,48.
- `HX-0-32` possui `PEIC = null`, IATI 18,21, IAT 54,74, ISA 18,57, ICT 64,45, IPAE 42,48 e ICD 80,91. O PEIC deve aparecer como ausência de evidência cultural suficiente.
- `HX--2-35` possui `PEIC = null`, IATI 6,54, IAT 40,05, ISA 25,00, ICT 64,45, IPAE 17,48 e ICD 80,91.
- `HX--2-36` possui `PEIC = null`, IATI 2,57, IAT 32,20, ISA 34,75, ICT 64,45, IPAE 14,44 e ICD 80,91.
- `IPG--13-6` não pertence à malha R5. Sua geometria histórica intersecta quatro células atuais, `HX--2-35`, `HX--3-36`, `HX--2-36` e `HX--3-37`. A interface deve mostrar contexto multi-hex R5, nunca um perfil atual identificado como `IPG--13-6`.

## Cache PWA

A revisão do Service Worker passa para `2026-08-12-pwa-4-fichas-r5-cachefix`.

Os arquivos de `dados/precalculados/` usam network-first. Quando existe internet, a versão publicada é consultada antes do cache. O cache continua disponível como contingência offline.

O registro do Service Worker usa `updateViaCache: none`, solicita atualização e recarrega a página após troca de controlador, evitando que uma aba continue misturando `index.html` antigo com dados novos.
