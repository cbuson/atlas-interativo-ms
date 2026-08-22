# JOAJU · PATCH PRICI R2

Este patch foi reconstruído sobre a última base enviada pelo usuário.

Corrige um erro estrutural do patch anterior, no qual o módulo PRICI foi inserido dentro do HTML de impressão gerado pelo módulo de autoavaliação. Isso fazia o navegador encerrar o script e mostrar JavaScript como texto na página.

Substitua somente:

- `index.html`
- `service-worker.js`
- `VERSION.json`

Não substitua outros arquivos.
