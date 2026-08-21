# JOAJU R29

Corrección puntual del pie de Leaflet en móvil.

La causa era geométrica.

El mapa ya termina por encima del dock inferior. R27 sumaba otra vez la altura del dock al `bottom` de Leaflet y por eso atribución y escala quedaban demasiado arriba.

R29 los coloca a 4 px del borde inferior real del mapa.

No cambia ninguna otra parte de la interfaz.
