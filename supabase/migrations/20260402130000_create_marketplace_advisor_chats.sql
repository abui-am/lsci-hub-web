create table if not exists public.marketplace_advisor_conversations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid null references public.organizations(id) on delete set null,
  title text not null default 'Chat baru',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists public.marketplace_advisor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.marketplace_advisor_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketplace_advisor_conversations_profile_last_message
  on public.marketplace_advisor_conversations(profile_id, last_message_at desc)
  where deleted_at is null;

create index if not exists idx_marketplace_advisor_messages_conversation_created
  on public.marketplace_advisor_messages(conversation_id, created_at asc);

alter table public.marketplace_advisor_conversations enable row level security;
alter table public.marketplace_advisor_messages enable row level security;

create or replace function public.is_platform_superadmin_auth()
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.deleted_at is null
      and p.is_platform_superadmin = true
  );
$$;

create policy marketplace_advisor_conversations_select
  on public.marketplace_advisor_conversations
  for select
  using (
    profile_id = auth.uid() or public.is_platform_superadmin_auth()
  );

create policy marketplace_advisor_conversations_insert
  on public.marketplace_advisor_conversations
  for insert
  with check (
    profile_id = auth.uid() or public.is_platform_superadmin_auth()
  );

create policy marketplace_advisor_conversations_update
  on public.marketplace_advisor_conversations
  for update
  using (
    profile_id = auth.uid() or public.is_platform_superadmin_auth()
  )
  with check (
    profile_id = auth.uid() or public.is_platform_superadmin_auth()
  );

create policy marketplace_advisor_messages_select
  on public.marketplace_advisor_messages
  for select
  using (
    exists (
      select 1
      from public.marketplace_advisor_conversations c
      where c.id = conversation_id
        and c.deleted_at is null
        and (
          c.profile_id = auth.uid()
          or public.is_platform_superadmin_auth()
        )
    )
  );

create policy marketplace_advisor_messages_insert
  on public.marketplace_advisor_messages
  for insert
  with check (
    exists (
      select 1
      from public.marketplace_advisor_conversations c
      where c.id = conversation_id
        and c.deleted_at is null
        and (
          c.profile_id = auth.uid()
          or public.is_platform_superadmin_auth()
        )
    )
  );

create or replace function public.touch_marketplace_advisor_conversation()
returns trigger
language plpgsql
as $$
begin
  update public.marketplace_advisor_conversations
  set
    updated_at = now(),
    last_message_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_marketplace_advisor_conversation
on public.marketplace_advisor_messages;

create trigger trg_touch_marketplace_advisor_conversation
after insert on public.marketplace_advisor_messages
for each row
execute function public.touch_marketplace_advisor_conversation();
