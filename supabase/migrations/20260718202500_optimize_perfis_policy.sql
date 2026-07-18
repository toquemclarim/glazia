drop policy if exists "perfis_update_self" on public.perfis;

create policy "perfis_update_self"
on public.perfis for update
to authenticated
using (
  id = (select auth.uid())
  and id_empresa = (select private.empresa_logada())
)
with check (
  id = (select auth.uid())
  and id_empresa = (select private.empresa_logada())
);
