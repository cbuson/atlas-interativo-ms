# v1.7.0 — IPG territorial único e restauração do repositório completo
### Correção funcional de geometria — 6 ago. 2026

- restauradas as funções geométricas comuns `geomParts`, `pointInRing`, `pointInPolygonGeom` e `segmentIntersection` na edição modular e na edição Android
- corrigida a falha `pointInRing is not defined` que impedia os cálculos PEIC e IATI
- acrescentado teste de execução real dos dois cálculos em navegador Chromium


### Revisão de articulação de itinerários — 6 de agosto de 2026

- PEIC cultural separado das rotas para eliminar circularidade.
- nova camada combinada IATI em malha de 250 km².
- convergência de rotas diretas e de vizinhança pré-calculada para reduzir o tempo de processamento.
- nodos prioritários e estratégicos identificados somente quando existe suporte cultural não sensível.
- Restaurada a malha cultural de 250 km² e eliminado o bloqueio por capturas externas durante o cálculo.
- Incorporado snapshot oficial do patrimônio material tombado do IPHAN, edição de maio de 2026, com posicionamento municipal explicitado.
- Incluída convergência de rotas propostas como componente Tn limitado a 10% e incapaz de criar pontuação sozinho.
- Reutilizada a malha estável da Fase 3.2 e vizinhança axial para reduzir o tempo de processamento.
- Corrigida a sincronização das legendas analíticas com o estado das camadas e incluído botão de fechamento que desativa a camada correspondente.
- Reparametrizado o indicador cultural em malha de 250 km², com pesos 0,45/0,25/0,20/0,10, riqueza limitada no percentil 95, continuidade saturada em três vizinhos, cobertura documental separada da pontuação e omissão das células sem evidência.
- Mantida uma única fórmula geocientífica, `IPG100 = 100 × (0,40 Dn + 0,35 Qn + 0,25 Cn)`.
- Removidos da aplicação os nomes operacionais e textos da pré-avaliação geocientífica anterior.
- Incorporado resultado estável em malha nominal de 250 km², com células sem evidência tratadas como não avaliadas.
- Separado potencial geocientífico documentado de viabilidade, governança, acesso e reconhecimento institucional.
- Adicionada camada documental de educação e extensão em Rio Verde, desativada por padrão e sem efeito sobre o IPG.
- Restaurada a arquitetura completa do repositório, incluindo GitHub Actions, documentação, licenças, Zenodo, manifesto SHA-256, `config.js`, `vendor/` e `dados/`.
- Convertido `index.html` em edição modular para GitHub Pages e mantida edição autônoma específica para Android.
- Sincronizados 24 conjuntos locais entre os arquivos modulares e a edição autônoma.
- Atualizado o fluxo de GitHub Pages e ampliada a validação estrutural e de integridade.
- Preenchido `camadas_relacionadas` nas 191 referências e criada matriz normalizada de 464 vínculos entre referências e camadas, com auditoria de método e confiança.

# v1.6.0 — separação dos indicadores geocientífico e cultural

- Substituído o indicador genérico de convergência patrimonial por dois resultados independentes em malha hexagonal nominal de 250 km².
- Criada a pré-avaliação geocientífica de possíveis geoparques, com diversidade geocientífica, riqueza ajustada de geossítios e cavernas, continuidade e contexto CNUC.
- Criados os polos territoriais estruturantes para itinerários culturais, com seis dimensões culturais, Simpson, riqueza ajustada e continuidade territorial.
- Retirados do indicador cultural geossítios, cavidades, universidades, Cadastur, rotas autorais e a Retirada da Laguna como dimensão específica.
- Mantida a proteção binária e agregada das presenças indígenas e quilombolas.
- Normalizadas todas as referências em APA 7 e criado mapa de rastreabilidade entre fontes e camadas.
- Total de 96 camadas operacionais.

# v1.5.1 — polos territoriais de convergência patrimonial

- Inclusão da camada calculável `polos_nucleares_convergencia_250km2`.
- Malha hexagonal nominal de 250 km² em projeção equivalente.
- Índice composto de diversidade normalizada, diversidade equilibrada de Simpson e riqueza ponderada.
- Rampa coroplética de cinco classes, do lilás claro ao roxo escuro, com legenda cartográfica.
- Nove dimensões locais reproduzíveis; universidades excluídas da fórmula.
- Presenças indígena e quilombola binárias e protegidas, sem nomes ou contagens públicas.
- 95 camadas operacionais e protocolo metodológico específico.

# v1.5.1 — patrimônio, museus, turismo, uso da terra e hidrovias

- Substituição das referências preliminares de patrimônio material, museus e Cadastur por conectores oficiais sob demanda.
- Leitura nativa de XLSX no navegador com JSZip e importação manual de contingência.
- Cadastur agregado por município, sem exposição de dados cadastrais individuais.
- Ativação de estatísticas municipais MapBiomas 10.1 e camada de desmatamento.
- Inclusão da VEN 2022 da ANTAQ com recorte de Mato Grosso do Sul.
- 94 camadas operacionais e atualização integral de catálogo, referências, metadados e validações.

# Changelog

## v1.5.1 — 6 de agosto de 2026

