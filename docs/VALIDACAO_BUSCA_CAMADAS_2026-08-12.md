# Validação · busca de camadas · 12/08/2026

Correção funcional do campo **Buscar camada**.

- evento `input` ligado a `filterLayerCards()`
- evento nativo `search` ligado ao filtro
- botão **Limpar** restaura todas as camadas e devolve o foco ao campo
- tecla `Escape` limpa o filtro
- o filtro é reaplicado após reconstrução dos cards enquanto houver termo ativo
- a busca altera somente a lista do painel e não ativa, desativa ou recalcula camadas
- Service Worker revisado para invalidar o cache anterior do `index.html`
