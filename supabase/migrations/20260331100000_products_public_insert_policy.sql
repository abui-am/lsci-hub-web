-- Allow any authenticated marketplace users to create new products.
-- This is required for the public "Add product" flow in marketplace listing forms.

-- products: global catalog — read all authenticated; insert allowed for authenticated users.
DROP POLICY IF EXISTS products_insert_authenticated ON public.products;
CREATE POLICY products_insert_authenticated
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (true);
