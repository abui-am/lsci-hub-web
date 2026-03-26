-- Allow authenticated users to create their own profiles row if missing (trigger/backfill gap).
-- SECURITY DEFINER reads auth.users only for the current uid.

CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uemail text;
  uname text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = auth.uid();
  uname := COALESCE(
    NULLIF(trim(split_part(uemail, '@', 1)), ''),
    'User'
  );

  INSERT INTO public.profiles (id, name, role, is_platform_superadmin)
  VALUES (auth.uid(), uname, 'member', false)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

COMMENT ON FUNCTION public.ensure_my_profile() IS 'Idempotent: insert profiles row for auth.uid() when missing.';;
