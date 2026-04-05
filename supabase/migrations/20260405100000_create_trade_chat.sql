BEGIN;

CREATE TABLE IF NOT EXISTS public.trade_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_listing_id uuid REFERENCES public.demand_listings (id) ON DELETE CASCADE,
  offer_request_id uuid REFERENCES public.offer_requests (id) ON DELETE CASCADE,
  buyer_organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  supplier_organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trade_conversations_context_check CHECK (
    ((demand_listing_id IS NOT NULL)::int + (offer_request_id IS NOT NULL)::int) = 1
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS trade_conversations_rfq_unique
  ON public.trade_conversations (demand_listing_id, supplier_organization_id)
  WHERE demand_listing_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS trade_conversations_offer_unique
  ON public.trade_conversations (offer_request_id)
  WHERE offer_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS trade_conversations_parties_idx
  ON public.trade_conversations (buyer_organization_id, supplier_organization_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.trade_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.trade_conversations (id) ON DELETE CASCADE,
  sender_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trade_messages_conversation_idx
  ON public.trade_messages (conversation_id, created_at);

CREATE OR REPLACE FUNCTION public.touch_trade_conversation_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.trade_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trade_messages_touch_conversation_updated_at ON public.trade_messages;
CREATE TRIGGER trade_messages_touch_conversation_updated_at
  AFTER INSERT ON public.trade_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_trade_conversation_updated_at();

ALTER TABLE public.trade_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY trade_conversations_select_participants
  ON public.trade_conversations
  FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR buyer_organization_id = (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
    )
    OR supplier_organization_id = (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY trade_conversations_insert_participants
  ON public.trade_conversations
  FOR INSERT
  WITH CHECK (
    public.is_platform_superadmin()
    OR buyer_organization_id = (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
    )
    OR supplier_organization_id = (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY trade_messages_select_participants
  ON public.trade_messages
  FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR EXISTS (
      SELECT 1
      FROM public.trade_conversations c
      JOIN public.profiles p ON p.id = auth.uid() AND p.deleted_at IS NULL
      WHERE c.id = trade_messages.conversation_id
        AND (c.buyer_organization_id = p.organization_id OR c.supplier_organization_id = p.organization_id)
    )
  );

CREATE POLICY trade_messages_insert_participants
  ON public.trade_messages
  FOR INSERT
  WITH CHECK (
    sender_profile_id = auth.uid()
    AND (
      public.is_platform_superadmin()
      OR EXISTS (
        SELECT 1
        FROM public.trade_conversations c
        JOIN public.profiles p ON p.id = auth.uid() AND p.deleted_at IS NULL
        WHERE c.id = trade_messages.conversation_id
          AND (c.buyer_organization_id = p.organization_id OR c.supplier_organization_id = p.organization_id)
      )
    )
  );

COMMIT;
