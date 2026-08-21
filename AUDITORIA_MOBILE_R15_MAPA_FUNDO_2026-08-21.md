# JOAJU MS · R15 · correção do seletor de mapa de fundo

A captura real mostrou que o painel expandido nativo de Leaflet continuava interferindo com a interface móvel e podia deslocar ou ocultar visualmente a cabecera.

## Correção

No telefone o controle expandido nativo de Leaflet deixa de ser usado. O botão de camadas permanece no mapa, mas abre um painel próprio de JOAJU anexado ao documento, independente do layout interno de Leaflet.

O painel oferece os seis mapas de fundo já existentes e chama a função original setBaseMap. Nenhum mapa base foi adicionado ou removido.

A cabecera JOAJU e a faixa Pesquisa científica não são escondidas ao abrir o seletor.

O painel fecha após a escolha e pode ser aberto novamente para trocar de mapa.

Desktop permanece com o controle original.
