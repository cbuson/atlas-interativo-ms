# JOAJU MS Mobile R11

Correção orientada pelas capturas reais de Android Chrome enviadas em 21 de agosto de 2026.

## Problemas atacados

Scroll ausente ou inconsistente em painéis, ficha, ajuda e Minha Pesquisa.

Elementos e ícones de navegação com contraste ou visibilidade insuficiente.

Controles Leaflet visualmente exagerados e pouco integrados à interface.

Necessidade de recalcular o tamanho do mapa após mudanças de viewport e fechamento de painéis.

## Alterações

Foi adicionada uma camada final de CSS móvel. Ela não altera dados, camadas, índices, fontes ou metodologias.

Painéis laterais e modais passam a usar scroll vertical explícito com suporte a toque.

Minha Pesquisa deixa de depender de alturas internas conflitantes e usa um fluxo vertical rolável.

Cabeçalhos de diálogos e botões X permanecem acessíveis durante o scroll.

Controles Leaflet foram normalizados para 44 a 48 px, com espaçamento, sombra e bordas coerentes.

Popup, escala e atribuição foram compactados para reduzir interferência visual no mapa.

Foi incluído invalidateSize do Leaflet após resize, mudança de orientação e transições de navegação.

## Limitação

A validação visual definitiva deve continuar sendo feita em Android Chrome e posteriormente iPhone Safari, porque barras do navegador, permissões e viewport dinâmico dependem do dispositivo real.
