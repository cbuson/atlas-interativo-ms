# JOAJU MS · R38 · cabeçalho compacto PRICI mobile

## Problema observado

No celular, a faixa amarela `Origem do questionário` ocupava demasiada altura de forma permanente e reduzia muito o espaço útil das etapas 1 a 5.

## Solução

No mobile

- a faixa passa a mostrar apenas `Origem do questionário`
- o conteúdo metodológico fica fechado por padrão
- um toque expande ou recolhe a explicação
- `aria-expanded` é atualizado para acessibilidade
- o cabeçalho verde recebe menos altura
- a navegação das etapas permanece logo abaixo com alvos tácteis adequados

No desktop

- o conteúdo da origem continua visível por padrão, porque há espaço suficiente

## Preservado

- R37 fontes e rastreabilidade
- R36 tipografia legível
- R35 scroll interno
- R34 visibilidade do modal
- Cobertura documental
- 63 critérios PRICI
- rotas, Pesquisa, IndexedDB, camadas e índices

## Verificação

{
  "r38_css": true,
  "origin_toggle": true,
  "default_collapsed": true,
  "desktop_visible": true,
  "r37_preserved": true,
  "r36_preserved": true,
  "r35_preserved": true,
  "coverage_preserved": true,
  "js_ok": true,
  "inline_scripts": 32
}

## Arquivo a substituir

index.html
