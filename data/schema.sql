-- BigQuery: dataset sugerido `traqueamento`
-- Tres tabelas de entrada (leads, orders, ad_spend) e uma view que alimenta o Looker Studio.
-- Se comecar no Google Sheets, use as mesmas colunas, uma aba por tabela.

CREATE TABLE IF NOT EXISTS traqueamento.leads (
  lead_id        STRING,      -- id da ferramenta de captacao ou hash do e-mail
  created_at     TIMESTAMP,
  email          STRING,
  phone          STRING,
  vid            STRING,      -- id de visitante gerado por site/captura-utm.js
  utm_source     STRING,
  utm_medium     STRING,
  utm_campaign   STRING,
  utm_content    STRING,
  utm_term       STRING,
  utm_id         STRING,      -- id da campanha (ex.: {{campaign.id}})
  first_utm_source   STRING,
  first_utm_medium   STRING,
  first_utm_campaign STRING,
  fbclid         STRING,
  gclid          STRING,
  landing        STRING
);

CREATE TABLE IF NOT EXISTS traqueamento.orders (
  order_id       STRING,
  event          STRING,      -- order_approved | order_refunded | chargeback ...
  status         STRING,      -- paid | refunded | chargedback | waiting_payment ...
  created_at     TIMESTAMP,
  email          STRING,
  phone          STRING,
  value          NUMERIC,     -- em reais
  currency       STRING,
  vid            STRING,
  utm_source     STRING,
  utm_medium     STRING,
  utm_campaign   STRING,
  utm_content    STRING,
  utm_term       STRING,
  src            STRING
);

CREATE TABLE IF NOT EXISTS traqueamento.ad_spend (
  date           DATE,
  platform       STRING,      -- meta | google
  campaign_id    STRING,
  campaign_name  STRING,
  adset_name     STRING,
  ad_id          STRING,
  ad_name        STRING,
  spend          NUMERIC,
  impressions    INT64,
  clicks         INT64
);

-- Vendas liquidas: ultimo estado de cada pedido; reembolso/chargeback zeram a receita.
CREATE OR REPLACE VIEW traqueamento.v_sales AS
WITH last_state AS (
  SELECT * EXCEPT(rn) FROM (
    SELECT o.*, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at DESC) AS rn
    FROM traqueamento.orders o
  ) WHERE rn = 1
)
SELECT
  order_id, created_at, LOWER(TRIM(email)) AS email, vid,
  utm_source, utm_medium, utm_campaign, utm_content,
  IF(status = 'paid', value, 0) AS net_revenue,
  IF(status = 'paid', 1, 0)     AS is_sale
FROM last_state;

-- Venda herda a origem do lead (por e-mail) quando o pedido chegou sem UTM.
CREATE OR REPLACE VIEW traqueamento.v_attribution AS
SELECT
  s.order_id,
  DATE(s.created_at) AS sale_date,
  COALESCE(NULLIF(s.utm_source,''),   l.utm_source,   'direct')   AS utm_source,
  COALESCE(NULLIF(s.utm_medium,''),   l.utm_medium,   'none')     AS utm_medium,
  COALESCE(NULLIF(s.utm_campaign,''), l.utm_campaign, '(not set)') AS utm_campaign,
  COALESCE(NULLIF(s.utm_content,''),  l.utm_content,  '(not set)') AS utm_content,
  l.utm_id AS campaign_id,
  s.net_revenue, s.is_sale
FROM traqueamento.v_sales s
LEFT JOIN (
  SELECT * EXCEPT(rn) FROM (
    SELECT l.*, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY created_at DESC) AS rn
    FROM traqueamento.leads l
  ) WHERE rn = 1
) l ON l.email = s.email;

-- Tabela diaria por campanha: fonte principal do dashboard.
CREATE OR REPLACE VIEW traqueamento.v_campaign_daily AS
WITH spend AS (
  SELECT date, platform, campaign_id, ANY_VALUE(campaign_name) AS campaign_name,
         SUM(spend) AS spend, SUM(impressions) AS impressions, SUM(clicks) AS clicks
  FROM traqueamento.ad_spend GROUP BY 1,2,3
),
leads AS (
  SELECT DATE(created_at) AS date, utm_id AS campaign_id, COUNT(DISTINCT email) AS leads
  FROM traqueamento.leads GROUP BY 1,2
),
sales AS (
  SELECT sale_date AS date, campaign_id, SUM(is_sale) AS sales, SUM(net_revenue) AS revenue
  FROM traqueamento.v_attribution GROUP BY 1,2
)
SELECT
  COALESCE(sp.date, le.date, sa.date) AS date,
  sp.platform, COALESCE(sp.campaign_id, le.campaign_id, sa.campaign_id) AS campaign_id,
  sp.campaign_name,
  IFNULL(sp.spend,0) AS spend, IFNULL(sp.impressions,0) AS impressions, IFNULL(sp.clicks,0) AS clicks,
  IFNULL(le.leads,0) AS leads, IFNULL(sa.sales,0) AS sales, IFNULL(sa.revenue,0) AS revenue
FROM spend sp
FULL OUTER JOIN leads le ON le.date = sp.date AND le.campaign_id = sp.campaign_id
FULL OUTER JOIN sales sa ON sa.date = COALESCE(sp.date, le.date) AND sa.campaign_id = COALESCE(sp.campaign_id, le.campaign_id);
