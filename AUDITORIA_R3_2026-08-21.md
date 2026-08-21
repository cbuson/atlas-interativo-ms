# JOAJU MS · Auditoria R3 · 21 de agosto de 2026

## Escopo

Consolidação visual e móvel sobre a R2, sem alteração dos dados científicos, dos oito índices fechados, das 153 configurações de camada ou das geometrias territoriais.

## Alterações desta rodada

- Diferenciação visual entre a Ficha territorial e o acesso rápido a Projeto e autoria. A Ficha deixa de usar o mesmo símbolo de informação reservado à autoria.
- Cartão Projeto e autoria destacado também no centro de documentação móvel.
- Rótulos ARIA adicionados aos principais botões da navegação móvel.
- Navegação inferior móvel convertida em faixa horizontal adaptativa quando o número de ferramentas excede a largura disponível. Mantém alvos táteis adequados sem reduzir excessivamente os textos.
- Painéis laterais móveis receberam maior área útil, margens consistentes e tipografia mais legível.
- Ficha Universal, perfil dos hexágonos, tabelas chave-valor, avisos e índices receberam reforço de legibilidade.
- Legendas cartográficas receberam tipografia maior, botão de fechar ampliado e afastamento da barra móvel.
- Atribuição cartográfica e controles inferiores receberam proteção contra sobreposição com a navegação móvel.
- Ajuda recebeu reforço final de tipografia em sumário, seções, cartões e explicações.
- Cartão de autoria recebeu diferenciação visual sem alterar o conteúdo original.
- Service Worker atualizado para a revisão `2026-08-21-pwa-8-auditoria-r3`, garantindo renovação do cache após a publicação desta versão.

## Elementos preservados

- 153 camadas configuradas.
- Malha R5 com 1554 células.
- Oito índices territoriais fechados.
- Dados, fontes, proveniência e snapshots existentes.
- Lógica de geolocalização sob demanda incorporada na R1.
- PWA e preparação do núcleo territorial offline.
- Minha Pesquisa, painel estatístico, rotas, fichas e documentação.

## Validação automatizada depois das alterações

`npm run audit-completo`

Resultado final

- 217 PASS
- 0 WARN
- 0 FAIL
- 16 blocos JavaScript inline validados

## Observação

A validação automatizada confirma integridade estrutural e regras internas do projeto. A avaliação visual final em navegadores e dispositivos físicos continua recomendada, especialmente para Android, iPhone e telas pequenas, pois dimensões reais, barras do navegador e permissões de geolocalização variam por dispositivo.
