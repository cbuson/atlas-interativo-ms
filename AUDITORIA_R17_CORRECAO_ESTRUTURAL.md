# JOAJU MS R17

Correção estrutural da regressão introduzida na R16.

A regra R16 foi inserida antes de todas as ocorrências textuais de fechamento do documento. Duas dessas ocorrências pertenciam a documentos HTML construídos dentro de JavaScript para impressão. Como o bloco inserido continha uma tag de fechamento de script, o parser do navegador encerrava o script principal prematuramente e o restante do JavaScript aparecia como texto na página.

A R17 remove as três inserções R16 e recoloca uma única cópia no fechamento real do documento principal.

Não foram alterados dados científicos, camadas, índices, rotas, fontes ou metodologias.

Validação estática realizada em todos os blocos JavaScript inline após a correção.
