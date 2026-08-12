# Protocolo ICT · Capacidade de acolhimento e serviços ao visitante · 250 km²

> **Estado no corte de 10/08/2026** — ICT materializado sobre a malha mestra R5 de 1.554 células. A fórmula operacional congelada usa dados oficiais do Cadastur e mantém restaurantes, cafeterias e bares como camada contextual separada.

A ampliação do Atlas incorpora meios de hospedagem, alimentação formal, atendimento ao turista, saúde, combustível e outros serviços de apoio. Antes de definir pesos para um ICT revisado, o projeto deve verificar cobertura, atualidade, comparabilidade espacial e caráter obrigatório ou opcional de cada cadastro. A ausência de registro nunca é convertida automaticamente em ausência do serviço.

## ICT-01 preservado como histórico metodológico

## Objeto

O ICT sintetiza presença formal registrada no Cadastur em contexto municipal e a distribui para a unidade de análise segundo a interseção município–hexágono.

## Componentes

- hospedagem formal registrada
- serviços Cadastur configurados no Atlas, incluindo agências, guias e transportadoras quando presentes na fonte capturada

## Fórmula

`ICT100 = 100 × (0,50 hospedagem_formal + 0,50 servicos_cadastur)`

Os componentes são normalizados de forma relativa na execução.

## Escala

Os valores de origem são municipais. A ponderação por área de interseção cria **contexto territorial**, não localização exata de cada estabelecimento dentro do hexágono. Por esse desenho, a adequação posicional do ICT é tratada de forma parcial no ICD.

## Limites

O ICT não mede valor patrimonial, capacidade de carga, qualidade do serviço ou conveniência de aumentar o turismo.


## Materialização do corte de 10/08/2026

O produto ICT foi materializado isoladamente sobre as 1.554 células da malha mestra R5.

A fonte operacional é o Ministério do Turismo, por meio do Cadastur. O componente de hospedagem utiliza meios de hospedagem formais registrados. O componente de serviços utiliza agências de turismo, guias de turismo e transportadoras turísticas.

A fórmula congelada no corte é `ICT100 = 100 × (0,50 hospedagem_formal + 0,50 servicos_cadastur)`.

Os valores de origem são municipais e são convertidos em contexto territorial pela ponderação município–hexágono. O ICT não localiza cada estabelecimento dentro da célula e não mede qualidade, capacidade de carga ou conveniência de ampliar o turismo.

Restaurantes, cafeterias e bares permanecem como informação contextual separada e não entram na fórmula congelada deste corte.

A validação técnica do produto é registrada em `docs/VALIDACAO_ICT_250KM2_2026-08-10.json`.
