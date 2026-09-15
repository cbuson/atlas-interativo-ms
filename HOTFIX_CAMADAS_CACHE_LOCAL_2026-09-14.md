# Hotfix de carga de camadas e cache local — 14/09/2026

Problema observado durante testes sucessivos em `localhost:8076`: o Service Worker da PWA permanece associado ao mesmo origin entre pastas/versões e pode combinar `index.html` recente com arquivos `dados/*.js` armazenados por uma versão anterior.

Correções:

- em `localhost`, `127.0.0.1`, `0.0.0.0` e `::1`, JOAJU não registra Service Worker; registros anteriores são removidos e caches `joaju-*` são limpos;
- camadas `embedded` passam a carregar o arquivo com revisão derivada do SHA-256 do `DATA_MANIFEST`;
- em produção, arquivos sob `/dados/` usam `network-first` com fallback no cache offline;
- revisão PWA alterada para `2026-09-14-pwa-36-data-networkfirst`.

A alteração não modifica geometrias, índices, fichas, rotas nem valores analíticos.
