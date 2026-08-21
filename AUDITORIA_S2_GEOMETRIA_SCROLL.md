# JOAJU MS · S2 · Estabilidade de geometria e scroll

Data 21 de agosto de 2026

## Escopo

Parche construído sobre R21 S1.

Não altera identidade visual, barra verde, barra branca de ferramentas, dock inferior, selector de mapas, legenda, dados, camadas, índices, rotas, fontes ou metodologias.

## Correções

- consolida o proprietário de scroll dos modais gerais
- usa `100dvh` como referência final de altura, mantendo fallback histórico intacto abaixo
- mantém cabeçalho de modal sticky e acessível durante o deslocamento
- impede scroll concorrente entre modal e conteúdo filho
- mantém `Minha Pesquisa` com cabeçalho estável e corpo rolável único
- adiciona `overscroll-behavior` para evitar scroll preso ou propagado ao mapa
- reserva `scroll-padding-bottom` em móvel para teclado, dock e safe area
- mantém geometria desktop separada da geometria mobile

## Risco

Baixo a médio. A intervenção é apenas CSS final e não muda JavaScript científico ou cartográfico.

## Validação necessária em dispositivo

Abrir e fechar repetidamente Projeto e autoria, Ajuda, Ficha e Pesquisa.

Percorrer cada modal até o final e voltar ao topo.

Abrir teclado em formulário longo.

Girar portrait para landscape e retornar.

Confirmar que o mapa e a barra branca reaparecem ao fechar as telas.
