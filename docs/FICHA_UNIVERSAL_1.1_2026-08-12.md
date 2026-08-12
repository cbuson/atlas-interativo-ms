# Ficha Universal 1.1 · JOAJU MS

## Correção estrutural

A revisão 1.1 corrige uma incompatibilidade entre grades históricas e a malha territorial R5 publicada.

Alguns produtos analíticos preservados no pacote usam identificadores `hex_id` iniciados por `IPG-*`, provenientes de uma grade histórica anterior. Esses identificadores não pertencem à malha R5 de 1.554 células e não podem ser usados como chave para a Ficha Territorial atual.

A Ficha Universal agora aplica uma regra única.

1. qualquer `hex_id`, `id_hex` ou `hex` explícito é validado contra a malha R5 do corte de 10/08/2026
2. somente um identificador existente na R5 é aceito diretamente
3. um identificador histórico é preservado como atributo documental, mas o contexto territorial é resolvido pela geometria do registro
4. se a geometria atravessa várias células R5, todas são mostradas e os oito índices são resumidos sem escolher uma célula principal arbitrária
5. se não existe geometria ou não há interseção com MS, nenhum perfil R5 é inventado

## Estado dos índices

O estado `fechado` dos oito índices é lido de `dados/precalculados/snapshot_metadata.json`. A ficha não depende de o usuário ter ativado visualmente cada camada de índice.

Isso evita que IAT, ISA, ICT, IPAE ou ICD apareçam como `cálculo pendente` quando o valor já existe no snapshot publicado.

IPG, PEIC e IATI continuam respeitando `null` quando o próprio método documenta ausência de resultado. Um `null` fechado não é convertido em zero e não é apresentado como cálculo pendente.

## Cobertura auditada

- 153 configurações de camada com ficha de camada pelo template comum
- 90 conjuntos vetoriais locais percorridos pelo auditor estrutural
- 50.912 feições locais inspecionadas quanto a identificador territorial e presença de geometria
- 1.554 fichas territoriais com os mesmos `hex_id` da malha R5
- 3.288 identificadores históricos `IPG-*` reconhecidos em três conjuntos legados e impedidos de se passar por R5
- 14 registros documentais sem geometria permanecem explicitamente sem vínculo territorial automático

## Caso que motivou a correção

Um registro da camada `maturidade_rotas_hex_250km2_v1_8_0` com identificador histórico `IPG-2--7` era tratado anteriormente como se fosse uma célula R5. Como esse ID não existe no snapshot atual, a ficha mostrava vários índices como pendentes.

Na R5, a geometria desse registro intersecta quatro células atuais.

- `HX-12-23`
- `HX-12-24`
- `HX-13-22`
- `HX-13-23`

A Ficha Universal 1.1 passa a mostrar o resumo dessas quatro células e mantém `IPG-2--7` apenas como identificador histórico da feição selecionada.
