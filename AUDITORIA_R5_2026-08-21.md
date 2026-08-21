# JOAJU MS · Auditoria R5 · 21/08/2026

## Objetivo da rodada

Consolidar a navegação principal observada em teste local, impedir a abertura automática da Ajuda no arranque e aumentar de forma mais perceptível a legibilidade da interface.

## Alterações realizadas

1. A Ajuda deixa de abrir automaticamente no primeiro acesso em computador. JOAJU inicia diretamente no mapa.
2. O botão textual `Documentação` da barra superior foi substituído por um botão circular `?` com descrição acessível `Ajuda e documentação`.
3. O menu aberto pelo `?` mantém Ajuda, Projeto e autoria, Metodologia, Fontes e referências, instalação PWA e ferramentas já existentes.
4. O botão redundante de Ajuda da barra superior foi ocultado. A Ajuda permanece acessível pelo `?` e pela navegação móvel.
5. A escala tipográfica foi reforçada globalmente. O corpo passa a 15 px e os textos auxiliares críticos passam a pelo menos 13 px nas regras finais da cascata.
6. Foram ampliados textos de navegação, camadas, fichas, cartões, Ajuda, instalação PWA, popups e legendas.
7. O Service Worker foi revisto para `2026-08-21-pwa-10-auditoria-r5` para evitar retenção da interface R4 em instalações PWA existentes.

## Decisão de navegação

A hierarquia de entrada fica clara e não modal

`Explorar` · `Rotas` · `Estatísticas` · `Ficha` · `?` · `ⓘ` · `Atualizar dados`

O `?` concentra Ajuda e documentação. O `ⓘ` continua reservado para Projeto e autoria.

## Validação

A bateria `npm run audit-completo` foi executada depois das mudanças.

Resultado

217 PASS · 0 WARN · 0 FAIL

Os 16 blocos JavaScript inline permaneceram sintaticamente válidos e as 153 camadas, a malha R5 e os oito índices territoriais permaneceram inalterados.
