# JOAJU MS · Auditoria profunda de renderização cartográfica · R14

## Causa raiz comprovada

A lógica central de carregamento de camadas entre R8 e R13 permaneceu igual em ensureLayerLoaded, setLayerData, toggleLayer e makeLeaflet.

O problema foi introduzido na camada responsive R9 por uma regra global destinada a mídia móvel

`img,video,canvas,iframe{max-width:100%}`

Essa regra também atingia os elementos internos criados pelo Leaflet.

No Leaflet, canvas vetoriais e imagens georreferenciadas recebem dimensões e transformações próprias. Em celulares com devicePixelRatio elevado, limitar esses elementos a 100% pelo CSS altera o tamanho visual sem alterar a matemática de posicionamento usada pelo Leaflet. O resultado possível é camada marcada como ativa e objeto Leaflet presente, mas geometria deslocada, reduzida ou aparentemente ausente.

A regra também podia afetar ImageOverlay.

## Evidência adicional

O serviço oficial SEMADESC MapServer usado pela camada de altimetria está disponível e declara Altimetria MS como layer 5. Portanto não havia base para atribuir o desaparecimento geral das camadas a indisponibilidade desse serviço.

## Correção R14

Foi adicionada no fim real do documento uma regra específica que impede o CSS responsive de redimensionar canvas e imagens dentro do mapa.

`#map img, #map canvas, .leaflet-container img, .leaflet-container canvas { max-width:none !important; max-height:none !important }`

A correção fica depois de todos os estilos históricos e não altera imagens normais fora do mapa.

Foi acrescentada telemetria local de diagnóstico em `window.__JOAJU_LAYER_DIAGNOSTICS__` para registrar adição, carregamento e erros de tiles sem enviar dados para nenhum servidor.

## O que não foi alterado

Nenhuma camada científica foi removida.

Nenhum dado foi substituído.

Nenhuma geometria foi modificada.

Nenhum índice foi recalculado.

A lógica de ativação das camadas continua a mesma.

## Observação sobre status CONECTADO

Nas camadas ArcGIS Map, o estado CONECTADO era atribuído quando o objeto GridLayer era criado, antes de confirmar que os tiles tinham efetivamente carregado. A telemetria R14 permite diferenciar criação do objeto de carregamento real e deverá servir para uma melhoria posterior da interface de status.
