# JOAJU MS · R34 · correção do modal PRICI

Sintoma observado
Ao abrir Autoavaliação PRICI, o overlay escurecia o Atlas, mas a caixa do modal não aparecia.

Correção aplicada
- defesa CSS limitada a #priciSelfAssessmentModal
- caixa PRICI forçada a permanecer visível acima do overlay
- restauração explícita de display, visibility e opacity na abertura
- verificação de que .modal-box permanece filha direta do modal
- ajuste móvel preservando rolagem interna
- nenhuma alteração em camadas, índices, dados, rotas ou cálculos

Verificações estáticas
{'prici_modal_id': 11, 'coverage_title': 2, 'script_open': 34, 'script_close': 32}

Arquivo a substituir
index.html
