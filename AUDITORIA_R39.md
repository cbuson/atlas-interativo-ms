# JOAJU MS · R39 · PRICI mobile compacto real

## Diagnóstico da captura

O grande espaço branco no topo não era conteúdo vazio da origem metodológica.

Uma regra global existente no site aplicava fundo branco com `!important` ao `.prici-self-head`, enquanto o módulo PRICI mantinha texto branco. O cabeçalho continuava ocupando altura, mas parecia vazio.

## Correção

No celular

- cabeçalho PRICI volta a ser verde e fica reduzido a aproximadamente 58 px
- mostra apenas o título curto
- ajuda e fechar permanecem acessíveis
- subtítulo e kicker são ocultados para poupar altura
- Origem do questionário continua colapsável
- etapas 1 a 5 ficam compactas e persistentes
- Arquivo e dados fica fechado por padrão
- os seis botões aparecem somente quando o usuário abre Arquivo e dados
- a caixa lateral de avaliações salvas fica oculta na navegação móvel para não competir com as etapas

No desktop a estrutura normal permanece.

## Verificações

{
  "r39_css": true,
  "compact_green_header": true,
  "file_tools_collapsible": true,
  "origin_collapsible_preserved": true,
  "coverage_preserved": true,
  "r37_sources_preserved": true,
  "js_ok": true,
  "inline_scripts": 32
}

## Arquivo a substituir

index.html
