# Traqueamento — rastreamento de vendas (Kiwify + Hostinger + GTM + Looker Studio)

Sistema de atribuicao de trafego pago e organico para produtos digitais, com dashboard no Looker Studio.
Contexto, decisoes e pendencias: [docs/NOTAS.md](docs/NOTAS.md).

## Estrutura
```
site/captura-utm.js      script first-party (UTMs, click IDs, vid) para as paginas na Hostinger
webhook/                 endpoint Kiwify -> Meta CAPI + GA4 (Node.js 18+)
  server.js  package.json  .env.example
data/schema.sql          tabelas e views do BigQuery (leads, orders, ad_spend, v_campaign_daily)
dashboard/LOOKER_STUDIO.md  campos calculados e desenho das paginas
docs/NOTAS.md            notas da conversa, pontos de atencao e roteiro de verificacao
```
Os arquivos `index.php`, `principal.css` e `README.md` na raiz sao do exercicio de Git original.

## Fluxo
Anuncio/organico -> pagina (captura-utm.js) -> checkout Kiwify -> webhook (webhook/server.js)
-> Meta CAPI + GA4 + base (BigQuery/Sheets) -> Looker Studio.

## Como rodar o webhook
```
cd webhook
cp .env.example .env     # preencher as variaveis
npm install
node --env-file=.env server.js
```
Publicar em VPS/Render/Railway/Cloud Run e cadastrar `https://<host>/webhook/kiwify` em Kiwify -> Apps -> Webhooks.

## Pendente
- Gravar pedidos no BigQuery/Sheets em vez de `orders.ndjson` (depende da base escolhida).
- Importar o material do "Tráfego pago Desafio 9 Dias" (esta so na maquina local) para ajustar leads, funil e gasto.
- Ver checklist em docs/NOTAS.md.
