# Snapshot precalculado JOAJU MS · v1.8.0

## Decisão de arquitetura

A consulta pública passa a usar produtos estáticos por hexágono. A ativação de IPG, PEIC, IATI, IAT, ISA, ICT, IPAE e ICD não inicia captura nem cálculo espacial.

A atualização com fontes atuais permanece separada e exige ação explícita do pesquisador.

## Fórmulas congeladas

IPG usa 40% diversidade geocientífica, 35% riqueza e 25% continuidade territorial.

PEIC usa 45% diversidade cultural, 25% equilíbrio, 20% riqueza cultural e 10% continuidade territorial.

IATI usa 70% PEIC e 30% convergência de rotas.

IAT usa 30% rede pavimentada, 20% rede vicinal, 25% proximidade à rede pavimentada, 15% proximidade a núcleo urbano e 10% multimodalidade ferroviária e aérea.

ISA usa quatro componentes com 25% cada, unidades de conservação, zonas de amortecimento, corredores ecológicos e áreas de uso restrito.

ICT usa 50% hospedagem formal e 50% serviços Cadastur.

IPAE usa quatro componentes com 25% cada, escolas, museus e memória, ensino superior, bibliotecas e arquivos. Dentro de cada componente, 70% corresponde à densidade e 30% à proximidade.

ICD usa cinco componentes com 20% cada, completude, atualidade, adequação posicional, completude temática e rastreabilidade.

## Malha de referência

A revisão R5 validada para o corte de 10 de agosto de 2026 contém 1.554 células, sendo 1.343 interiores e 211 células de borda. As células são recortadas pelo limite oficial IBGE 2025.

## Regra de publicação

`scripts/validar_precalculados.mjs` exige os onze arquivos públicos, identidade de `hex_id`, identidade geométrica com a malha mestra, ficha territorial completa e SHA256 coerente com `snapshot_metadata.json`. Cobertura integral significa que todas as 1.554 células devem existir no produto. Isso não significa atribuir um número a toda célula. IPG, PEIC e IATI podem conservar `null` quando o próprio protocolo documenta ausência de evidência suficiente. IAT, ISA, ICT, IPAE e ICD exigem cobertura numérica integral no corte fechado.

Se a camada de escolas não possuir coordenadas públicas suficientes no arquivo oficial do INEP 2025, o fechamento é interrompido. Não se usa geocodificação por sede municipal como substituição.


## Fechamento confirmado

O snapshot territorial do corte de 10/08/2026 foi consolidado com 1.554 células.

Produtos publicados

IPG, PEIC, IATI, IAT, ISA, ICT, IPAE e ICD

Arquivos estruturais

`malha_territorial_250km2.geojson`

`ficha_territorial_250km2.geojson`

`snapshot_metadata.json`

O arquivo `snapshot_metadata.json` registra os SHA256 dos dez GeoJSON públicos do snapshot.
