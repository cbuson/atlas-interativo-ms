# JOAJU MS

**Atlas Integrado do Patrimônio e do Território de Mato Grosso do Sul**

**Territórios conectados. Patrimônios em movimento.**

JOAJU MS é a identidade pública do *Atlas Interativo do Patrimônio e dos Itinerários Culturais de Mato Grosso do Sul*, título bibliográfico mantido na citação Zenodo.

## Estado do pacote

A distribuição GitHub desta versão usa o corte territorial de **10/08/2026**.

- malha territorial R5 com **1.554 células**
- IPG, PEIC, IATI, IAT, ISA, ICT, IPAE e ICD materializados
- IPG, PEIC e IATI preservam `null` quando a ausência de evidência está documentada
- IAT, ISA, ICT, IPAE e ICD possuem cobertura numérica integral
- ficha territorial consolidada para as 1.554 células
- quatro análises derivadas materializadas, acessibilidade rodoviária, rotas × unidades de conservação, cavidades próximas às rotas e cavidades × unidades de conservação
- SHA256 dos produtos territoriais registrado em `dados/precalculados/snapshot_metadata.json`

A validação canônica está em `VALIDACAO_V1.8.0-dev.md` e `docs/SNAPSHOT_PRECALCULADO_V1.8.0_2026-08-10.md`.

## Arquitetura snapshot-first

A consulta territorial ordinária usa arquivos estáticos em `dados/precalculados/`. Ativar um índice não inicia reconstrução da malha nem geoprocessamento pesado.

A **Ficha Universal 1.1** valida qualquer identificador territorial contra a malha R5. Produtos históricos que conservam IDs `IPG-*` não são tratados como células atuais. Quando existe geometria, o vínculo com R5 é reconstruído localmente por interseção e pode resultar em uma ou várias células.

O arquivo antigo `snapshot_indices_ficha.js` não faz parte desta distribuição. A ficha territorial fechada é carregada diretamente de `dados/precalculados/ficha_territorial_250km2.geojson`.

As atualizações com fontes recentes continuam disponíveis como operações avançadas e explícitas.

## Ficha Universal

A interface desta distribuição aplica uma regra única de consulta. **Toda camada possui ficha de camada** com fonte, estado, corte, proveniência, licença e limitações disponíveis. **Todo elemento vetorial selecionável possui ficha própria**.

Quando um ponto pertence a uma única célula R5, a ficha incorpora diretamente o perfil territorial com IPG, PEIC, IATI, IAT, ISA, ICT, IPAE e ICD. Quando uma linha ou polígono atravessa várias células, o Atlas registra todos os hexágonos intersectados e apresenta uma síntese mínimo–média–máximo dos índices, sem escolher arbitrariamente uma célula principal. Cada hexágono pode ser aberto individualmente a partir da ficha.

A associação é executada localmente sobre a malha R5 já carregada. Um clique em uma ficha **não inicia captura remota nem recalcula índices**. Camadas raster, mapas dinâmicos e referências externas continuam tendo ficha de camada mesmo quando não possuem entidade vetorial individual clicável.

## Barrido integral de camadas e fichas

A distribuição inclui `scripts/auditar_carga_camadas_fichas.mjs`, que verifica a coerência das 153 configurações, a execução dos 90 arquivos do `DATA_MANIFEST`, os 9 snapshots raster/KMZ, os 12 produtos precalculados e a correspondência dos oito índices com as 1.554 fichas R5. O auditor também impede que o fallback histórico do IPG de 1.690 células substitua silenciosamente o produto fechado R5.

O barrido espacial complementar está documentado em `docs/BARRIDO_COMPLETO_CAMADAS_FICHAS_2026-08-12.*`. Ele identifica também registros válidos de snapshots capturados por envelope que ficam fora da R5. Esses casos são tratados como questão de recorte de fonte e não como falha de carregamento.

## Painel Dados e Estatísticas

O painel **Dados** lê diretamente a Ficha Territorial fechada para calcular a cobertura dos oito índices. Assim, IPG, PEIC, IATI, IAT, ISA, ICT, IPAE e ICD mostram a cobertura do corte publicado mesmo quando suas camadas visuais ainda não foram ativadas. Na escala estadual, contagens dos conjuntos locais incorporados usam `DATA_MANIFEST`. Recortes municipais e gráficos detalhados carregam somente os conjuntos locais necessários, sem captura remota automática e sem recalcular índices.

## Distribuição GitHub e arquivos muito grandes

Dois snapshots vetoriais integrais do computador de trabalho ultrapassam o limite normal de arquivo do GitHub e não são incluídos no repositório principal.

- `rede_hidrica` permanece como captura oficial sob demanda
- `mapa_geomorfologico_ibge` permanece como referência e download oficial

A interface não os anuncia como snapshots locais inexistentes. Eles podem ser materializados novamente no ambiente de trabalho a partir das fontes configuradas.

Os pacotes completos KML, KMZ, GeoJSON e as variantes SINGLEFILE são artefatos de distribuição. Não são necessários para executar o site e devem ser publicados, quando desejado, como assets de uma Release.

## Executar localmente

A ficha territorial usa `fetch`, portanto a forma recomendada é servir a pasta por HTTP.

```bash
npm ci
npm run serve
```

Abra

```text
http://127.0.0.1:8765/index.html
```

## Validação

Para verificar o snapshot territorial e a estrutura do repositório

```bash
npm run validar-precalculados
npm run audit-release
npm run audit-fichas
```

O primeiro comando valida as 1.554 células, identidade de `hex_id`, identidade geométrica, regras de nulos, ficha territorial e SHA256 do snapshot.

