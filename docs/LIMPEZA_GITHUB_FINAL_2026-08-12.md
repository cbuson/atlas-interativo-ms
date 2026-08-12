# Limpeza final para GitHub · JOAJU MS

Data da limpeza, 12/08/2026.

Esta cópia foi criada a partir da auditoria `JOAJU_GITHUB_AUDIT_20260812_0357.zip`.

A primeira limpeza conservadora já havia retirado 40 arquivos de backups, fragmentos e resultados duplicados.

A segunda limpeza retirou 29 itens adicionais e atualizou o runtime para que nenhum deles seja necessário.

## Mudanças estruturais

- removido o preload `dados/precalculados/snapshot_indices_ficha.js`
- removidos os produtos parciais de 09/08/2026 do runtime
- removida a malha histórica de 1.690 células usada apenas como snapshot antigo
- removidos links para pacotes KML, KMZ, GeoJSON e GeoPackage pré-gerados
- removidos scripts de migração e correção já incorporados ao estado atual
- os oito índices agora aparecem explicitamente como corte fechado de 10/08/2026
- `rede_hidrica` deixa de apontar para um arquivo GitHub inexistente e passa a captura oficial sob demanda
- `mapa_geomorfologico_ibge` permanece como referência e download oficial
- catálogos e matriz de licenças foram regenerados a partir do `index.html` atual
- criada configuração de Git com exclusões para artefatos reproduzíveis e snapshots acima do limite normal do GitHub

## Itens removidos nesta segunda etapa
- `dados/precalculados/snapshot_indices_ficha.js`
- `dados/perfil_territorial_fechado_2026_08_09.js`
- `dados/sintese_analitica_territorial_2026_08_09.js`
- `dados/malha_itinerarios_snapshot_2026_08_09.js`
- `docs/INDICES_FECHADOS_2026-08-09.md`
- `docs/MALHA_HEXAGONAL_E_INDICES_2026-08-09.md`
- `docs/SNAPSHOT_ANALITICO_2026-08-09.md`
- `docs/ESTADO_SNAPSHOT_FIRST_PREFINAL_2026-08-10.md`
- `docs/VALIDACAO_FICHA_SNAPSHOT_R2_2026-08-11.json`
- `docs/SEGUNDA_PASSADA_MATERIALIZACAO_2026-08-10.md`
- `docs/AUDITORIA_CORRECOES_2026-08-09.md`
- `docs/PERFORMANCE_FAST_START_2026-08-09.md`
- `docs/MATERIALIZACAO_CAMADAS_MS_2026-08-10.json`
- `Atlas_Interativo_MS_Completo_v1.8.0-dev.kml`
- `Atlas_Interativo_MS_Completo_v1.8.0-dev.kmz`
- `atlas_ms_v1.8.0-dev_nucleo_local.geojson`
- `requirements-indices.txt`
- `LIMPEZA_GITHUB_RELATORIO.txt`
- `scripts/aplicar_patch_r6_vector_first.mjs`
- `scripts/aplicar_patch_segunda_passada.mjs`
- `scripts/consolidar_ficha_snapshot_r2.mjs`
- `scripts/corrigir_ficha_snapshot_r1.mjs`
- `scripts/corrigir_iati_malha_r2.mjs`
- `scripts/corrigir_malha_ms_r5.mjs`
- `scripts/corrigir_peic_helper_r2.mjs`
- `scripts/corrigir_peic_helpers_legenda_r3.mjs`
- `scripts/corrigir_ui_malha_1554.mjs`
- `scripts/instalar_legenda_analitica_r3.mjs`
- `scripts/instalar_legenda_indices_r2.mjs`

## Itens deliberadamente preservados

Foram mantidos os dados científicos, protocolos, validações, snapshots locais úteis, fontes de reprodução e os oito produtos territoriais fechados.

Arquivos grandes abaixo do limite normal de 100 MB foram mantidos quando são camadas reais do Atlas, por exemplo solos, vegetação, limites municipais e skyglow.

## Validação

Após a limpeza

- `scripts/validar_precalculados.mjs` terminou em PASS para 1.554 células
- `scripts/auditar_release.mjs` terminou com 174 PASS, 0 WARN e 0 FAIL
- todos os scripts MJS restantes passaram em `node --check`
- o servidor local respondeu corretamente a `index.html` e `snapshot_metadata.json`
- nenhum arquivo restante ultrapassa 95 MB
