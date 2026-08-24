# JOAJU MS · R37 · Auditoria de Fontes e Rastreabilidade

## Objetivo

Esta rodada não adiciona índices, mapas ou cálculos territoriais.

O objetivo é corrigir a leitura documental do módulo PRICI e separar claramente

- proveniência da síntese produzida pelo projeto
- fonte documental que sustenta uma afirmação
- URL consultável
- estado de validação
- alcance probatório da fonte
- identificadores de rastreabilidade

## Referência oficial PRICI

A identificação bibliográfica incorporada ao módulo foi atualizada para o título oficial publicado pela OEI em 2026

Manual de rutas e itinerarios culturales para Iberoamérica e indicadores asociados: avanzando hacia la creación de un modelo de rutas e itinerarios culturales para Iberoamérica

A interface pode continuar utilizando a forma curta em áreas de pouco espaço.

A página institucional da OEI identifica o trabalho como publicação de 2026 e informa colaboração entre OEI e AECID, com apoio do Instituto Europeu de Itinerários Culturais.

## Alteração principal na ficha de evidência

Antes

Fonte
Elaboração própria do projeto Atlas Interativo MS

Bases documentais
texto agregado

Depois

Proveniência da síntese
Elaboração própria do projeto

Fonte principal associada à síntese
link quando registrado

Fontes documentais associadas
cada fonte apresentada separadamente e com URL clicável quando disponível

Validações
documental
espacial
institucional
de campo
comunitária

Rastreabilidade
Trace ID
Trace ID de governança
data de captura

## Regra de alcance probatório

A interface passa a declarar explicitamente que uma fonte patrimonial ou territorial pode sustentar a existência de um bem, prática, lugar, antecedente ou relação temática.

Ela não prova automaticamente

- participação comunitária
- consentimento
- governança
- viabilidade logística
- validação de campo
- reconhecimento institucional
- certificação PRICI

## Auditoria estática das 32 propostas

{
  "rotas": 32,
  "fonte_url_ausente": 24,
  "sem_url_documental": 1,
  "alinhamento_texto_url_revisar": 19,
  "source_ids_unicos": 1
}

Observações

- 24 de 32 propostas não possuem `fonte_url` principal. Isso não é tratado como erro porque a maioria registra `fonte` como proveniência da síntese e possui URLs documentais específicas.
- 31 de 32 propostas possuem ao menos uma URL documental.
- uma proposta permanece sem URL documental e deve ser revisada manualmente.
- o campo `source_id` é igual nas 32 propostas. Nesta rodada ele é interpretado como identificador da fonte/dataset materializado e não como identificador único de cada documento.
- o CSV anexo permite revisar rota por rota.

## PRICI e os 63 critérios

R37 não declara que a redação operacional A01–A63 seja transcrição literal do Manual.

A própria interface conserva a separação entre

- questionário e estrutura de referência do Manual
- rótulos operacionais usados pelo Atlas
- apoio digital independente

A confrontação textual item a item com o PDF oficial deve ser tratada como auditoria editorial separada antes de qualquer afirmação de reprodução literal.

## Integridade técnica

JavaScript inline válido
True

Blocos JavaScript verificados
32

Auditores do projeto
[
  {
    "command": "node scripts/validar_precalculados.mjs",
    "returncode": 0
  },
  {
    "command": "node scripts/auditar_fichas.mjs",
    "returncode": 0
  },
  {
    "command": "node scripts/auditar_estatisticas.mjs",
    "returncode": 0
  },
  {
    "command": "node scripts/auditar_release.mjs",
    "returncode": 0
  }
]

Resultado global
PASS

## Arquivo a substituir

index.html

O CSV de auditoria é documentação de trabalho e não precisa ser publicado no site para que a correção funcione.
