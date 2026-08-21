# JOAJU R26 · controlador de estado móvil

Base usada

R25 estructuralmente válida.

Problemas atacados

- en ventana estrecha la franja científica podía desaparecer por desplazamiento del documento
- Camadas, Rotas, Ficha y Pesquisa usaban transiciones de estado independientes
- Pesquisa podía cerrarse sin restaurar la vista Mapa
- Projeto e autoria no se comportaba igual que Ajuda
- los listeners históricos podían actuar más de una vez sobre el mismo clic

Corrección

- el documento móvil queda fijado a 100dvh y no se desplaza
- barra verde, franja científica y dock inferior son persistentes
- se introduce una sola transición móvil para Mapa, Camadas, Rotas, Ficha y Pesquisa
- Projeto e autoria y Ajuda usan el mismo patrón contenido
- Pesquisa queda limitada entre la cabecera y el dock y su X vuelve a Mapa
- los clics móviles principales se capturan antes de los listeners históricos
- la barra blanca se conserva únicamente como herramienta de la vista Mapa y se restaura al volver
- no se modifica ningún dato científico

No aplicar R26 encima de R24.
Usar R26 sustituyendo index.html y service-worker.js de R25.
