# Protocolo IPG territorial · Fase 3.2

## Objeto

O IPG representa potencial geocientífico territorial **documentado** na unidade analítica de 250 km². Não mede viabilidade, governança, reconhecimento UNESCO ou qualidade turística.

## Fórmula

`IPG100 = 100 × (0,40 Dn + 0,35 Qn + 0,25 Cn)`

Os componentes normalizados Dn, Qn e Cn são os componentes materializados pelo produto da Fase 3.2 incorporado ao Atlas. Este protocolo não redefine seus valores nem imputa evidência em células sem documentação.

## Regra de ausência

Células sem evidência geocientífica suficiente permanecem sem valor documentado. Ausência não é tratada como zero de potencial.

## Geometria

No corte fechado, o IPG deve ser alinhado à mesma malha mestra dos demais índices. O valor histórico pode ser preservado como atributo, mas a geometria publicada do corte deve ser a geometria validada da malha mestra.

## Interpretação

O IPG é um instrumento de priorização documental para aprofundamento científico. Qualquer uso aplicado requer leitura conjunta das fontes primárias e validação de campo quando pertinente.


## Rematerialização na malha R5

No corte territorial de 10/08/2026, o IPG foi recalculado diretamente a partir dos 124 registros do inventário geocientífico da Fase 3.2 sobre a malha mestra R5 de 1.554 células.

Antes da rematerialização, o algoritmo foi submetido a um autoteste contra o produto legado de 1.690 células. O teste reproduziu exatamente, para todas as células, os campos centrais `n_temas`, `n_complexos`, `n_unidades`, `diversidade_Dn`, `riqueza_Q`, `riqueza_Qn`, `vizinhos_ativos`, `continuidade_Cn`, `ipg_100`, `classe_ipg` e `nucleo_territorial_candidato`.

A diversidade Dn usa 60% da riqueza temática normalizada e 40% da diversidade de Simpson normalizada. Dentro de cada complexo, cada tema recebe o maior peso documental observado para esse tema. A riqueza Q usa, por complexo, o maior peso documental acrescido de 20% dos pesos adicionais, com teto de 1,5 por complexo. Qn é normalizado por `log1p` com o Qmax do próprio corte. Cn corresponde ao número de vizinhos ativos dividido por seis.

Na malha R5, 122 dos 124 registros intersectam a geometria oficial recortada de Mato Grosso do Sul. Os registros `MS-GEO-1B-025` e `MS-GEO-1B-027` não intersectam a geometria R5 no ponto documental disponível e permanecem explicitamente sem associação. Eles não são deslocados artificialmente para a célula mais próxima.

O produto resultante contém 1.554 células, 57 com evidência geocientífica documentada e 1.497 com `ipg_100 = null`. Ausência de evidência continua sem ser convertida em zero.
