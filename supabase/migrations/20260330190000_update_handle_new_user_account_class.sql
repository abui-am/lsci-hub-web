-- Update signup trigger to tag profiles.account_class from auth user metadata.
-- For public supplier/buyer signup we set auth user metadata: account_class = supplier|buyer.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name text;
  meta_account_class text;
  account_class_value public.account_class;
BEGIN
  display_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(split_part(NEW.email, '@', 1), ''),
    'User'
  );

  meta_account_class := lower(coalesce(NEW.raw_user_meta_data->>'account_class', 'internal'));

  account_class_value := CASE meta_account_class
    WHEN 'supplier' THEN 'supplier'::public.account_class
    WHEN 'buyer' THEN 'buyer'::public.account_class
    WHEN 'internal' THEN 'internal'::public.account_class
    ELSE 'internal'::public.account_class
  END;

  INSERT INTO public.profiles (id, name, role, is_platform_superadmin, account_class)
  VALUES (NEW.id, display_name, 'member', false, account_class_value)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
-- Ensure the trigger exists (idempotent if it already does).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
