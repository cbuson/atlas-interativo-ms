# Protocolo das camadas oficiais de patrimônio, museus, turismo, uso da terra e hidrovias

Versão 1.5.0  |  data de corte 6 de agosto de 2026

## Finalidade

Este protocolo documenta a integração das camadas que permaneciam apenas como referências preliminares ou consultas externas na versão 1.3.0. Todas integram um projeto de pesquisa científica e não alteram o índice estável de disponibilidade documental.

## IPHAN — bens materiais tombados

A captura utiliza a planilha oficial `2026_05_IPHAN_T.xlsx`. Registros com coordenadas preservam a geometria da fonte. Quando a planilha contém município, mas não coordenadas, o atlas utiliza a sede municipal como ponto representativo e registra essa precisão no atributo `precisao_geometria`. O ponto municipal não representa a delimitação do bem.

## MuseusBr/IBRAM

A captura consulta a coleção pública 208 da API Tainacan. São mantidos nome, município, status e metadados institucionais necessários ao estudo. Contatos pessoais e campos desnecessários são descartados. Na ausência de coordenada, utiliza-se sede municipal representativa.

## Cadastur

O atlas consulta o catálogo CKAN do Ministério do Turismo, identifica os recursos mais recentes e gera sínteses por município. Não publica CPF, CNPJ, telefone, e-mail ou endereço individual. As camadas representam disponibilidade formal cadastrada, não qualidade, capacidade receptiva, funcionamento presente ou recomendação comercial.

## MapBiomas

A cobertura municipal utiliza a Coleção 10.1, 1985–2024. O atlas calcula uma síntese de vegetação natural, agropecuária, área urbanizada e água, além da variação de vegetação natural entre 1985 e 2024. A camada de desmatamento preserva o nível territorial reconhecido na planilha. Os pontos são símbolos de estatísticas territoriais e não representam pixels.

## Hidrovia do Paraguai

A geometria procede da base ANTAQ de Vias Interiores Economicamente Navegadas, VEN 2022. O recorte não deve ser confundido com o projeto de concessão de 600 km entre Corumbá e a foz do rio Apa. A camada não informa condição instantânea de navegação, calado, dragagem, restrições operacionais, autorização ou segurança.

## Reprodutibilidade e contingência

As fontes são capturadas somente quando o pesquisador solicita. Falhas de CORS, indisponibilidade ou mudança de esquema não alteram o núcleo local. Todas as camadas permitem importação manual de CSV, XLSX, ZIP Shapefile, GeoJSON ou KML conforme o caso. O arquivo oficial utilizado deve ser preservado junto ao registro de data e origem da captura.
