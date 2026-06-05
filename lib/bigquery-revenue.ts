import { BigQuery } from '@google-cloud/bigquery';
import { unstable_cache } from 'next/cache';

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'allugator-main';

let _client: BigQuery | null = null;
function getClient(): BigQuery {
  if (_client) return _client;
  const creds = process.env.GOOGLE_CLOUD_CREDENTIALS_JSON;
  _client = creds
    ? new BigQuery({ projectId: PROJECT_ID, credentials: JSON.parse(creds) })
    : new BigQuery({ projectId: PROJECT_ID });
  return _client;
}

export type RevenueData = {
  faturamento_bruto: number;
  pedidos_brutos: number;
  faturamento_liquido: number;
  pedidos_liquidos: number;
};

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export const getRevenue = unstable_cache(
  async (start: string, end: string): Promise<RevenueData> => {
    const client = getClient();
    const COUPONS = `('SITE5', 'SITE10', 'CROSS10')`;
    const UTM_FILTER = `(utm_source IS NULL OR LOWER(utm_source) IN ('null', 'site', 'crm'))`;

    const sqlBruto = `
      SELECT
        COALESCE(SUM(SAFE_CAST(product_price AS FLOAT64)), 0) AS faturamento,
        COUNT(DISTINCT short_id) AS pedidos
      FROM \`allugator-main.v3_gold_alluoffice.tri_orders__current_state\`
      WHERE coupon_code IN ${COUPONS}
        AND date_doc_request IS NOT NULL
        AND DATE(date_doc_request) BETWEEN DATE(@start) AND DATE(@end)
        AND ${UTM_FILTER}
    `;

    const sqlLiquido = `
      SELECT
        COALESCE(SUM(SAFE_CAST(product_price AS FLOAT64)), 0) AS faturamento,
        COUNT(DISTINCT short_id) AS pedidos
      FROM \`allugator-main.v3_gold_alluoffice.tri_orders__current_state\`
      WHERE coupon_code IN ${COUPONS}
        AND date_doc_approved IS NOT NULL
        AND DATE(date_doc_approved) BETWEEN DATE(@start) AND DATE(@end)
        AND ${UTM_FILTER}
    `;

    const params = { start, end };
    const types = { start: 'STRING', end: 'STRING' };

    const [bRes, lRes] = await Promise.all([
      client.query({ query: sqlBruto, params, types }),
      client.query({ query: sqlLiquido, params, types }),
    ]);

    const b = bRes[0]?.[0] as Record<string, unknown> | undefined;
    const l = lRes[0]?.[0] as Record<string, unknown> | undefined;

    return {
      faturamento_bruto: num(b?.faturamento),
      pedidos_brutos: num(b?.pedidos),
      faturamento_liquido: num(l?.faturamento),
      pedidos_liquidos: num(l?.pedidos),
    };
  },
  ['revenue'],
  { revalidate: 900 },
);
