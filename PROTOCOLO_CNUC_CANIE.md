# Protocolo CNUC e CANIE · v1.8.0-dev

## Finalidade

Documentar a captura e o uso territorial das camadas de unidades de conservação e cavidades naturais subterrâneas configuradas no JOAJU MS.

## Fontes configuradas

A camada `unidades_conservacao` usa CNUC/MMA por WFS ICMBio/INDE, com espelho PAMGIA como contingência. A camada `cavernas_canie` usa CANIE/CECAV/ICMBio por WFS, com espelho Infra S.A. como contingência.

## Regra operacional

A captura é feita sob demanda e recortada para Mato Grosso do Sul quando a função espacial da camada assim o define. A fonte de contingência só deve ser usada quando a fonte principal não puder ser processada.

## Produtos derivados

As relações rota–UC, cavernas–rotas e cavernas–UC são análises espaciais do Atlas. Não alteram o cadastro oficial e não constituem classificação institucional das áreas ou cavidades.

## Limites

A disponibilidade de um serviço remoto pode variar. Um resultado derivado deve registrar qual fonte foi efetivamente capturada. A ausência temporária de uma fonte não deve ser convertida em ausência territorial do fenômeno.


## Materialização das análises derivadas

No corte base de 10/08/2026 foram materializados três produtos espaciais derivados de CNUC, CANIE e das propostas metodológicas de rotas do JOAJU MS.

### Rotas e unidades de conservação

O produto registra relações espaciais entre as 32 propostas metodológicas de rotas e os 8 polígonos de unidades de conservação disponíveis no snapshot local.

A relação indica apenas interseção cartográfica. Não implica autorização de acesso, compatibilidade com plano de manejo, integração turística ou validação institucional.

### Cavidades próximas às rotas

O produto calcula a menor distância entre as 341 cavidades CANIE do snapshot e os segmentos das 32 propostas metodológicas de rotas.

O limiar exploratório permanece em 50 km.

Proximidade não implica acesso, visitação, segurança ou integração cultural.

### Cavidades em unidades de conservação

O produto registra pontos CANIE situados dentro dos polígonos CNUC disponíveis no snapshot.

A relação depende da precisão e atualização das duas bases.

### Acessibilidade rodoviária

A acessibilidade rodoviária das nove rotas priorizadas foi materializada separadamente com OSRM e rede OpenStreetMap.

As propostas metodológicas pertencem ao corte JOAJU de 10/08/2026. A rede viária é aquela disponibilizada pelo endpoint OSRM no momento da materialização.

Esse resultado não é validação de campo, recomendação de viagem nem garantia de transitabilidade.

A validação técnica conjunta está em `docs/VALIDACAO_ANALISES_DERIVADAS_2026-08-10.json`.
