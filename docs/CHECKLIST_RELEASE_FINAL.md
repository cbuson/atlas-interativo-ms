# Checklist de publicação · JOAJU MS v1.8.0-dev

Corte territorial de referência, 10/08/2026.

## Antes de publicar

1. Confirmar que `dados/precalculados/` contém malha, ficha, oito índices e `snapshot_metadata.json`.
2. Executar `npm run validar-precalculados`.
3. Executar `npm run gerar-catalogos`.
4. Executar `npm run audit-release`.
5. Confirmar que nenhum arquivo do repositório ultrapassa 95 MB.
6. Regenerar `SHA256SUMS.txt` somente depois da última alteração.
7. Publicar a raiz da branch `main` no GitHub Pages.

## Estado esperado

- 1.554 células na malha R5
- oito índices com `closedSnapshotDate = 2026-08-10`
- IPG, PEIC e IATI com nulos somente quando documentados
- IAT, ISA, ICT, IPAE e ICD com cobertura numérica integral
- quatro análises derivadas com produto precalculado
- `snapshot_indices_ficha.js` ausente
- produtos parciais de 09/08/2026 ausentes do runtime
- `rede_hidrica` marcada como captura oficial sob demanda
- `mapa_geomorfologico_ibge` marcada como referência/download oficial

## Artefatos de Release

KML, KMZ, GeoJSON integral e variantes SINGLEFILE podem ser gerados separadamente e anexados a uma GitHub Release. Eles não são necessários no repositório principal.
