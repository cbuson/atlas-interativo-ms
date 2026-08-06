# Correção geométrica PEIC e IATI — v1.7.0

A montagem anterior chamava `pointInRing` antes de incluir no pacote modular o bloco de funções geométricas compartilhadas. A falha interrompia tanto o cálculo PEIC como o IATI.

Foram restauradas nas edições web e Android as funções `geomParts`, `pointInRing`, `pointInPolygonGeom` e `segmentIntersection`. O método e os parâmetros dos indicadores não foram alterados.

A correção foi validada por execução real em Chromium, além da verificação sintática.
