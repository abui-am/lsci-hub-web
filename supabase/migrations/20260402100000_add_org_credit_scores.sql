alter table public.organizations
  add column if not exists buyer_credit_score numeric(5,2),
  add column if not exists supplier_credit_score numeric(5,2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_buyer_credit_score_range'
  ) then
    alter table public.organizations
      add constraint organizations_buyer_credit_score_range
      check (
        buyer_credit_score is null
        or (buyer_credit_score >= 0 and buyer_credit_score <= 100)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_supplier_credit_score_range'
  ) then
    alter table public.organizations
      add constraint organizations_supplier_credit_score_range
      check (
        supplier_credit_score is null
        or (supplier_credit_score >= 0 and supplier_credit_score <= 100)
      );
  end if;
end $$;
