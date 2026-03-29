BEGIN;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_verified_business boolean
  GENERATED ALWAYS AS (verification_status = 'verified') STORED;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS completed_deals_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.demand_listings
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS rfq_expires_at timestamptz;

CREATE OR REPLACE VIEW public.rfq_supplier_intelligence_v1 AS
WITH competition AS (
  SELECT
    r.demand_listing_id,
    count(*)::integer AS quotes_count
  FROM public.rfq_responses r
  GROUP BY r.demand_listing_id
),
market_price AS (
  SELECT
    s.product_id,
    avg(s.price_estimate)::numeric AS avg_market_price
  FROM public.supply_listings s
  WHERE s.deleted_at IS NULL
    AND s.price_estimate IS NOT NULL
  GROUP BY s.product_id
),
suggested AS (
  SELECT
    m.demand_listing_id,
    bool_or(m.status = 'suggested') AS has_suggested_match
  FROM public.matches m
  WHERE m.deleted_at IS NULL
  GROUP BY m.demand_listing_id
)
SELECT
  d.id AS demand_listing_id,
  coalesce(c.quotes_count, 0) AS quotes_count,
  CASE
    WHEN d.required_quantity IS NULL THEN NULL
    ELSE d.required_quantity * coalesce(
      (d.price_range_from + d.price_range_to) / 2,
      d.price_range_to,
      d.price_range_from,
      mp.avg_market_price,
      0
    )
  END AS estimated_deal_value,
  CASE
    WHEN mp.avg_market_price IS NULL OR mp.avg_market_price = 0 THEN NULL
    ELSE (
      (
        coalesce(
          (d.price_range_from + d.price_range_to) / 2,
          d.price_range_to,
          d.price_range_from,
          mp.avg_market_price
        ) - mp.avg_market_price
      ) / mp.avg_market_price
    ) * 100
  END AS market_gap_percent,
  greatest(
    1,
    least(
      99,
      round(
        (
          45
          + (coalesce(o.buyer_credit_score, 95) - 50) * 0.35
          - coalesce(c.quotes_count, 0) * 2.5
          + CASE
              WHEN coalesce(sg.has_suggested_match, false) THEN 10
              ELSE 0
            END
          + CASE
              WHEN coalesce(d.rfq_expires_at, d.required_by::timestamptz) <= now() + interval '12 hours' THEN 6
              WHEN coalesce(d.rfq_expires_at, d.required_by::timestamptz) <= now() + interval '2 days' THEN 3
              ELSE 0
            END
          + coalesce(
              CASE
                WHEN mp.avg_market_price IS NULL OR mp.avg_market_price = 0 THEN 0
                ELSE (
                  (
                    coalesce(
                      (d.price_range_from + d.price_range_to) / 2,
                      d.price_range_to,
                      d.price_range_from,
                      mp.avg_market_price
                    ) - mp.avg_market_price
                  ) / mp.avg_market_price
                ) * 15
              END,
              0
            )
        )::numeric,
        0
      )::integer
    )
  ) AS win_probability
FROM public.demand_listings d
LEFT JOIN public.organizations o
  ON o.id = d.organization_id
LEFT JOIN competition c
  ON c.demand_listing_id = d.id
LEFT JOIN market_price mp
  ON mp.product_id = d.product_id
LEFT JOIN suggested sg
  ON sg.demand_listing_id = d.id
WHERE d.deleted_at IS NULL;

COMMENT ON VIEW public.rfq_supplier_intelligence_v1 IS
  'Supplier-side RFQ intelligence aggregate: competition, estimated value, market gap, and heuristic win probability.';

COMMIT;
