# Validação · v1.8.0-dev

O Atlas distingue validação documental, espacial, institucional, de campo e comunitária. Esses estados descrevem a evidência registrada no projeto e não constituem certificação externa.

## Estado do corte territorial de 10/08/2026

A malha mestra R5 possui 1.554 células. IPG, PEIC, IATI, IAT, ISA e IPAE possuem produtos precalculados compatíveis com essa malha. O IPG foi rematerializado a partir do inventário geocientífico da Fase 3.2, com 57 células com evidência e 1.497 células mantidas como null por ausência de evidência suficiente. ICT e ICD estão materializados sobre a malha R5.

Por isso o snapshot geral ainda não deve ser declarado **fechado**. A interface não pode substituir ausência de evidência por zero nem iniciar recálculo apenas porque o usuário marcou uma camada.

## Malha

A rotina de materialização constrói a malha mestra a partir do limite estadual configurado no Atlas e exige, para cada célula, `area_nominal_km2`, `area_efetiva_ms_km2`, `percentual_hexagono_em_ms` e `celula_borda_estadual`.

O snapshot local anterior à execução validada não comprova por si só o recorte das células periféricas. Por isso sua validação espacial permanece parcial.

## Índices

Um corte fechado deve conter IPG, PEIC, IATI, IAT, ISA, ICT, IPAE e ICD sobre o mesmo conjunto de `hex_id` e a mesma geometria da malha mestra. O validador rejeita duplicatas, células ausentes e geometrias divergentes.

A presença de todas as células não implica valor numérico em todos os índices. IPG, PEIC e IATI admitem `null` quando a ausência de evidência está explicitamente documentada no próprio registro. O valor nulo não é convertido em zero. IAT, ISA, ICT, IPAE e ICD exigem cobertura numérica integral para o fechamento.

A atualização avançada no navegador é opcional. Pode consultar fontes remotas e consumir CPU, memória e rede. Seu resultado pertence à sessão até ser exportado e versionado.

## Céu noturno

As camadas de céu noturno são classificadas para orientação territorial e requerem verificação específica antes de decisões de campo ou promoção turística.

## Regra de uso

Para qualquer aplicação externa devem ser consultados a fonte primária, a data de captura, as limitações, o estado de materialização e o nível de validação indicado na ficha da camada.

## Privacidade e precisão pública

- localidades indígenas e quilombolas pontuais incorporadas no pacote são generalizadas a 2 casas decimais nos formatos redistribuídos
- limites territoriais legais oficiais não são generalizados, para não alterar sua geometria jurídica
- camadas arqueológicas classificadas como `generalizado` recebem generalização na representação pública
- a fonte primária deve ser consultada quando a geometria oficial original for necessária


## ICD materializado

O ICD do corte de 10/08/2026 foi materializado a partir dos sete produtos territoriais já fechados e validado em 1.554 células.

O cálculo respeita `null` como ausência de resultado. A ausência não é convertida em zero.

Com o ICD materializado, os oito índices territoriais possuem produtos individuais compatíveis com a malha R5. O snapshot geral ainda deve passar pela etapa final de consolidação da ficha territorial, metadados e checksums antes de ser declarado fechado como pacote público.


## Snapshot territorial fechado

O corte territorial de 10/08/2026 está fechado com 1.554 células e oito produtos individuais compatíveis com a mesma malha R5.

A ficha territorial consolidada, a malha pública e o arquivo de metadados foram gerados a partir dos produtos precalculados já validados.

O fechamento foi confirmado por `scripts/validar_precalculados.mjs`, incluindo identidade de `hex_id`, identidade geométrica, regras de nulos, campos obrigatórios da ficha e SHA256 dos arquivos públicos.

A consulta pública usa arquivos estáticos. O fechamento não autoriza substituir ausência de evidência por zero.


## Ficha Universal 1.0 · 12/08/2026

**PASS.** Toda camada runtime expõe ficha de camada por meio do template comum. Todo elemento vetorial renderizado pelo motor GeoJSON abre ficha própria. A associação territorial usa localmente a malha R5 de 1.554 células e não inicia captura remota nem recálculo de índices. Linhas e polígonos que atravessam várias células preservam a lista completa de `hex_id` e apresentam síntese mínimo, média e máximo sem escolher arbitrariamente uma célula principal.

Validação específica em `docs/VALIDACAO_FICHA_UNIVERSAL_2026-08-12.json`. O auditor de release terminou com **178 PASS, 0 WARN e 0 FAIL**.

## PWA instalável

A distribuição pública incorpora PWA 1.0 com manifesto, ícones 192/512, ícone maskable, Service Worker e modo standalone. O pacote territorial offline é opcional e explícito. Ele não transforma fontes remotas em dados locais nem declara disponibilidade offline para mapas-base ou serviços externos.
