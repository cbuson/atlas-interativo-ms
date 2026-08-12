# Índices territoriais fechados · corte 10/08/2026

A malha territorial R5 do JOAJU MS contém 1.554 células recortadas pelo limite oficial de Mato Grosso do Sul.

## Produtos

| Índice | Produto | Cobertura |
|---|---|---|
| IPG | `dados/precalculados/ipg_250km2.geojson` | 1.554 células, 57 valores numéricos e 1.497 nulos documentados |
| PEIC | `dados/precalculados/peic_250km2.geojson` | 1.554 células, 82 valores numéricos e 1.472 nulos documentados |
| IATI | `dados/precalculados/iati_250km2.geojson` | 1.554 células, 1.025 valores numéricos e 529 nulos documentados |
| IAT | `dados/precalculados/iat_250km2.geojson` | 1.554 valores numéricos |
| ISA | `dados/precalculados/isa_250km2.geojson` | 1.554 valores numéricos |
| ICT | `dados/precalculados/ict_250km2.geojson` | 1.554 valores numéricos |
| IPAE | `dados/precalculados/ipae_250km2.geojson` | 1.554 valores numéricos |
| ICD | `dados/precalculados/icd_250km2.geojson` | 1.554 valores numéricos |

`null` não significa zero. Nos três índices que admitem nulo, a ausência precisa permanecer acompanhada de justificativa documental.

## Ficha territorial

`dados/precalculados/ficha_territorial_250km2.geojson` reúne os oito índices e o contexto territorial para as 1.554 células.

## Validação

Execute

```bash
npm run validar-precalculados
```

O fechamento exige identidade de `hex_id`, identidade geométrica, regras de cobertura, campos obrigatórios da ficha e SHA256 coerente com `snapshot_metadata.json`.
