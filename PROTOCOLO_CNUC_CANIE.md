# Protocolo de integração CNUC e CANIE

## Natureza

As camadas CNUC e CANIE são fontes oficiais externas incorporadas ao atlas como serviços dinâmicos de pesquisa. Não fazem parte do núcleo espacial congelado e não são contabilizadas no índice estável de disponibilidade documental.

## CNUC

O atlas consulta o WFS oficial do ICMBio na INDE, identifica a camada temática por metadados e solicita apenas feições relacionadas ao envelope de Mato Grosso do Sul. Se o serviço oficial não responder, tenta o espelho institucional PAMGIA. O pesquisador pode também importar manualmente o ZIP oficial do CNUC.

A presença ou interseção de uma proposta de rota com uma unidade de conservação não significa autorização de visitação, compatibilidade com o plano de manejo, concordância do órgão gestor ou viabilidade ambiental.

## CANIE

O atlas consulta o WFS oficial do ICMBio/CECAV e recorta os registros de Mato Grosso do Sul. Em contingência, pode utilizar um serviço ArcGIS que reproduz a compilação institucional. A importação manual do arquivo oficial também permanece disponível.

O CANIE reúne cavidades cadastradas e não representa todo o universo de cavernas existentes. Coordenadas e atributos podem ter diferentes níveis de validação. O uso não substitui trabalho de campo, parecer técnico, autorização de entrada ou avaliação de sensibilidade arqueológica e paleontológica.

## Produtos derivados

1. **Interações entre rotas e unidades de conservação** — identifica um ponto representativo de contato geométrico entre o traçado esquemático de uma rota e um polígono CNUC.
2. **Cavidades próximas às rotas** — associa cada cavidade à rota esquemática mais próxima quando a distância calculada é igual ou inferior a 50 km.
3. **Cavidades em unidades de conservação** — realiza teste ponto-em-polígono entre CANIE e CNUC.

Todos os resultados são exploratórios, calculados na sessão, revisáveis e exportáveis. Não constituem rotas oficiais, destinos de visitação, autorização de acesso, parecer ambiental ou decisão de gestão.

## Reprodutibilidade

Cada feição capturada recebe fonte, método de captura, identificador da camada WFS quando disponível, data e aviso metodológico. Falhas de CORS ou indisponibilidade externa não alteram o núcleo local do atlas.