- Ativação das camadas oficiais CNUC e CANIE/CECAV por WFS.
- Recorte dinâmico de Mato Grosso do Sul, contingência ArcGIS e importação manual.
- Três análises ambientais derivadas em sessão.
- Correção da função geral de importação de GeoJSON, KML, CSV e ZIP Shapefile.
- CNUC, CANIE e seus cruzamentos permanecem fora do índice estável.


- Acrescentada camada dinâmica de acessibilidade rodoviária estimada para nove registros priorizados.
- Implementado cálculo sob demanda com OSRM e dados OpenStreetMap, uma feição por trecho.
- Separada integralmente a geometria viária calculada das geometrias culturais esquemáticas.
- Reclassificadas EST-023 e EST-024 como propostas autorais baseadas em produtos turísticos institucionais consolidados.
- Incluídos protocolo metodológico, tabela de priorização, campos de limitações e exportação GeoJSON.
- A camada dinâmica permanece fora do índice municipal e do núcleo espacial congelado.

# Changelog

### Correção de conteúdo antes da primeira publicação
- Removida a camada duplicada `itinerarios_culturais`, semanticamente idêntica a `rotas_culturais_propostas`.
- `rotas_culturais_propostas` passa a ser a única camada canônica das sete hipóteses.
- A fonte das composições foi corrigida para elaboração própria e OEI/PRICI passou a ser identificado como referencial teórico.
- Acrescentadas bases documentais específicas em cada hipótese.
- Catálogo corrigido para 89 camadas operacionais e 20 conjuntos locais únicos.
- Encerradas no catálogo as marcações residuais de licença do projeto a definir.


## 1.5.0 — 6 de agosto de 2026

- Explicitada em toda a distribuição a natureza de projeto de pesquisa científica. As 31 rotas e itinerários são propostas metodológicas revisáveis para aplicação e adaptação do marco PRICI e não propostas aprovadas pelo programa.

- Ampliado o inventário de 7 para 31 rotas e itinerários em estudo.
- Incorporadas rotas institucionais da Fundtur MS, incluindo Rota dos Pioneiros, Rota do Cerrado e rotas de aviturismo.
- Incorporado o Roteiro Histórico da Retirada da Laguna como itinerário documental com geometria esquemática.
- Acrescentadas macrohipóteses territoriais para norte, centro, Costa Leste, Vale do Ivinhema, Chaco, fronteira, patrimônio industrial, museus, artesanato, comitivas e festas.
- Incluídos campos de classificação, maturidade, status institucional, fontes, governança e relação entre rotas.
- Regenerados 137 trechos, 31 pré-avaliações, 31 eixos exploratórios e 31 áreas de influência.
- Acrescentadas 10 referências institucionais ao inventário bibliográfico.
- Atualizados HTML, catálogo, GeoPackage, KML, KMZ e metadados de citação.

## 1.0.0 — 5 de agosto de 2026

- Preparado pacote de distribuição para GitHub Pages com publicação automática.
- Adicionados `.nojekyll`, workflow de Pages, guia de publicação e documentação comunitária.
- Acrescentados metadados web, Subresource Integrity para Leaflet e URLs do repositório.

- Congelada a primeira versão semântica citable.
- Confirmada a autoria de Carlos Busón Buesa, Carlos Otávio Zamberlan e Moisés Centenaro.
- Definido licenciamento misto MIT, CC BY 4.0, ODbL e regimes originais de terceiros.
- Adicionados CITATION.cff, .zenodo.json, AUTHORS.md e guia de depósito no Zenodo.
- Renomeados arquivos e referências internas para v1.0.0.
- Removidos arquivos legados da v19 do pacote de distribuição.
- Adicionada tabela de licenciamento ao GeoPackage.
- Regenerados KML, KMZ, validação estrutural e manifesto SHA-256.

## 20.1 — versão de preparação



- Restabelecidas funções de captura, busca, importação, exportação, cálculo e inicialização ausentes na v19.
- Separadas atualizações oficiais e capturas colaborativas.
- Corrigido o processamento do Censo Escolar.
- Busca ampliada para todas as camadas locais, mesmo não ativadas.
- Índice estável renomeado, fórmula publicada e análise de sensibilidade incorporada.
- Criado cenário temporário separado, sem sobrescrever o índice estável.
- Renomeados geossítios compilados, eixos exploratórios e áreas de influência para evitar afirmações excessivas.
- Recalculadas extensões geodésicas, buffers métricos e proximidades em quilômetros.
- GeoPackage reconstruído sem dezenas de camadas vazias.
- Catálogo ampliado com licenças, validação, restrições, CRS, escala e responsabilidade.
- Implementado modo público para coordenadas arqueológicas.
- Incluídos metodologia, governança, licenças, diagnóstico interno e relatório de validação.

- Corrigidos o contador integrado de referências para 152 e os 52 grupos temáticos.
- Reparado o botão de captura do Censo Escolar e a leitura de codificação dos CSV.
- Adicionada confirmação para desativar a proteção de coordenadas sensíveis.
- Corrigida a descrição dos 54 geossítios para distinguir 40 pontos e 14 geometrias pendentes.
- Melhoradas navegação móvel, foco de teclado, diálogos, tecla Escape e segurança dos links externos.
- Reduzidos os lotes ArcGIS para evitar URLs excessivamente longas.
