# Dados do JOAJU MS

Os conjuntos locais do Atlas são carregados sob demanda a partir de `dados/`.

## Estrutura

- `precalculados/` contém a malha, ficha territorial e os oito índices fechados
- `materializados/2026_08_10/` contém snapshots locais de fontes cartográficas e tabelas
- arquivos JS na raiz de `dados/` contêm conjuntos autorais e snapshots compactos usados pelo runtime

A aplicação não depende de um único HTML gigante.

## Exceções da distribuição GitHub

Os snapshots integrais de `rede_hidrica` e `mapa_geomorfologico_ibge` não são versionados porque ultrapassam o limite normal de arquivo do GitHub. As fontes permanecem configuradas no Atlas para captura ou download explícito.

## Céu noturno

O KMZ científico e as imagens locais registrados em `RASTER_MANIFEST` continuam no pacote quando seu tamanho é compatível com a distribuição.
