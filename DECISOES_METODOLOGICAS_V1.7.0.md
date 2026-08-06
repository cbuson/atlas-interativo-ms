# Decisões metodológicas da versão 1.7.0

## Fórmula geocientífica

A versão mantém somente o Índice de Potencial Geocientífico Territorial documentado

`IPG100 = 100 × (0,40 Dn + 0,35 Qn + 0,25 Cn)`

Nenhuma fórmula geocientífica anterior é executada ou apresentada como método vigente.

## Rio Verde de Mato Grosso

A camada de ativação geocientífica é documental, independente e desativada por padrão. Ela não altera o IPG e não autoriza afirmar que o inventário estadual de extensão esteja completo. Sua inclusão deve ser revisada separadamente do modelo geocientífico.

## Ausência de registros

Uma célula sem registros recebe `ipg_100 = null` e a classe `sem evidência suficiente`. Não é interpretada como potencial baixo ou nulo.

## Viabilidade

O IPG não avalia acesso, infraestrutura, conservação, propriedade, consentimento, governança, capacidade institucional ou reconhecimento UNESCO.

## Revisão pré-publicação do indicador cultural

A malha cultural permanece em 250 km², a mesma resolução nominal usada na análise geocientífica. O PEIC mostra apenas células com evidência e mantém a cobertura documental separada da pontuação. As rotas não entram no PEIC. A camada combinada IATI usa o PEIC como base independente e acrescenta, com peso máximo de 30%, a convergência direta e de vizinhança das rotas propostas. A legenda acompanha diretamente o estado da camada e fecha ao desativá-la.

## Correção funcional do núcleo geométrico

As funções geométricas compartilhadas `geomParts`, `pointInRing`, `pointInPolygonGeom` e `segmentIntersection` foram restauradas nas edições modular e Android. A correção elimina a falha que interrompia os cálculos PEIC e IATI sem alterar fórmulas ou parâmetros.
