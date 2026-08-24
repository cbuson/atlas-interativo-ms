# JOAJU MS · R39 · hierarquia móvel do módulo PRICI

## Objetivo

Recuperar área útil no celular sem reduzir a tipografia.

## Mudanças

1. `Arquivo e dados` passa a ser um bloco colapsável fechado por padrão no mobile.
2. As ações Nova ficha, salvar, importar, exportar e PDF ficam disponíveis sob demanda.
3. A navegação 1–5 permanece sempre acessível acima do conteúdo.
4. `Origem do questionário` continua disponível no início, mas desaparece automaticamente quando o usuário começa a rolar o conteúdo.
5. Ao voltar ao topo, a faixa de origem reaparece fechada.
6. Em desktop, a toolbar continua visível como antes.

## Preservado

- R38 origem metodológica colapsável
- R37 fontes e rastreabilidade
- R36 tipografia
- R35 scroll
- R34 modal
- Cobertura documental
- PRICI, Pesquisa, IndexedDB, rotas, camadas e índices

## Verificação

{
  "r39_css": true,
  "file_toggle": true,
  "toolbar_collapsed_default": true,
  "origin_auto_hides_on_scroll": true,
  "r38_preserved": true,
  "r37_preserved": true,
  "coverage_preserved": true,
  "js_syntax_ok": true,
  "inline_scripts": 32
}

## Arquivo a substituir

index.html
