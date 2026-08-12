# Ficha Universal 1.0 · JOAJU MS

> Superada pela revisão 1.1 para compatibilidade entre grades históricas e a malha R5. Consulte `FICHA_UNIVERSAL_1.1_2026-08-12.md`.

## Regra

Toda camada visível no catálogo possui uma ficha de camada. Todo elemento vetorial selecionável possui ficha própria.

## Associação territorial

A associação espacial usa exclusivamente a malha territorial R5 do corte de 10/08/2026, com 1.554 células já carregadas no navegador. O clique não inicia captura externa e não recalcula índices.

- ponto em uma célula · mostra diretamente a Ficha Territorial da célula
- linha ou polígono em várias células · lista todos os `hex_id` intersectados e resume IPG, PEIC, IATI, IAT, ISA, ICT, IPAE e ICD com mínimo, média e máximo
- geometria sem interseção · informa explicitamente que não há vínculo com a malha R5
- camada raster, mapa dinâmico ou referência externa · mantém ficha de camada com fonte, estado, corte e limitações

Não se escolhe arbitrariamente um hexágono principal para geometrias que atravessam várias células.

## Proveniência

A ficha de camada utiliza os metadados já presentes em `configs`, `DATA_MANIFEST`, `RASTER_MANIFEST` e no produto carregado. A ficha do elemento preserva os atributos originais disponíveis e acrescenta o vínculo territorial como contexto derivado do Atlas.
