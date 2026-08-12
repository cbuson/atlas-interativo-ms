# Metodologia e governança · v1.8.0-dev

## Finalidade

JOAJU MS é uma infraestrutura digital de pesquisa territorial. O aplicativo organiza evidências documentais e geoespaciais, camadas, índices, rotas, proveniência e mecanismos de validação para apoiar a análise de itinerários culturais em Mato Grosso do Sul.

**Territórios conectados. Patrimônios em movimento.**

## Sobre o nome

`Joaju` é uma palavra da língua guarani associada às ideias de união, de estar unido e de estar junto. A escolha funciona como identidade do projeto e expressa sua finalidade de articulação territorial.

O nome não constitui consulta, validação, representação ou aval formal dos povos Guarani e Kaiowá ou de qualquer comunidade indígena. Eventual participação, anuência ou validação comunitária deve ser documentada de forma específica e não pode ser inferida do nome do Atlas.

## Regra de leitura

Uma camada, um índice ou uma rota não substitui interpretação histórica, participação social, trabalho de campo, avaliação institucional ou decisão de gestão. Ausência de evidência não é convertida em valor zero quando o método não sustenta essa equivalência.

## Natureza das rotas

As rotas e áreas derivadas do Atlas são objetos metodológicos de pesquisa. Mesmo quando partem de uma iniciativa institucional, sua representação no Atlas pertence ao desenho científico do projeto. O aplicativo não certifica rotas e não presume anuência comunitária, autorização de acesso ou disponibilidade turística.

## Proveniência

Cada configuração de camada registra, quando disponível, fonte, origem, estado do dado, nível de validação, licença, limitações e identificador de fonte. O arquivo `atlas_ms_v1.8.0-dev_mapa_fontes_camadas.csv` materializa essa relação na versão corrente.

## Núcleo local e fontes remotas

Na versão web, os conjuntos locais não ficam embutidos no `index.html`. Eles são armazenados em `dados/*.js` e carregados sob demanda. Serviços oficiais, downloads e produtos científicos externos são consultados somente pelas operações que deles necessitam.

Uma captura remota não deve ser confundida com incorporação permanente. Um resultado recalculado na sessão não substitui um snapshot publicado enquanto não for materializado, validado e versionado.

## Malha territorial

A unidade analítica nominal é a célula hexagonal de 250 km². O produto final de uma materialização deve usar uma única malha mestra recortada no limite estadual adotado para aquela execução. Células de borda precisam conservar área nominal, área efetiva em Mato Grosso do Sul, percentual territorial e indicação de borda.

No corte territorial de 10/08/2026, a malha mestra validada contém 1554 células recortadas pelo limite estadual adotado. Produtos de índices somente integram o corte fechado quando usam essa mesma geometria e passam pela validação correspondente.

## Índices territoriais

Os protocolos específicos documentam IPG, PEIC, IATI, IAT, ISA, ICT, IPAE e ICD. A consulta pública prioriza produtos fechados. O recálculo com fontes recentes é uma operação avançada e voluntária.

## Referência PRICI e maturidade

As camadas de maturidade relacionadas ao PRICI são instrumentos internos de preparação e pesquisa. Não representam pontuação, aprovação, certificação ou avaliação emitida pela OEI. A interface de autoavaliação é apoio digital ao trabalho do pesquisador e remete ao Manual oficial para definições e critérios.

## Céu noturno

As camadas de radiância e skyglow são instrumentos de orientação territorial. Radiância observada por satélite e brilho artificial modelado do céu são grandezas distintas. Nenhuma equivale automaticamente a classe de Bortle ou certificação de destino de astroturismo.

## Governança e comunidades

A presença de povos indígenas, comunidades quilombolas, comunidades tradicionais ou conhecimentos coletivos no Atlas não substitui participação, consulta adequada, protocolos comunitários ou demais salvaguardas aplicáveis. Quando o catálogo define `publicacao_status = generalizado`, a aplicação pública deve generalizar a representação e a exportação derivada correspondente.

No pacote público deste release, as localidades pontuais indígenas e quilombolas incorporadas a partir do IBGE são generalizadas a duas casas decimais também nos arquivos redistribuídos localmente, incluindo JS, GeoJSON, GeoPackage, KML e KMZ. A geometria original permanece na fonte primária. Limites territoriais legais oficiais de Terras Indígenas e territórios quilombolas não são deformados por generalização no Atlas, pois isso alteraria a delimitação jurídica. Eles são tratados como geometria pública oficial e exigem atribuição à fonte institucional. Sítios arqueológicos permanecem sob representação pública generalizada.

## Reprodutibilidade

A materialização científica é separada do visor público. Cada corte fechado deve registrar data, fontes efetivamente capturadas, malha, resultados, hashes e versão do código. O mesmo conjunto de `hex_id` e a mesma geometria devem ser usados por toda a família territorial do corte.
