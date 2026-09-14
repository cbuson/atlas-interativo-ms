# JOAJU MS — ronda Turismo · 14/09/2026

## Escopo

Esta ronda acrescenta contexto turístico sem alterar os índices PRICI, a malha de 250 km² ou os resultados precalculados do corte analítico.

## 1. Regionalização turística estadual de referência

Nova camada local: `regioes_turisticas_fundtur_ms`.

Fonte institucional consultada: FUNDTUR-MS, página **Perfil MS**, em 14/09/2026. A página apresenta Mato Grosso do Sul organizado em dez regiões turísticas e contempla os 79 municípios do estado.

A geometria foi produzida por dissolução dos limites municipais oficiais já materializados no JOAJU MS. Não foi desenhada manualmente.

Regiões representadas:

- 7 Caminhos da Natureza / Cone Sul
- Bonito – Serra da Bodoquena
- Caminho dos Ipês
- Caminhos da Fronteira
- Costa Leste
- Grande Dourados
- Pantanal
- Rota Norte
- Vale das Águas
- Vale do Aporé

**Ressalva documental:** na captura textual consultada da página Perfil MS, nove composições municipais puderam ser verificadas nominalmente. A composição de Vale do Aporé foi completada pela consistência do conjunto estadual de 79 municípios e pela continuidade documental da regionalização da FUNDTUR; Água Clara, anteriormente associada ao Vale do Aporé em fonte histórica, aparece atualmente em Costa Leste. A composição nominal de Vale do Aporé deve ser confirmada em fonte estadual atualizada antes de uso normativo.

Esta camada **não equivale** à lista vigente de municípios habilitados no **Mapa do Turismo Brasileiro** do Ministério do Turismo. O mapa federal permanece como referência externa dinâmica no Atlas.

## 2. Síntese municipal Cadastur

Nova camada local: `cadastur_resumo_municipal_2026`.

Ela combina somente os snapshots Cadastur já materializados e verificáveis no pacote:

- meios de hospedagem;
- agências de turismo;
- guias de turismo;
- transportadoras turísticas.

A síntese contém 64 municípios com pelo menos um registro em um desses conjuntos. Mantém separadas as contagens por categoria e, quando disponível na captura de hospedagem, a soma de leitos declarados.

A geometria é a sede municipal representativa utilizada pelos snapshots de origem. Não representa a posição individual de estabelecimentos ou profissionais.

A camada mede **registros Cadastur observados**, não a totalidade da atividade turística. Ausência ou baixa contagem não deve ser interpretada como ausência de turismo.

## 3. Restaurantes, cafeterias e bares

A configuração `cadastur_alimentacao` foi atualizada para apontar diretamente para o recurso oficial do **2º trimestre de 2026**, atualizado em 02/07/2026 no catálogo do Ministério do Turismo.

O recurso permanece em modo de captura sob demanda. **Não foi criado snapshot local nesta ronda**, porque o arquivo binário não foi materializado e verificado localmente durante a construção deste corte.

O registro Cadastur para restaurantes, cafeterias, bares e similares é opcional. Mesmo após futura materialização, zero registros não poderá ser interpretado como ausência de oferta de alimentação.

## 4. Efeito sobre o modelo analítico

Nenhuma das duas novas camadas locais entra nos pesos PRICI ou nos oito índices precalculados deste corte. A Rota Bioceânica institucional também permanece separada das 32 propostas de rotas utilizadas nas análises de maturidade/convergência.

Após a integração, `validar-precalculados` continua validando 1.554 hexágonos, identidade geométrica, ficha territorial e SHA256 do corte analítico.
