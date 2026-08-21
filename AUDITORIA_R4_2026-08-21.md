# JOAJU MS · Auditoria R4 · 21 de agosto de 2026

## Escopo

Auditoria zero visual e funcional sobre a R3. Esta rodada não altera dados científicos, geometrias, fontes, índices fechados ou configurações das 153 camadas.

## Achados confirmados e correções

- Eliminada uma mensagem técnica residual que afirmava que o Service Worker não era registrado. O registro PWA efetivo já existe no módulo próprio e continua ativo.
- Corrigida a ajuda de Minha Pesquisa que ainda descrevia a PWA como etapa futura. A PWA e Minha posição sob demanda já fazem parte da versão atual. Câmera, GPS contínuo, anexos binários e sincronização continuam explicitamente não implementados.
- Reforçada a legibilidade de Projeto e autoria, referências, instalação PWA, painel Estatísticas e Minha Pesquisa. Nenhum valor científico foi alterado.
- Cabeçalhos de modais longos passam a permanecer visíveis durante a rolagem para facilitar fechamento e orientação em telas pequenas.
- O botão Minha posição passa a expor estado de ocupação para tecnologias assistivas durante a consulta de geolocalização e mantém retorno visual de erro.
- Service Worker atualizado para a revisão `2026-08-21-pwa-9-auditoria-r4` para impedir permanência do HTML anterior em instalações PWA já existentes.

## Auditoria funcional estática

- Todos os botões estáticos possuem texto acessível, `aria-label` ou `title`.
- Nenhum link estático com `target="_blank"` foi encontrado sem proteção `noopener`.
- A localização continua sob demanda, sem rastreamento contínuo e sem persistência automática de coordenadas.
- A instalação PWA permanece disponível no menu, no centro de documentação e em Ajuda.

## Limite desta rodada

A tentativa de captura automatizada completa com Chromium headless excedeu o tempo de carregamento no ambiente de auditoria devido ao volume do aplicativo e das fontes cartográficas. Portanto, a validação visual final continua recomendada em dispositivo físico. Nenhuma conclusão visual foi inventada a partir dessa tentativa.
