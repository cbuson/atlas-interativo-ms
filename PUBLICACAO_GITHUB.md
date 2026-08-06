# Publicação no GitHub Pages

## Repositório recomendado

`cbuson/atlas-interativo-ms`

Endereço esperado da aplicação

`https://cbuson.github.io/atlas-interativo-ms/`

## Publicação pela interface do GitHub

1. Crie um repositório público chamado `atlas-interativo-ms`.
2. Extraia este ZIP.
3. Envie **o conteúdo da pasta**, mantendo `index.html` na raiz.
4. Confirme que a pasta `.github/workflows` e os arquivos ocultos também foram enviados.
5. Abra `Settings`, depois `Pages`.
6. Em `Build and deployment`, selecione `GitHub Actions`.
7. Abra a aba `Actions` e acompanhe o fluxo `Publicar Atlas no GitHub Pages`.
8. Ao terminar, acesse `https://cbuson.github.io/atlas-interativo-ms/`.

## Publicação com Git na linha de comando

```bash
git init
git branch -M main
git add .
git commit -m "Publica Atlas Interativo MS v1.7.0"
git remote add origin https://github.com/cbuson/atlas-interativo-ms.git
git push -u origin main
```

## Configuração opcional do Google Maps

A aplicação principal não precisa de chave Google. A vista opcional da API do
Google Maps utiliza `config.js`. Nunca publique uma chave sem restrições.
Restrinja a chave ao domínio do GitHub Pages e somente à Maps JavaScript API.

## Versões e Zenodo

Depois de confirmar o funcionamento online

1. Conecte o repositório ao Zenodo.
2. Crie a tag `v1.7.0`.
3. Publique uma GitHub Release com essa tag.
4. Use o ZIP científico congelado como ativo adicional da release, quando desejado.
5. Zenodo arquivará a release e atribuirá o DOI da versão.

Não altere a tag `v1.7.0` depois de publicada. Mudanças futuras devem gerar uma
nova versão semântica, por exemplo `v1.0.1` ou `v1.7.0`.