O segundo verifica manifesto, arquivos locais, produtos precalculados, referências estáticas, estado dos oito índices e sintaxe JavaScript da aplicação.

## Materialização científica

Os produtos fechados desta distribuição já estão presentes. Para reproduzir ou criar um novo corte no computador de trabalho

```bash
npm run preparar-snapshot
npm run fechar-snapshot
```

As análises derivadas podem ser materializadas com

```bash
npm run materializar-analises
```

Os diretórios `resultados_indices/`, `resultados_analises/`, variantes SINGLEFILE e outros artefatos gerados são deliberadamente ignorados pelo Git porque podem ser reconstruídos.

## Estrutura principal

- `index.html` aplicação canônica para GitHub Pages
- `dados/precalculados/` malha, ficha e oito índices fechados
- `dados/materializados/2026_08_10/` snapshots locais usados pelo Atlas
- `scripts/` materializadores, validadores e utilitários reproduzíveis
- `docs/` protocolos, validações e documentação operacional
- `metodologia.html` metodologia navegável
- `atlas_ms_v1.8.0-dev_catalogo_camadas.csv` catálogo atual das camadas
- `atlas_ms_v1.8.0-dev_mapa_fontes_camadas.csv` relação atual entre camadas e fontes
- `docs/MATRIZ_LICENCAS_E_REDISTRIBUICAO.csv` matriz de licenças e distribuição
- `SHA256SUMS.txt` hashes da distribuição GitHub

## Privacidade e precisão pública

As localidades pontuais indígenas e quilombolas incorporadas ao pacote usam a generalização pública definida pelo projeto. Limites territoriais legais oficiais não são deformados por generalização.

A existência de uma fonte pública não equivale a validação de campo, confirmação institucional ou participação comunitária. Consulte sempre os campos de evidência, validação e limites da camada.

## Céu noturno

O Atlas integra referências NASA Black Marble, World Atlas de Falchi et al. e VIIRS para orientação territorial. Radiância orbital, skyglow modelado e classe de Bortle não são equivalentes. Essas camadas não constituem certificação de céu escuro.


## Aplicativo instalável · PWA

Esta distribuição também funciona como **Progressive Web App**. Em navegadores compatíveis, JOAJU MS pode ser instalado no celular, tablet ou computador e aberto em modo `standalone`, sem uma aplicação nativa separada.

O manifest está em `manifest.webmanifest`, o Service Worker em `service-worker.js` e os ícones em `assets/icons/`. A interface oferece a ação **Instalar JOAJU no dispositivo**.

A opção **Preparar núcleo offline** baixa aproximadamente 50 MB com a malha R5, a Ficha Territorial, os oito índices e as quatro análises derivadas. Esse pacote offline não inclui mapas-base, serviços oficiais remotos nem todas as 153 camadas. As demais camadas continuam sendo carregadas sob demanda e podem depender de conexão.

Em iPhone e iPad, a instalação é feita pelo Safari com **Compartilhar → Adicionar à Tela de Início**.

## GitHub Pages

A aplicação pode ser publicada a partir da raiz da branch `main` com **Deploy from a branch**.

Não é necessário publicar `node_modules`, backups, patches históricos, resultados duplicados ou variantes de distribuição.

## Citação

Busón Buesa, C., Zamberlan, C. O., & Centenaro, M. (2026). *Atlas Interativo do Patrimônio e dos Itinerários Culturais de Mato Grosso do Sul* [Software e conjunto de dados]. Zenodo. DOI 10.5281/zenodo.21829982.

Consulte também `CITATION.cff` e `CITACAO_RECOMENDADA.txt`.

## Autores

Carlos Busón Buesa · UFMS · ORCID 0000-0002-1446-2252

Carlos Otávio Zamberlan · UEMS · ORCID 0000-0001-9975-9612

Moisés Centenaro · UEMS · ORCID 0000-0003-2299-9102

## Licenças

Código próprio sob MIT. Textos, documentação, metodologia e produtos autorais sob CC BY 4.0. Dados e componentes de terceiros mantêm os termos de suas fontes.

Consulte `THIRD_PARTY_NOTICES.md` e `docs/MATRIZ_LICENCAS_E_REDISTRIBUICAO.csv`.

## Correção de fichas e cache · 12/08/2026

A revisão PATCH 14 endurece a separação entre a malha R5 publicada e grades históricas.

- somente IDs `HX-*` existentes nas 1.554 células R5 são aceitos como chave territorial canônica
- IDs históricos `IPG-*` são relacionados à R5 exclusivamente pela geometria
- em ficha de snapshot fechado, `null` em IPG, PEIC ou IATI significa ausência de evidência ou resultado conforme o protocolo, nunca `cálculo pendente`
- os produtos de `dados/precalculados/` usam estratégia network-first no Service Worker, com cache apenas como contingência offline
- uma atualização do Service Worker assume controle e recarrega a página uma única vez, reduzindo mistura entre código antigo e dados novos após publicação
- a busca de camadas reaplica o filtro quando o navegador restaura automaticamente o valor do campo após recarga ou retorno à página


## Cobertura visual dos índices esparsos

IPG, PEIC e IATI não possuem valor numérico em todas as 1.554 células. A interface não interpreta esses nulos como falha de carregamento. IPG desenha somente células com valor numérico. PEIC desenha as células numéricas e preserva em cinza os contextos comunitários protegidos previstos pelo protocolo. IATI desenha somente células com resultado numérico. IAT, ISA, ICT, IPAE e ICD possuem cobertura numérica integral no corte fechado.

