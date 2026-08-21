# JOAJU MS · S1 estabilidade

Data 21 de agosto de 2026

## Escopo

Parche S1 aplicado sobre R20 sem alteração visual, científica ou cartográfica.

## Correções

- Projeto e autoria reinicia o scroll no topo em cada nova abertura.
- Modais principais sincronizam `aria-hidden` com o estado visual.
- A barra branca móvel do mapa passa a ser restaurada quando não existe painel bloqueador aberto.
- O retorno ao estado Mapa agenda reparação do tamanho do Leaflet.
- Retorno à aba, `pageshow` e `visibilitychange` sincronizam novamente o estado persistente.
- O Service Worker recebe uma revisão própria para impedir reutilização do HTML R20 em cache.

## Elementos não modificados

- barra verde superior
- barra branca de ferramentas
- dock inferior
- legenda unificada
- seletor de mapa de fundo
- camadas
- índices
- geometrias
- rotas
- fontes
- metodologia

## Verificação estrutural

A versão R20 de base contém 29 blocos script reconhecidos pelo parser HTML usado na validação.
A S1 contém 30, sendo o bloco adicional exclusivamente de estabilidade.
Todos os blocos JavaScript reconhecidos foram validados com `node --check` sem erro de sintaxe.

## Sequência de teste recomendada

1. Abrir Mapa
2. Abrir ⓘ Projeto e autoria
3. Fazer scroll até uma zona baixa
4. Fechar
5. Abrir ⓘ novamente
6. Confirmar que começa no topo e que a X está visível
7. Fechar
8. Confirmar que a barra branca reaparece
9. Abrir Camadas e voltar a Mapa
10. Confirmar que a barra branca reaparece
11. Abrir Ajuda e fechar
12. Confirmar novamente o estado do mapa
