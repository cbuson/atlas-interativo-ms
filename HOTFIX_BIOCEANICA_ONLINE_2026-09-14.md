# HOTFIX BIOCEÂNICA ONLINE — 14/09/2026

Diagnóstico: o site publicado continha a interface preparada para “32 propostas metodológicas + 1 corredor institucional” e VERSION.json declarava BIOCEANICA-MS-R1, porém o arquivo publicado `dados/rotas_culturais_propostas.js` ainda era a versão anterior sem a feição institucional.

Arquivos mínimos a publicar na raiz do repositório:

- `dados/rotas_culturais_propostas.js`
- `service-worker.js`
- `VERSION.json`

A revisão do Service Worker foi elevada para `2026-09-14-pwa-35-bioceanica-online-hotfix` para impedir que uma cópia antiga de `dados/rotas_culturais_propostas.js` permaneça servida pelo cache `cacheFirst`.

Após a publicação, aguardar o GitHub Pages concluir o deploy e recarregar a página. Se houver uma instalação PWA antiga aberta, fechar e reabrir; em navegador, Ctrl+F5 deve ser suficiente após o novo Service Worker assumir o controle.
