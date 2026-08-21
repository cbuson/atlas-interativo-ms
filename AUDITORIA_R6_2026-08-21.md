# JOAJU MS · Consolidação R6 · Caderno de Campo

Data 21/08/2026

Esta revisão amplia Minha Pesquisa sem alterar as bases científicas, as 153 camadas, a malha R5 ou os oito índices territoriais.

## Implementado

1. Nova aba Campo em Minha Pesquisa.
2. Mapa próprio do caderno de campo com Leaflet e OpenStreetMap.
3. Registro de rota GPS iniciado e encerrado somente por ação explícita do usuário.
4. Pontos da rota armazenados localmente no expediente da pesquisa.
5. Distância aproximada da rota calculada entre os pontos registrados.
6. Botão Minha posição dentro do mapa de campo.
7. Captura de fotografia pelo dispositivo através do seletor de imagem e, em aparelhos compatíveis, câmera traseira.
8. Consulta de posição no momento da fotografia.
9. Geração local de JPEG com faixa inferior visível contendo data e hora, latitude, longitude, precisão e, quando fornecidos pelo dispositivo, altitude, rumo e velocidade.
10. Fotografias guardadas no expediente local e apresentadas no caderno com opção de baixar ou remover.
11. Pontos fotográficos representados no mapa de campo.
12. Ajuda de Minha Pesquisa atualizada para refletir o registro de rota e fotografias.
13. Service Worker revisto para 2026-08-21-pwa-11-campo-r6.

## Regras de privacidade e limites

O registro de rota não começa ao abrir JOAJU. O usuário precisa tocar em Iniciar rota e pode encerrá-lo em Parar. A informação fica no IndexedDB local de Minha Pesquisa. Não há envio automático ao projeto nem sincronização em nuvem.

A disponibilidade de precisão, altitude, rumo e velocidade depende do dispositivo, navegador, sistema operacional, permissões e condições de recepção GNSS. Quando um valor não é fornecido, JOAJU registra n/d em vez de inventá-lo.

A faixa de metadados é incorporada visualmente à cópia JPEG produzida por JOAJU. Esta revisão não afirma gravar campos EXIF GPS internos no arquivo.

O mapa-base de OpenStreetMap continua dependendo de rede quando os tiles não estiverem em cache.

## Validação realizada nesta revisão

Os 16 blocos JavaScript inline de index.html foram extraídos e passaram por `node --check` sem erro sintático.

A validação física de câmera, permissões GNSS, altitude, rumo, velocidade e registro de rota deve ser realizada em um telefone real, porque esses valores dependem de hardware e permissões que não existem de forma equivalente no ambiente de auditoria.
