# JOAJU R25 · correção estrutural

Base

R20.

R24 foi descartada porque o patch tinha sido inserido no primeiro texto `</body></html>` encontrado.
Esse texto estava dentro de um template de impressão no JavaScript PRICI.
A inserção colocou um `</script>` real dentro do script PRICI e o navegador passou a mostrar o restante do JavaScript como texto.

Correção R25

1. O patch é inserido antes do ÚLTIMO fechamento real do documento.
2. Fechar Ficha usa `right-collapsed` no desktop.
3. Projeto e autoria reinicia scroll ao abrir.
4. Ajuda usa o mesmo mecanismo.
5. Em mobile Ajuda e Projeto e autoria ficam contidos entre a barra verde e o dock.
6. Nenhum dado científico foi alterado.
7. R21, R22, R23 e R24 não devem ser empilhados sobre esta versão.

Validação

Blocos JavaScript inline reconhecidos 30
Erros de sintaxe 0
Patch R25 fora do script PRICI True
Fragmento PRICI não exposto depois do fechamento True
