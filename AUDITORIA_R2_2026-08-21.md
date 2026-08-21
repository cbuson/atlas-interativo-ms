# JOAJU MS · Auditoria R2

Data de consolidação · 21/08/2026

Base de trabalho · JOAJU MS v1.8.0-dev · cópia R1 recebida para continuação da auditoria

## Escopo desta rodada

Esta rodada preserva a arquitetura, os dados, as 153 configurações de camada, a família territorial R5 e os módulos existentes. Não reconstrói o projeto e não substitui fontes ou resultados.

## Melhorias consolidadas

### Legibilidade

Foi acrescentada uma camada final de estilos de acessibilidade para evitar que regras posteriores do próprio documento reduzam novamente a tipografia. Foram elevados os tamanhos mínimos dos textos auxiliares, cartões, fichas, documentação, navegação móvel e controles cartográficos.

### Uso móvel

Campos de formulário passam a usar 16 px em telas móveis para reduzir zoom automático em navegadores móveis. Controles interativos principais passam a respeitar alvos táteis de aproximadamente 44 px ou mais. A barra inferior móvel recebeu rótulos mais legíveis.

### Cartografia

Os controles Leaflet de zoom e camadas receberam alvos táteis maiores. O botão Minha posição conserva 48 px e a silhueta de Mato Grosso do Sul definida na R1. A geolocalização continua sob demanda, sem rastreamento contínuo.

### PWA em Ajuda

A instalação PWA agora aparece também como seção própria, aberta e destacada no sumário da Ajuda. A seção explica Android e computadores compatíveis, iPhone e iPad e o núcleo territorial offline. O botão reutiliza o fluxo de instalação PWA já existente no projeto.

### Acessibilidade

Foi reforçada a indicação visual de foco por teclado. Foi incluída preferência por movimento reduzido. A tecla Escape passa a fechar modais abertos e o painel de documentação quando aplicável. O botão Minha posição recebe descrição adicional para leitores de tela.

### Atualização PWA

A revisão interna do cache do Service Worker foi incrementada para evitar que instalações existentes permaneçam presas à interface anterior depois da atualização.

## Validação após mudanças

A bateria integral fornecida pelo próprio projeto foi executada após a consolidação.

Resultado final

217 PASS
0 WARN
0 FAIL

A validação inclui os produtos precalculados, fichas, estatísticas, carga de camadas, índices célula a célula, referências locais, PWA e sintaxe dos 16 blocos JavaScript inline presentes nesta consolidação.

## Limites desta rodada

A auditoria externa dos 187 destinos remotos não foi incorporada nesta rodada. Também não foi alterado nenhum dado científico nem recalculado qualquer índice. A avaliação visual em múltiplos aparelhos físicos permanece uma etapa separada de teste de interface.
