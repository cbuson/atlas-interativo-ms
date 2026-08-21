# JOAJU R16 · correção de regressão no desktop

A R15 resolveu o seletor de mapas de fundo em mobile, mas duas regras históricas continuavam afetando o desktop.

Correções desta ronda

* Ajuda ? e Projeto e autoria ⓘ ficam explicitamente visíveis no desktop.
* O botão duplicado de ajuda é ocultado no desktop para evitar redundância.
* Em notebooks e larguras menores que 1600 px, Atualizar dados deixa de competir com os ícones essenciais na cabecera.
* O cabeçalho Mapa de fundo inserido pela adaptação móvel é removido do controle Leaflet no desktop.
* O desktop volta ao seletor nativo e compacto de Leaflet.
* A experiência móvel da R15 permanece isolada em max-width 900 px.
* Service Worker recebe nova revisão para evitar cache da R15.

Não foram alterados dados, camadas, índices, fontes ou lógica científica.
