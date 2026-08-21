# JOAJU R23 · baseline estable

Esta versión parte directamente de R20.

No contiene los parches S1 ni S2.

La prueba física indicó que S1 y S2 no resolvieron el bloqueo. Por eso se descartaron.

La corrección se realiza en la lógica original en lugar de añadir otra capa CSS.

Cambios

- Projeto e autoria, Referências y Metodologia reinician scroll al abrir
- apertura y cierre sincronizan aria-hidden
- cerrar un modal restaura Leaflet y la barra blanca
- pulsar Mapa restaura explícitamente la barra blanca y el tamaño de Leaflet
- la barra blanca observa cambios de estado de los paneles existentes
- no se añade ninguna regla CSS
- no se modifican datos, capas, índices ni metodologías

Aplicar esta versión directamente sobre R20 o sustituir R22 por estos dos archivos.
