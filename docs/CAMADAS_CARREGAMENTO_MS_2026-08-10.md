# Contrato de carregamento das camadas JOAJU MS

Data de revisão, 12/08/2026.

## Regra pública

Uma camada anunciada como snapshot local precisa possuir o arquivo correspondente no pacote.

A ordem normal é

1. snapshot local
2. cache de uma atualização explícita
3. fonte remota quando a camada é apresentada como captura, atualização ou referência

Uma referência externa não deve aparecer como snapshot local inexistente.

## Distribuição GitHub

A distribuição principal omite dois snapshots vetoriais integrais porque ultrapassam o limite normal de arquivo do GitHub.

- `rede_hidrica` usa captura oficial sob demanda
- `mapa_geomorfologico_ibge` usa referência e download oficial

Os dois itens foram removidos de `DATA_MANIFEST`, portanto a interface não tenta carregar arquivos locais inexistentes.

## Índices

Os oito índices territoriais do corte de 10/08/2026 usam `dados/precalculados/` e não dependem desses dois arquivos para a consulta do corte já fechado.

## Materialização completa no computador de trabalho

```powershell
$env:CORTE_DATA="2026-08-10"
npm run preparar-snapshot
```

Esse comando pode recriar snapshots pesados fora da distribuição GitHub.
