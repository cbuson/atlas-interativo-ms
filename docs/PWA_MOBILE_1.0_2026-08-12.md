# JOAJU MS · PWA e experiência móvel · 1.0

## Finalidade

A versão web do JOAJU MS pode ser instalada como Progressive Web App sem criar uma base de código separada para Android ou iOS. O mesmo `index.html` permanece canônico para GitHub Pages e para a aplicação instalada.

## Instalação

O manifesto declara nome, identidade, modo `standalone`, escopo e ícones de 192 e 512 pixels. O ícone maskable de 512 pixels é fornecido para plataformas compatíveis.

Em navegadores Chromium compatíveis, a interface captura o evento de instalação quando disponibilizado e apresenta a ação `Instalar aplicativo`. Em iPhone e iPad, a própria interface orienta o fluxo do Safari `Compartilhar → Adicionar à Tela de Início`.

## Service Worker

`service-worker.js` mantém um cache mínimo da aplicação e usa cache sob demanda para dados locais efetivamente consultados. Navegação prioriza a rede e usa o `index.html` em cache quando a conexão falha.

## Pacote territorial offline

A instalação não baixa automaticamente todo o repositório. A ação `Preparar núcleo offline` é explícita e armazena aproximadamente 50 MB com

- malha territorial R5
- Ficha Territorial
- IPG, PEIC, IATI, IAT, ISA, ICT, IPAE e ICD
- quatro análises derivadas materializadas

Mapas-base, tiles, capturas oficiais remotas e outras camadas externas continuam dependendo de internet. Isso evita transformar a instalação em um download integral de centenas de megabytes.

## Privacidade

A instalação e o cache offline não enviam observações pessoais ao projeto. O módulo Minha Pesquisa permanece sob armazenamento local do navegador e continua separado da base científica validada.

## Experiência móvel

O viewport usa `viewport-fit=cover` e o modo standalone respeita as safe areas do dispositivo. O dock móvel, a documentação, os painéis laterais e a Ficha Universal permanecem disponíveis na aplicação instalada.
