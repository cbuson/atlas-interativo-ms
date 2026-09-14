# JOAJU MS · Rotas rodoviárias R5

Correção funcional do botão Via rodoviária.

- Caminho para os Ervais mantém a geometria histórica e usa uma rede rodoviária local materializada, incluindo Bela Vista–Jardim, Jardim–Nioaque, Jardim–Bonito, Bonito–Miranda, Maracaju–Miranda e MS-164.
- Rota Bioceânica em Mato Grosso do Sul permanece distinta da Rota Bioceânica das Culturas de Fronteira.
- A nova rota Bioceânica em MS usa como geometria base o corredor rodoviário local completo Três Lagoas–Campo Grande–Sidrolândia–Nioaque–Jardim–Porto Murtinho.
- O desenho da via local agora usa Leaflet diretamente e não passa pelo pipeline de camadas temáticas.
- OSRM é apenas fallback quando uma rota não possui via local materializada.
