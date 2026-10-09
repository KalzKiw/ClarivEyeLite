-- Applied to ClarivPack (skhyfemtvhczulykiwny) via MCP.
-- Auto-confirm emails on insert so signUp returns a session and bootstrap_business works
-- even if Dashboard "Confirm email" is still enabled.
create or replace function public.auth_users_autoconfirm()
returns trigger
language plpgsql
security definer
set search_path = auth
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_autoconfirm on auth.users;
create trigger on_auth_user_created_autoconfirm
  before insert on auth.users
  for each row
  execute function public.auth_users_autoconfirm();
