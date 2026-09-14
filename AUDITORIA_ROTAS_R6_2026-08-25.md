# Auditoria completa das rotas rodoviárias · R6

Data de corte 25/08/2026

## Diagnóstico principal

O problema observado no navegador não correspondia apenas à geometria das rotas.

O arquivo atual já contém `via_rodoviaria_local` para `ROTA-EST-032` e `ROTA-EST-033`.

A auditoria confirmou

- Caminho para os Ervais possui rede rodoviária local materializada em 7 trechos
- Rota Bioceânica em Mato Grosso do Sul possui rede rodoviária local materializada em 5 trechos
- O esquema histórico original do Caminho para os Ervais permanece preservado
- A rede contemporânea é armazenada separadamente em `properties.via_rodoviaria_local`
- O navegador podia continuar recebendo uma versão anterior de `dados/rotas_culturais_propostas.js` porque o service worker aplicava política `cacheFirst` a todos os arquivos de `dados`
- A mensagem mostrada nas capturas não existe no `index.html` auditado, indicando execução de uma versão anterior em cache

## Correções R6

1. Nova versão do cache PWA para eliminar caches JOAJU anteriores
2. `dados/rotas_culturais_propostas.js` passa a usar `networkFirstCached`
3. O carregamento desta camada recebe marcador de versão `20260825-r6-rotas`
4. Validação explícita de `LineString` e `MultiLineString` antes de desenhar a via local
5. A via local continua tendo prioridade absoluta sobre OSRM
6. Exportação distingue geometria local de geometria calculada por OSRM

## Caminho para os Ervais

O desenho histórico original não foi substituído.

A rede rodoviária contemporânea permanece como objeto complementar e inclui os trechos já materializados no arquivo auditado, entre eles a ligação Bela Vista–Jardim e a ligação Jardim–Bonito.

## Rota Bioceânica em Mato Grosso do Sul

Permanece como `ROTA-EST-033`, separada da `Rota Bioceânica das Culturas de Fronteira`.

Possui geometria local materializada própria e não necessita de OSRM para ser exibida.

## Teste recomendado

1. Substituir os três arquivos deste pacote
2. Encerrar o servidor local
3. Abrir novamente com `python -m http.server 8000`
4. No Chrome abrir DevTools
5. Application → Service Workers → Unregister uma única vez
6. Application → Storage → Clear site data uma única vez
7. Fechar a aba
8. Abrir `http://localhost:8000`
9. Testar Caminho para os Ervais → Via rodoviária
10. Testar Rota Bioceânica em Mato Grosso do Sul → Via rodoviária

Após esta limpeza única, a nova versão do service worker controla a atualização automaticamente.
