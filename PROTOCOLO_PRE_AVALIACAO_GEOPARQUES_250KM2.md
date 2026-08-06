# Protocolo de pré-avaliação geocientífica de possíveis geoparques — 250 km²

Versão 1.6.0 | data de corte 6 de agosto de 2026

## Finalidade

A camada `pre_avaliacao_geocientifica_geoparques_250km2` é uma ferramenta de triagem territorial. Ela identifica hexágonos onde existe maior combinação de diversidade geocientífica documentada, riqueza de geossítios e cavidades, continuidade espacial e contexto de proteção ambiental.

O resultado **não** demonstra que uma área possui patrimônio geológico de valor internacional e não substitui inventário científico, comparação internacional, trabalho de campo, governança, plano de gestão, participação comunitária, visibilidade, educação, financiamento ou procedimento formal perante a UNESCO.

## Unidade espacial

A malha possui hexágonos nominais de 250 km², gerados em projeção Lambert azimutal equivalente centrada aproximadamente em Mato Grosso do Sul. O centroide deve cair dentro de pelo menos um limite municipal oficial. Os hexágonos de borda não são recortados.

## Componentes

### Diversidade de tipos geocientíficos

São reconhecidos cinco tipos documentais: geologia geral e estratigrafia, paleontologia, espeleologia, sedimentologia e geomorfologia/paisagem/formações superficiais.

`T_n = T / 5`

A classificação utiliza somente termos presentes nos atributos dos inventários. Não cria uma nova avaliação científica do valor dos sítios.

### Riqueza geocientífica ajustada

`G = min(n_geossitios, 5) + 0,5 × min(n_cavidades, 5)`

`G_n = log10(G + 1) / log10(G_max + 1)`

A limitação impede que um inventário numeroso domine o índice. As cavidades recebem peso 0,5 porque o CANIE é um cadastro espeleológico e a presença de uma cavidade não equivale automaticamente a uma avaliação individual de geossítio.

### Continuidade geocientífica

Um hexágono é ativo quando contém pelo menos um geossítio ou cavidade.

`C_n = V_a / 6`

`V_a` é o número de hexágonos vizinhos ativos. A divisão por seis preserva a mesma referência para toda a malha, mas pode subestimar continuidades transfronteiriças não representadas pelas bases de MS.

### Contexto de proteção ambiental

`P_n = 1` quando o hexágono intersecta pelo menos uma unidade de conservação do CNUC e `P_n = 0` quando não existe interseção.

Esse componente recebe peso baixo. Unidade de conservação não significa automaticamente proteção específica do patrimônio geológico, acesso, gestão de geoparque ou valor internacional.

## Fórmula

`IPG_100 = 100 × (0,40T_n + 0,30G_n + 0,20C_n + 0,10P_n)`

A diversidade recebe 40%, a riqueza geocientífica 30%, a continuidade 20% e o contexto de proteção 10%.

## Classes

- 0 a menos de 20 — base geocientífica muito baixa
- 20 a menos de 40 — pré-avaliação emergente
- 40 a menos de 60 — pré-avaliação média
- 60 a menos de 80 — pré-avaliação alta
- 80 a 100 — pré-avaliação muito alta

As classes orientam aprofundamento. Nenhuma classe deve ser denominada “geoparque” sem cumprir os requisitos científicos, sociais, administrativos e territoriais aplicáveis.

## Fontes de entrada

- geossítios compilados a partir do Decreto Estadual nº 12.897/2009, GEOSSIT/SGB, SIGEP e fontes técnicas declaradas
- CANIE/CECAV/ICMBio
- CNUC/MMA
- limites municipais oficiais de Mato Grosso do Sul

## Referências metodológicas centrais

Consulte `REFERENCIAS_APA7_COMPLETAS.md` e `atlas_ms_v1.6.0_referencias_apa7.csv`, especialmente UNESCO, Rolim e Theodorovicz, Tavares et al. e o inventário legal estadual.
