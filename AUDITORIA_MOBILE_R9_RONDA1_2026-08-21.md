# JOAJU MS · Mobile First R9 · Ronda 1

Data 21 de agosto de 2026

Primeira ronda de intervenção posterior à auditoria mobile first.

Esta ronda atua somente sobre viewport, scroll, fechamento universal, safe areas e prevenção de conteúdo oculto. Não altera dados científicos, camadas, índices, geometrias, rotas, metodologias, referências ou resultados.

## Mudanças

Foi acrescentada uma camada responsive final identificada como joaju-mobile-r9-round1.

Ela usa 100dvh em telas móveis, considera safe areas, reserva espaço para a navegação inferior e impede que painéis e modais terminem atrás do dock.

Os principais modais passam a dispor de scroll vertical explícito quando o conteúdo supera a altura disponível. Minha Pesquisa conserva sua estrutura, mas seu corpo passa a ter uma área rolável calculada pelo viewport móvel.

Cabeçalhos de modais permanecem visíveis durante o scroll.

Botões cuja função é fechar são normalizados para × e recebem área tátil de aproximadamente 46 a 48 px, aria-label e title quando necessário.

Safe areas passam a ser consideradas também no navegador móvel, não apenas no modo PWA standalone.

Controles inferiores do Leaflet recebem reserva para não ficar escondidos atrás do dock.

Foi incluída adaptação de altura em orientação horizontal.

O Service Worker foi atualizado para 2026-08-21-pwa-13-mobile-r9.

## Próxima ronda

A Ronda 2 tratará identidade compacta de JOAJU MS, mapa, Minha posição e a reorganização da navegação inferior.
