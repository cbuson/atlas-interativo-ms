# Correção de conteúdo antes da primeira publicação

## Duplicação eliminada

Os arquivos `dados/itinerarios_culturais.js` e `dados/rotas_culturais_propostas.js` continham as mesmas sete feições e os mesmos atributos temáticos. Eles não eram literalmente idênticos em bytes porque registravam chaves JavaScript diferentes, mas eram semanticamente duplicados.

A camada canônica é agora `rotas_culturais_propostas`. A camada `itinerarios_culturais` foi retirada do manifesto, da aplicação, do catálogo, do GeoPackage, do KML e do KMZ.

O inventário passa de 90 para 89 camadas operacionais e de 21 para 20 conjuntos espaciais locais únicos. Nenhum conteúdo temático foi perdido.

## Autoria e referencial das hipóteses

As sete rotas são composições autorais do projeto Atlas Interativo MS. O campo `fonte` foi uniformizado como elaboração própria. OEI/PRICI aparece em campo separado como referencial teórico e institucional. Cada registro inclui bases documentais específicas que sustentam os temas e lugares relacionados, sem atribuir a essas fontes a proposição da rota.

## Regime de uso

As hipóteses continuam identificadas como traçados esquemáticos, sem caráter oficial, certificado ou operacional. Exigem validação documental, comunitária, jurídica, logística e de campo.
