# Rastreamento de vendas (Kiwify + site na Hostinger + GTM) — notas da conversa

Data: 2026-10-21

## Contexto
- Produtos digitais vendidos na **Kiwify**; páginas de vendas em domínio próprio, hospedadas na **Hostinger**.
- **GTM já instalado**. Falta verificar conectividade e se o Pixel da Meta está correto.
- Tráfego pago (Meta, Google) + orgânico.

## Princípio
Nenhum pixel de navegador é confiável sozinho. Sistema confiável =
UTMs padronizadas → captura first-party na página → parâmetros repassados ao checkout da Kiwify →
webhook de venda aprovada como fonte da verdade → Meta CAPI + GA4 Measurement Protocol →
reconciliação semanal (gateway vs. base própria vs. plataformas; 10–25% de "não atribuído" é aceitável).

## Arquitetura
```
Anúncio/orgânico → Página (Hostinger): script grava UTMs + fbclid/gclid + _fbp/_fbc + vid
                   e reescreve links "Comprar" com utm_*, src e sck
        → Checkout Kiwify → compra aprovada → webhook
        → Endpoint próprio (tracking/server.js) → Meta CAPI + GA4 MP + base (orders.ndjson)
```
- `sck` = `vid~fbp~fbc~gclid` (curto; se truncar, guardar o resto no backend indexado por `vid`).
- `src` = `utm_source|utm_medium`.
- Webhook Kiwify devolve esses valores em `TrackingParameters`.

## Passos decididos
1. UTMs nos anúncios — Meta: `utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}&utm_id={{campaign.id}}`; Google: auto-tagging + ValueTrack; orgânico: UTM em tudo (bio, e-mail, descrições), links curtos por canal (/ig, /yt, /email).
2. Script de captura first-party no `<head>` da página (cookie 90 dias + localStorage `trk_v1`, preserva first touch, last touch, decora links `kiwify.com`).
3. GTM: PageView, ViewContent, InitiateCheckout (clique em comprar).
4. Webhook Kiwify (Apps → Webhooks): compra aprovada, reembolso, chargeback, PIX/boleto gerado, assinatura.
5. Endpoint: `tracking/server.js` (Node 18+, express). Hospedar em VPS Hostinger, Render, Railway, Fly.io ou Cloud Run (hospedagem compartilhada geralmente não roda Node).
6. Pergunta "Como você nos conheceu?" na página de obrigado para recuperar tráfego direto/dark social.

## Env vars do endpoint
`KIWIFY_TOKEN`, `META_PIXEL_ID`, `META_CAPI_TOKEN`, `GA4_MEASUREMENT_ID`, `GA4_API_SECRET`, `SITE_URL`, (`META_TEST_CODE` só em testes).

## Pontos de atenção
1. **Purchase duplicado:** Pixel no checkout da Kiwify + CAPI têm `event_id` diferentes → receita dobrada. Preferir desligar o Purchase do Pixel no checkout e deixar só o CAPI; ou confirmar "Desduplicado" no Events Manager.
2. **GA4 MP:** só liga à sessão se `client_id` = `_ga` do navegador. Hoje usa `vid`. Para ligar, adicionar `_ga` ao `sck`; senão usar a base própria como fonte da atribuição.
3. Confirmar com payload real: `order_status`, `webhook_event_type`, `Commissions.charge_amount` (centavos), `TrackingParameters`, e o esquema de assinatura (`?signature` HMAC-SHA1) na doc atual da Kiwify.
4. PIX/boleto: aprovação tardia, às vezes em outro dispositivo — `sck`/`fbp` salvo no checkout é o que permite atribuir.
5. Sempre divulgar a URL da própria página, nunca o link direto da Kiwify (perde a origem).
6. LGPD: consentimento, política de privacidade, hash SHA-256 de dados pessoais.

## Roteiro de verificação (pendente)
**Endpoint/webhook:** `/health` responde `up`; "enviar teste" na Kiwify e logar o payload real; reenvio duplicado não duplica; POST sem `signature` → 401.
**Meta:** Events Manager → Testar eventos → `META_TEST_CODE`; compra de teste (R$ 1) deve aparecer como origem Servidor; checar Qualidade de correspondência (em, ph, fbp, fbc) e desduplicação; remover `META_TEST_CODE`.
**GA4:** DebugView / Tempo real mostrando `purchase` com `transaction_id`.
**Página/GTM:** Meta Pixel Helper (um único Pixel ID, sem duplicata GTM + código direto); GTM Preview/Tag Assistant (base do Pixel em All Pages; InitiateCheckout no clique); DevTools Network (`facebook.com/tr`, um PageView por carga); abrir `?utm_source=teste&utm_medium=paid&utm_campaign=x&fbclid=abc` e conferir parâmetros no link da Kiwify e `localStorage.getItem('trk_v1')`; consentimento/Consent Mode.

## Próximos passos
- [ ] Passar a URL da página de vendas (checar GTM/Pixel no HTML).
- [ ] Decidir onde hospedar o endpoint e cadastrar a URL do webhook na Kiwify.
- [ ] Obter um payload real da Kiwify e ajustar o mapeamento de campos.
- [ ] Resolver a duplicidade do Purchase (Pixel do checkout vs. CAPI).
- [ ] Decidir sobre `_ga` no `sck` e sobre a base (planilha/BigQuery) no lugar do `orders.ndjson`.
- [ ] Rodar o roteiro de verificação acima.
