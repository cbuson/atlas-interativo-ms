# Atlas Interativo do Patrimônio e dos Itinerários Culturais de Mato Grosso do Sul

[![GitHub Pages](https://github.com/cbuson/atlas-interativo-ms/actions/workflows/pages.yml/badge.svg)](https://github.com/cbuson/atlas-interativo-ms/actions/workflows/pages.yml)
[![Versão](https://img.shields.io/badge/vers%C3%A3o-1.7.0-155b4c)](CHANGELOG.md)
[![Código MIT](https://img.shields.io/badge/c%C3%B3digo-MIT-blue)](LICENSE-CODE-MIT.txt)
[![Conteúdo CC BY 4.0](https://img.shields.io/badge/conte%C3%BAdo-CC%20BY%204.0-lightgrey)](LICENSE-CONTENT-CC-BY-4.0.txt)

**Aplicação online prevista**  
https://cbuson.github.io/atlas-interativo-ms/

**Versão científica**  
1.7.0, com data de corte em 6 de agosto de 2026

## Autores

- Carlos Busón Buesa, Universidade Federal de Mato Grosso do Sul
- Carlos Otávio Zamberlan, Universidade Estadual de Mato Grosso do Sul
- Moisés Centenaro, Universidade Estadual de Mato Grosso do Sul

## Escopo

O atlas integra patrimônio, geodiversidade, comunidades, infraestrutura, turismo, paisagem e hipóteses exploratórias de itinerários culturais em Mato Grosso do Sul. As rotas e áreas derivadas são objetos científicos revisáveis. Não constituem percursos oficiais, produtos turísticos, autorizações de acesso nem propostas aprovadas pelo PRICI.

## Arquitetura do repositório

- `index.html` é a edição modular para GitHub Pages
- `config.js` reúne a configuração pública sem segredos
- `dados/` contém 24 conjuntos locais editáveis, um arquivo JavaScript por camada
- `dados/manifesto.json` registra arquivo e número de elementos de cada conjunto local
- `vendor/` contém a dependência local usada para exportação ZIP
- `Atlas_Interativo_MS_v1.7.0_Android_Arquivo_Unico.html` é a edição autônoma com dados incorporados
- `.github/workflows/pages.yml` publica automaticamente cada push em `main`

## Indicador geocientífico vigente

A versão 1.7.0 utiliza somente o Índice de Potencial Geocientífico Territorial documentado

`IPG100 = 100 × (0,40 Dn + 0,35 Qn + 0,25 Cn)`

O índice mede evidência geocientífica documentada, diversidade temática, qualidade ou riqueza ajustada e continuidade territorial. Não mede viabilidade de geoparque, governança, consentimento, acesso, infraestrutura, reconhecimento UNESCO ou prioridade pública. Células sem registros são classificadas como sem evidência suficiente e não recebem valor zero.

## Rio Verde de Mato Grosso

A camada `ativacao_geocientifica_extensao` permanece desativada por padrão. Registra documentação de educação e extensão associada a Rio Verde e não altera o IPG. Sua presença não representa um inventário estadual completo nem uma comparação definitiva entre municípios.

## Rastreabilidade bibliográfica por camada

- `atlas_ms_v1.7.0_referencias_apa7.csv` vincula cada uma das 191 referências a um ou mais `camada_id` válidos
- `atlas_ms_v1.7.0_matriz_referencias_camadas.csv` normaliza a relação muitos para muitos, com uma linha por vínculo
- `AUDITORIA_VINCULOS_REFERENCIAS_CAMADAS_V1.7.0.csv` registra o valor anterior, o vínculo aplicado, o método e a confiança
- vínculos de bibliotecas e mapas-base são marcados como componentes transversais ou contextuais, sem serem apresentados como fontes temáticas diretas

## Integridade e citação

- `MANIFESTO_SHA256.txt` permite verificar os arquivos distribuídos
- `CITATION.cff` e `.zenodo.json` contêm os metadados de citação
- `LICENSE` apresenta o licenciamento misto reconhecível pelo GitHub
- `CHANGELOG.md` registra a evolução metodológica e técnica

## Publicação

Extraia o ZIP na raiz do repositório, preserve arquivos ocultos e selecione GitHub Actions em `Settings` e `Pages`. Consulte `PUBLICACAO_GITHUB.md`.

## Licenciamento

Código próprio sob MIT. Documentação, metodologia e produtos autorais sob CC BY 4.0. Dados derivados do OpenStreetMap permanecem sob ODbL 1.0. Dados de terceiros mantêm seus termos originais. Consulte `LICENSE`, `NOTAS_DE_LICENCAS.md` e `THIRD_PARTY_NOTICES.md`.

- PEIC cultural em malha estável de 250 km², calculado sem utilizar as rotas propostas.
- camada combinada IATI em 250 km², com 70% de estrutura cultural e 30% de convergência cartográfica das rotas.
- base de convergência de rotas pré-calculada para acelerar o aplicativo.

## Correção funcional PEIC e IATI

A edição atual restaura o núcleo geométrico compartilhado pelos cálculos PEIC e IATI. A correção elimina a falha `pointInRing is not defined` observada na edição anterior. As fórmulas, os pesos e a malha nominal de 250 km² permanecem inalterados. O diagnóstico interno agora verifica automaticamente essas funções antes do uso.
