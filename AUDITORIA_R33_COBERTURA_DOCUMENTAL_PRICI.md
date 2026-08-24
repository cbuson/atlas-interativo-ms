# JOAJU MS · R33 · auditoria e integração da Cobertura Documental PRICI

## Resultado da auditoria

A versão recebida foi auditada estruturalmente antes da alteração.

O pacote contém 153 camadas configuradas, 32 propostas de rotas culturais, uma implementação local de autoavaliação PRICI, Minha Pesquisa baseada em IndexedDB e produtos territoriais precalculados sobre a malha R5 de 1.554 células.

A suíte de auditoria existente do próprio projeto foi executada depois da integração.

Resultado final

- validar_precalculados · PASS
- auditar_fichas · 47 PASS · 0 WARN · 0 FAIL
- auditar_estatisticas · 16 PASS · 0 WARN · 0 FAIL
- auditar_release · 232 PASS · 0 WARN · 0 FAIL
- JavaScript inline · 29 de 29 blocos válidos
- 153 IDs de camada únicos
- 1.554 hexágonos R5 preservados
- nenhum cálculo territorial foi alterado

## Onde a visualização foi integrada

A Cobertura Documental foi colocada dentro do resumo de cada autoavaliação PRICI.

Isso significa que a unidade de análise é a proposta ou itinerário em avaliação, e não o Atlas inteiro.

As 32 rotas de referência agora também recebem um acesso direto

Autoavaliar / cobertura

O botão abre a autoavaliação já vinculada à rota escolhida.

## Como a Cobertura Documental é calculada

O painel não cria uma pontuação PRICI.

Para cada uma das quatro dimensões, os 63 critérios são classificados operacionalmente em estados mutuamente exclusivos.

Documentado
Resposta Sim ou Não e pelo menos uma evidência ou fonte registrada.

Parcial
Resposta Parcial.

Resposta sem evidência
Resposta Sim ou Não sem evidência nem fonte registrada.

Requer verificação
Resposta Não sei ou requer verificação.

Não se aplica
É retirado apenas do denominador visual da cobertura.

A visualização mantém explicitamente a regra

SEM DADO ≠ AUSÊNCIA VERIFICADA

Uma resposta Não no questionário não é transformada automaticamente em ausência territorial, patrimonial ou documental.

## Ligação com Minha Pesquisa

O painel oferece

Revisar lacunas

que abre a seção de lacunas da própria autoavaliação.

Também oferece

Anexar à Minha Pesquisa

que utiliza a função já existente do JOAJU para guardar uma cópia da autoavaliação no expediente de pesquisa do usuário.

Assim, a integração aproveita a arquitetura existente e não cria um segundo banco de dados.

## Armazenamento encontrado na auditoria

Autoavaliações PRICI
localStorage
chave atlas_prici_autoavaliacoes_v1_0

Minha Pesquisa
IndexedDB

Recursos, mídias e rotas de trabalho de campo
IndexedDB
banco joaju_ms_campo_prici_r31

A autoavaliação possui source_route_id quando criada a partir de uma rota de referência.

Minha Pesquisa já aceita prici_snapshots.

## Cálculos no PC

Esta integração não precisa de materialização no computador.

Ela trabalha somente com os 63 estados e campos de evidência da autoavaliação atualmente aberta no navegador.

Nenhuma malha, GeoJSON, índice territorial ou camada precisa ser recalculada.

O PC continua necessário apenas quando se deseja regenerar produtos territoriais precalculados, por exemplo IPG, PEIC, IATI, IAT, ISA, ICT, IPAE, ICD ou outras análises derivadas.

## Arquivo a substituir

Substituir somente

index.html

Todos os demais arquivos do site permanecem os da versão recebida.

## Teste recomendado

1. Abrir Rotas e itinerários.
2. Escolher uma rota.
3. Pressionar Autoavaliar / cobertura.
4. Preencher alguns critérios.
5. Registrar evidência ou fonte em alguns itens.
6. Abrir Resumo.
7. Conferir a Cobertura documental das quatro dimensões.
8. Alterar um item para Parcial ou Não sei e voltar ao Resumo.
9. Confirmar a atualização do painel.
10. Pressionar Revisar lacunas.
11. Pressionar Anexar à Minha Pesquisa.
12. Verificar que a cópia aparece no expediente de pesquisa.

## Limite metodológico

Cobertura documental não significa maturidade, qualidade, viabilidade, reconhecimento ou certificação da rota.

O módulo visualiza o estado da documentação registrada pelo usuário.
