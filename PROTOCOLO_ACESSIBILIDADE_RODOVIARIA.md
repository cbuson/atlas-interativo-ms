# Protocolo de acessibilidade rodoviária estimada

## Natureza

Esta funcionalidade integra o projeto de pesquisa científica Atlas Interativo de Itinerários Culturais de Mato Grosso do Sul. A camada de acessibilidade rodoviária é distinta das geometrias culturais esquemáticas e não as substitui.

## Universo priorizado

O cálculo abrange nove registros. Sete possuem base institucional ou documental direta e dois são propostas autorais baseadas em produtos turísticos territoriais institucionalmente consolidados.

- ROTA-EST-008 — Rota Histórica da Retirada da Laguna
- ROTA-EST-009 — Rota dos Pioneiros e das Memórias do Rio Paraná
- ROTA-EST-010 — Rota do Cerrado
- ROTA-EST-014 — Rota Bioceânica das Culturas de Fronteira
- ROTA-EST-021 — Rota de Aviturismo nas Unidades de Conservação da Mata Atlântica
- ROTA-EST-022 — Rota de Aviturismo da Rota Bioceânica
- ROTA-EST-023 — Rota de Aviturismo do Pantanal Sul, classificação híbrida
- ROTA-EST-024 — Rota de Aviturismo da Serra da Bodoquena, classificação híbrida
- ROTA-EST-026 — Rota Pantanal Bonito

## Método

O usuário aciona o cálculo no visor. O programa envia, sequencialmente, os pontos municipais de cada registro ao serviço Route do OSRM, com perfil `driving`, `steps=true`, geometrias em GeoJSON e sem panorama geral. Cada perna é convertida em uma feição separada.

São registrados distância, duração estimada sem trânsito, pontos solicitados e ajustados à rede, distância de ajuste, resumo das vias, endpoint, data do cálculo e versão da rede quando informada pelo serviço.

O endpoint padrão é `https://router.project-osrm.org` e pode ser alterado em `config.js`. O servidor público é uma infraestrutura externa de demonstração e não possui garantia de disponibilidade. O cálculo ocorre somente quando solicitado e os resultados podem ser guardados no navegador.

## Limitações

- Não representa o traçado cultural, histórico, ferroviário, fluvial ou oficialmente aprovado da rota.
- Não constitui recomendação de viagem, plano operacional ou autorização de acesso.
- As durações não incorporam trânsito em tempo real.
- A rede pode omitir restrições, interrupções, sazonalidade, pavimentação, vias privadas ou condições locais.
- Os resultados exigem revisão cartográfica e validação de campo antes de qualquer uso aplicado.
- Para a Retirada da Laguna, a camada representa apenas acesso contemporâneo aos lugares de referência.
- Para a Rota dos Pioneiros, a camada não substitui o componente aquático e fluvial.

## Licenças

Os atributos metodológicos autorais são distribuídos sob CC BY 4.0. A geometria calculada deriva de dados OpenStreetMap e deve observar ODbL 1.0 e a atribuição aos colaboradores do OpenStreetMap.
