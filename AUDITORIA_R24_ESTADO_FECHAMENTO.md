# JOAJU R24 · correção de estado e fechamento

Base usada

R20, que preserva o desenho aprovado.

R21, R22 e R23 não são necessários para aplicar este patch.

Falhas corrigidas

1. Fechar Ficha no desktop
A X anterior apenas removia a classe `open`.
No desktop a Ficha é controlada por `#app.right-collapsed`.
Agora a X usa o estado correto em cada modo.

2. Projeto e autoria
A janela passa a reiniciar scroll em cada abertura.
No celular fica contida entre a barra verde e o dock inferior.
A X permanece acessível.

3. Ajuda
Recebe a mesma política estável de abertura, fechamento e scroll.

4. Restauração do mapa
Ao fechar um modal ou a Ficha é executada uma reparação controlada do tamanho do Leaflet.

5. Design
Não foram alteradas a barra verde, a barra branca de ferramentas, a navegação inferior, a legenda ou o seletor de mapas de fundo.

6. Ciência
Nenhum dado, camada, índice, metodologia ou fonte foi alterado.
