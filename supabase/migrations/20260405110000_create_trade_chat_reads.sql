BEGIN;

CREATE TABLE IF NOT EXISTS public.trade_message_reads (
  conversation_id uuid NOT NULL REFERENCES public.trade_conversations (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, profile_id)
);

CREATE INDEX IF NOT EXISTS trade_message_reads_profile_idx
  ON public.trade_message_reads (profile_id, updated_at DESC);

ALTER TABLE public.trade_message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY trade_message_reads_select_own
  ON public.trade_message_reads
  FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR profile_id = auth.uid()
  );

CREATE POLICY trade_message_reads_insert_own
  ON public.trade_message_reads
  FOR INSERT
  WITH CHECK (
    public.is_platform_superadmin()
    OR profile_id = auth.uid()
  );

CREATE POLICY trade_message_reads_update_own
  ON public.trade_message_reads
  FOR UPDATE
  USING (
    public.is_platform_superadmin()
    OR profile_id = auth.uid()
  )
  WITH CHECK (
    public.is_platform_superadmin()
    OR profile_id = auth.uid()
  );

COMMIT;
