# JOAJU MS · Auditoria R8 · 21/08/2026

## Alterações desta rodada

- removidos os atalhos temáticos horizontais do painel de camadas
- mantidas as categorias temáticas como seções recolhidas que o usuário abre quando desejar
- botão de fechamento do painel preservado no cabeçalho
- padronização dos botões de fechar como X nas principais janelas
- reforço do scroll vertical em modais e em Minha Pesquisa no celular
- Câmara de campo passou a usar acesso direto à câmera por getUserMedia, sem seleção de fotografia na galeria
- fotografia capturada diretamente recebe a faixa inferior de metadados GPS já existente
- vídeo de campo pode ser gravado com MediaRecorder quando suportado pelo navegador
- vídeo é armazenado localmente em IndexedDB em uma store própria e associado ao caderno por metadados
- nenhum sensor, GPS, câmera ou gravação é iniciado automaticamente
- Service Worker atualizado para a revisão R8

## Limites

O suporte efetivo de câmera, gravação de vídeo, altitude, rumo e velocidade depende do dispositivo, navegador, permissões e contexto HTTPS. A faixa de metadados é incorporada à fotografia JPEG. No vídeo, os metadados ficam associados ao registro do caderno, sem afirmar gravação EXIF ou sobreposição permanente no arquivo de vídeo.
