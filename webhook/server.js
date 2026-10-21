// Webhook Kiwify -> Meta CAPI + GA4 Measurement Protocol
// npm i express   (Node 18+)
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');

const {
  PORT = 3000,
  KIWIFY_TOKEN,            // token do webhook (Kiwify -> Apps -> Webhooks)
  META_PIXEL_ID,
  META_CAPI_TOKEN,         // Events Manager -> Configuracoes -> API de Conversoes -> gerar token
  META_TEST_CODE,          // opcional: "TEST12345" do Test Events (remova em producao)
  GA4_MEASUREMENT_ID,      // G-XXXXXXX
  GA4_API_SECRET,          // GA4 -> Admin -> Fluxo de dados -> Measurement Protocol
  SITE_URL = 'https://seudominio.com',
} = process.env;

const app = express();
// precisamos do corpo bruto para validar a assinatura
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

const sha256 = (v) => v ? crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex') : undefined;
const onlyDigits = (v) => (v || '').replace(/\D/g, '');

// idempotencia simples (troque por Postgres/Redis/BigQuery em producao)
const DB = 'orders.ndjson';
const seen = new Set(fs.existsSync(DB)
  ? fs.readFileSync(DB, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).key) : []);
const save = (rec) => { seen.add(rec.key); fs.appendFileSync(DB, JSON.stringify(rec) + '\n'); };

function validSignature(req) {
  // Kiwify envia ?signature=<HMAC-SHA1 do corpo usando o token>. Confirme na doc atual.
  const sig = req.query.signature;
  if (!sig || !KIWIFY_TOKEN) return false;
  const calc = crypto.createHmac('sha1', KIWIFY_TOKEN).update(req.rawBody).digest('hex');
  return sig.length === calc.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(calc));
}

async function sendMeta(o) {
  const body = {
    data: [{
      event_name: 'Purchase',
      event_time: o.eventTime,
      event_id: `purchase_${o.orderId}`,
      action_source: 'website',
      event_source_url: SITE_URL,
      user_data: {
        em: [sha256(o.email)].filter(Boolean),
        ph: [sha256(onlyDigits(o.phone))].filter(Boolean),
        fbp: o.fbp || undefined,
        fbc: o.fbc || undefined,
        external_id: o.vid ? [sha256(o.vid)] : undefined,
        country: [sha256('br')],
      },
      custom_data: { value: o.value, currency: o.currency, order_id: o.orderId },
    }],
    ...(META_TEST_CODE ? { test_event_code: META_TEST_CODE } : {}),
  };
  const r = await fetch(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Meta CAPI: ' + JSON.stringify(j));
  return j;
}

async function sendGA4(o) {
  const body = {
    client_id: o.vid || o.orderId,
    events: [{ name: 'purchase', params: {
      transaction_id: o.orderId, value: o.value, currency: o.currency,
      source: o.utm.utm_source, medium: o.utm.utm_medium, campaign: o.utm.utm_campaign,
    } }],
  };
  const r = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`, {
    method: 'POST', body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('GA4 MP: ' + r.status);
}

app.post('/webhook/kiwify', async (req, res) => {
  if (!validSignature(req)) return res.status(401).send('invalid signature');

  const p = req.body;
  const t = p.TrackingParameters || {};
  const [vid, fbp, fbc, gclid] = String(t.sck || '').split('~');   // mesmo formato do script da pagina
  const cents = p.Commissions?.charge_amount ?? p.Commissions?.product_base_price ?? 0;

  const o = {
    orderId: p.order_id,
    status: p.order_status,                 // paid | refunded | chargedback | waiting_payment ...
    event: p.webhook_event_type,            // order_approved | order_refunded | chargeback ...
    email: p.Customer?.email,
    phone: p.Customer?.mobile,
    value: Number(cents) / 100,             // Kiwify envia em centavos - confira no seu payload
    currency: p.Commissions?.currency || 'BRL',
    eventTime: Math.floor(new Date(p.approved_date || Date.now()).getTime() / 1000),
    vid, fbp, fbc, gclid,
    utm: { utm_source: t.utm_source, utm_medium: t.utm_medium, utm_campaign: t.utm_campaign,
           utm_content: t.utm_content, utm_term: t.utm_term, src: t.src },
  };

  // responde rapido; a Kiwify reenvia se demorar/der erro
  res.status(200).send('ok');

  try {
    const key = `${o.orderId}:${o.event || o.status}`;
    if (seen.has(key)) return;               // reenvio duplicado
    save({ key, ...o, receivedAt: new Date().toISOString() });

    if (o.event === 'order_approved' || o.status === 'paid') {
      // so envia se o evento ainda estiver dentro de 7 dias (limite da Meta)
      if (Date.now() / 1000 - o.eventTime < 7 * 86400) {
        await Promise.allSettled([sendMeta(o), sendGA4(o)]).then(rs =>
          rs.forEach(r => r.status === 'rejected' && console.error(r.reason)));
      }
    }
    // reembolso/chargeback: so registra (ja salvo acima) para descontar nos relatorios
  } catch (e) { console.error(e); }
});

app.get('/health', (_q, r) => r.send('up'));
app.listen(PORT, () => console.log('listening', PORT));
