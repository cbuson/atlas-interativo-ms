# JOAJU MS · R35 · correção do scroll PRICI e Abrir avaliação

## Diagnóstico

As capturas confirmam que o modal PRICI já abre, mas a área principal não rola.

A causa foi localizada numa regra global anterior do próprio site que forçava

`.prici-self-main { overflow-y: visible !important }`

Essa regra anulava o `overflow:auto` definido pelo módulo PRICI.

## Correção do scroll

R35 remove apenas essa interferência global e reforça a arquitetura do modal.

- cabeçalho e faixa de origem permanecem fixos dentro da caixa
- corpo PRICI ocupa o espaço restante
- menu lateral pode rolar no desktop
- conteúdo principal possui scroll vertical próprio
- no celular, menu vira faixa horizontal e o conteúdo continua com scroll vertical
- `overscroll-behavior` evita transferência involuntária do gesto para o Atlas

## Abrir avaliação

`Abrir avaliação` não abre a rota atual. Ele abre somente fichas previamente salvas com `Salvar neste navegador`.

Na versão anterior, clicar sem selecionar uma ficha falhava silenciosamente.

R35 torna isso explícito.

- texto do seletor alterado para `Selecione uma avaliação salva`
- botão desabilitado até existir uma seleção
- tooltip informa quando ainda não há avaliações salvas
- proteção adicional exibe aviso se a função for chamada sem seleção

## Preservado

- Cobertura documental R33
- correção visual do modal R34
- 63 critérios PRICI
- rotas
- camadas
- índices territoriais
- IndexedDB
- Minha Pesquisa
- snapshots

## Verificação

{
  "r35_style": true,
  "blocking_override_removed": true,
  "coverage_present": true,
  "r34_visibility_fix_preserved": true,
  "saved_button_guard": true,
  "js_syntax_ok": true,
  "inline_script_blocks": 32
}

## Teste recomendado

1. Abrir uma rota.
2. `Autoavaliar / cobertura`.
3. Entrar em `Autoavaliação`.
4. Rolar para baixo até critérios posteriores.
5. Entrar em `Resumo e relatório`.
6. Confirmar o painel `Cobertura documental`.
7. Voltar a `Identificação`.
8. Clicar `Salvar neste navegador`.
9. Selecionar a ficha na lista.
10. Confirmar que `Abrir avaliação` fica habilitado e reabre a ficha.
