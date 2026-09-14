# JOAJU MS · Auditoria e reconstrução limpa das rotas · R7

Data de corte 25/08/2026

## Diagnóstico confirmado

A rota Caminho para os Ervais tinha dois tipos de geometria misturados no mesmo objeto.

Os quatro primeiros segmentos correspondiam ao esquema histórico primitivo.

Segmentos rodoviários detalhados haviam sido acrescentados posteriormente à própria geometria base. Isso produzia linhas marrons adicionais e fazia parecer que a reconstrução histórica tinha sido substituída.

## Correção do Caminho para os Ervais

A geometria base voltou a conter somente os quatro segmentos do esquema histórico primitivo.

Nenhum desses quatro segmentos foi redesenhado.

A rede viária contemporânea permanece em `properties.via_rodoviaria_local` como objeto separado.

A rede complementar materializada contém os eixos aprovados

- Bela Vista – Jardim
- Jardim – Nioaque
- Jardim – Bonito
- Bonito – Miranda
- Maracaju – Miranda
- MS-164 como eixo complementar

A regra passa a ser permanente

rota histórica original + rede rodoviária contemporânea complementar

## Rota Bioceânica em Mato Grosso do Sul

`ROTA-EST-033` permanece independente da `Rota Bioceânica das Culturas de Fronteira`.

A geometria base da Rota Bioceânica em MS foi igualada à geometria rodoviária local materializada. Assim desaparece qualquer possibilidade de linha esquemática entre sedes.

Trechos de referência

- Três Lagoas – Campo Grande
- Campo Grande – Sidrolândia
- Sidrolândia – Nioaque
- Nioaque – Jardim
- Jardim – Porto Murtinho

A camada utiliza o snapshot rodoviário local do Atlas. Não depende de OSRM para sua representação básica.

## Cache

Mantida a correção R6 e alterado o identificador da camada para `20260825-r7-rotas`.

O service worker também recebeu nova versão para impedir reaproveitamento do conjunto anterior.

## Arquivos alterados

- index.html
- service-worker.js
- dados/rotas_culturais_propostas.js

## Teste visual obrigatório

1. Caminho para os Ervais sem Via rodoviária
   Deve mostrar somente o esquema histórico primitivo

2. Caminho para os Ervais com Via rodoviária
   Deve acrescentar a rede contemporânea sem apagar o histórico

3. Rota Bioceânica em Mato Grosso do Sul
   Deve seguir a geometria rodoviária materializada de Três Lagoas a Porto Murtinho

4. Rota Bioceânica das Culturas de Fronteira
   Deve continuar sendo outro objeto e não deve ser fundida com a rota institucional
