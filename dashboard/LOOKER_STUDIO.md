# Dashboard no Looker Studio

## Fonte de dados
Conectar o Looker Studio a `traqueamento.v_campaign_daily` (conector BigQuery) e, para a pagina de qualidade
dos dados, a `traqueamento.v_attribution`. Se a base for Google Sheets, usar as abas equivalentes.

## Campos calculados
| Campo | Formula |
|---|---|
| CPL | `SUM(spend) / SUM(leads)` |
| CAC | `SUM(spend) / SUM(sales)` |
| ROAS | `SUM(revenue) / SUM(spend)` |
| Lucro | `SUM(revenue) - SUM(spend)` |
| Conversao lead -> venda | `SUM(sales) / SUM(leads)` |
| CTR | `SUM(clicks) / SUM(impressions)` |
| CPC | `SUM(spend) / SUM(clicks)` |
| Dia do desafio | `DATE_DIFF(date, DATE '<data-de-inicio>', DAY) + 1` |

Divisoes: proteger contra zero, ex. `CASE WHEN SUM(leads) = 0 THEN NULL ELSE SUM(spend)/SUM(leads) END`.

## Paginas
1. **Visao geral** — cards: investimento, leads, CPL, vendas, receita liquida, CAC, ROAS, lucro. Serie diaria de investimento x receita.
2. **Funil do desafio** — inscricao -> (grupo/aulas, se rastreado) -> carrinho -> checkout -> compra, com a taxa entre etapas.
3. **Campanhas e criativos** — tabela por campanha/anuncio com CPL, CAC, ROAS; ordenar por ROAS; formatacao condicional.
4. **Dia a dia dos 9 dias** — leads e vendas por "Dia do desafio".
5. **Pago x organico** — por `utm_source`/`utm_medium` (v_attribution), incluindo "direct" e "(not set)".
6. **Qualidade dos dados** — vendas na Kiwify x vendas atribuidas x vendas reportadas no Meta; % nao atribuido (alvo < 25%).

## Boas praticas
- Filtro de periodo e de plataforma no topo de todas as paginas.
- Gasto e vendas sempre por **ID** de campanha, nunca por nome.
- Atualizacao de dados em cache: 15 min a 1 h.
- Compartilhar o dashboard so por link com permissao de visualizacao.
