begin;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

create or replace function private.empresa_logada()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id_empresa
  from public.perfis as p
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function private.empresa_logada() from public;
revoke all on function private.empresa_logada() from anon;
grant execute on function private.empresa_logada() to authenticated;

drop policy if exists "RLS_Empresas" on public.empresas;
create policy "empresas_select_tenant"
on public.empresas for select
to authenticated
using (id = private.empresa_logada());

drop policy if exists "RLS_Perfis" on public.perfis;
create policy "perfis_select_tenant"
on public.perfis for select
to authenticated
using (id_empresa = private.empresa_logada());

create policy "perfis_update_self"
on public.perfis for update
to authenticated
using (id = auth.uid() and id_empresa = private.empresa_logada())
with check (id = auth.uid() and id_empresa = private.empresa_logada());

drop policy if exists "RLS_Clientes" on public.clientes;
create policy "clientes_select_tenant"
on public.clientes for select
to authenticated
using (id_empresa = private.empresa_logada());
create policy "clientes_insert_tenant"
on public.clientes for insert
to authenticated
with check (id_empresa = private.empresa_logada());
create policy "clientes_update_tenant"
on public.clientes for update
to authenticated
using (id_empresa = private.empresa_logada())
with check (id_empresa = private.empresa_logada());
create policy "clientes_delete_tenant"
on public.clientes for delete
to authenticated
using (id_empresa = private.empresa_logada());

drop policy if exists "RLS_Fornecedores" on public.fornecedores;
create policy "fornecedores_select_tenant"
on public.fornecedores for select
to authenticated
using (id_empresa = private.empresa_logada());
create policy "fornecedores_insert_tenant"
on public.fornecedores for insert
to authenticated
with check (id_empresa = private.empresa_logada());
create policy "fornecedores_update_tenant"
on public.fornecedores for update
to authenticated
using (id_empresa = private.empresa_logada())
with check (id_empresa = private.empresa_logada());
create policy "fornecedores_delete_tenant"
on public.fornecedores for delete
to authenticated
using (id_empresa = private.empresa_logada());

drop policy if exists "RLS_PlanoContas" on public.plano_contas;
create policy "plano_contas_select_tenant_or_global"
on public.plano_contas for select
to authenticated
using (id_empresa = private.empresa_logada() or id_empresa is null);
create policy "plano_contas_insert_tenant"
on public.plano_contas for insert
to authenticated
with check (id_empresa = private.empresa_logada());
create policy "plano_contas_update_tenant"
on public.plano_contas for update
to authenticated
using (id_empresa = private.empresa_logada())
with check (id_empresa = private.empresa_logada());
create policy "plano_contas_delete_tenant"
on public.plano_contas for delete
to authenticated
using (id_empresa = private.empresa_logada());

drop policy if exists "RLS_Produtos" on public.produtos;
create policy "produtos_select_tenant_or_global"
on public.produtos for select
to authenticated
using (id_empresa = private.empresa_logada() or id_empresa is null);
create policy "produtos_insert_tenant"
on public.produtos for insert
to authenticated
with check (id_empresa = private.empresa_logada());
create policy "produtos_update_tenant"
on public.produtos for update
to authenticated
using (id_empresa = private.empresa_logada())
with check (id_empresa = private.empresa_logada());
create policy "produtos_delete_tenant"
on public.produtos for delete
to authenticated
using (id_empresa = private.empresa_logada());

drop policy if exists "RLS_Projetos" on public.projetos;
create policy "projetos_select_tenant"
on public.projetos for select
to authenticated
using (id_empresa = private.empresa_logada());
create policy "projetos_insert_tenant"
on public.projetos for insert
to authenticated
with check (id_empresa = private.empresa_logada());
create policy "projetos_update_tenant"
on public.projetos for update
to authenticated
using (id_empresa = private.empresa_logada())
with check (id_empresa = private.empresa_logada());
create policy "projetos_delete_tenant"
on public.projetos for delete
to authenticated
using (id_empresa = private.empresa_logada());

drop policy if exists "RLS_Lancamentos" on public.lancamentos_financeiros;
create policy "lancamentos_select_tenant"
on public.lancamentos_financeiros for select
to authenticated
using (id_empresa = private.empresa_logada());
create policy "lancamentos_insert_tenant"
on public.lancamentos_financeiros for insert
to authenticated
with check (id_empresa = private.empresa_logada());
create policy "lancamentos_update_tenant"
on public.lancamentos_financeiros for update
to authenticated
using (id_empresa = private.empresa_logada())
with check (id_empresa = private.empresa_logada());
create policy "lancamentos_delete_tenant"
on public.lancamentos_financeiros for delete
to authenticated
using (id_empresa = private.empresa_logada());

drop policy if exists "RLS_DespesasFixas" on public.despesas_fixas;
create policy "despesas_fixas_select_tenant"
on public.despesas_fixas for select
to authenticated
using (id_empresa = private.empresa_logada());
create policy "despesas_fixas_insert_tenant"
on public.despesas_fixas for insert
to authenticated
with check (id_empresa = private.empresa_logada());
create policy "despesas_fixas_update_tenant"
on public.despesas_fixas for update
to authenticated
using (id_empresa = private.empresa_logada())
with check (id_empresa = private.empresa_logada());
create policy "despesas_fixas_delete_tenant"
on public.despesas_fixas for delete
to authenticated
using (id_empresa = private.empresa_logada());

create or replace function private.validar_projeto_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.clientes c
    where c.id = new.id_cliente
      and c.id_empresa = new.id_empresa
  ) then
    raise exception 'Cliente não pertence à empresa do projeto'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.validar_lancamento_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id_cliente is not null and not exists (
    select 1 from public.clientes c
    where c.id = new.id_cliente and c.id_empresa = new.id_empresa
  ) then
    raise exception 'Cliente não pertence à empresa do lançamento'
      using errcode = '23514';
  end if;

  if new.id_fornecedor is not null and not exists (
    select 1 from public.fornecedores f
    where f.id = new.id_fornecedor and f.id_empresa = new.id_empresa
  ) then
    raise exception 'Fornecedor não pertence à empresa do lançamento'
      using errcode = '23514';
  end if;

  if new.id_projeto is not null and not exists (
    select 1 from public.projetos p
    where p.id = new.id_projeto and p.id_empresa = new.id_empresa
  ) then
    raise exception 'Projeto não pertence à empresa do lançamento'
      using errcode = '23514';
  end if;

  if new.id_produto is not null and not exists (
    select 1 from public.produtos p
    where p.id = new.id_produto
      and (p.id_empresa = new.id_empresa or p.id_empresa is null)
  ) then
    raise exception 'Produto não está disponível para a empresa do lançamento'
      using errcode = '23514';
  end if;

  if new.id_plano_contas is not null and not exists (
    select 1 from public.plano_contas pc
    where pc.id = new.id_plano_contas
      and (pc.id_empresa = new.id_empresa or pc.id_empresa is null)
  ) then
    raise exception 'Conta não está disponível para a empresa do lançamento'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function private.validar_despesa_fixa_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.plano_contas pc
    where pc.id = new.id_plano_contas
      and (pc.id_empresa = new.id_empresa or pc.id_empresa is null)
  ) then
    raise exception 'Conta não está disponível para a empresa da despesa'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validar_projeto_tenant() from public, anon, authenticated;
revoke all on function private.validar_lancamento_tenant() from public, anon, authenticated;
revoke all on function private.validar_despesa_fixa_tenant() from public, anon, authenticated;

drop trigger if exists trg_validar_projeto_tenant on public.projetos;
create trigger trg_validar_projeto_tenant
before insert or update on public.projetos
for each row execute function private.validar_projeto_tenant();

drop trigger if exists trg_validar_lancamento_tenant on public.lancamentos_financeiros;
create trigger trg_validar_lancamento_tenant
before insert or update on public.lancamentos_financeiros
for each row execute function private.validar_lancamento_tenant();

drop trigger if exists trg_validar_despesa_fixa_tenant on public.despesas_fixas;
create trigger trg_validar_despesa_fixa_tenant
before insert or update on public.despesas_fixas
for each row execute function private.validar_despesa_fixa_tenant();

create index if not exists idx_clientes_empresa
  on public.clientes (id_empresa);
create index if not exists idx_fornecedores_empresa
  on public.fornecedores (id_empresa);
create index if not exists idx_perfis_empresa
  on public.perfis (id_empresa);
create index if not exists idx_plano_contas_empresa
  on public.plano_contas (id_empresa);
create index if not exists idx_produtos_empresa
  on public.produtos (id_empresa);
create index if not exists idx_projetos_empresa
  on public.projetos (id_empresa);
create index if not exists idx_projetos_cliente
  on public.projetos (id_cliente);
create index if not exists idx_lancamentos_empresa_data
  on public.lancamentos_financeiros (id_empresa, data_lancamento desc);
create index if not exists idx_lancamentos_cliente
  on public.lancamentos_financeiros (id_cliente);
create index if not exists idx_lancamentos_fornecedor
  on public.lancamentos_financeiros (id_fornecedor);
create index if not exists idx_lancamentos_projeto
  on public.lancamentos_financeiros (id_projeto);
create index if not exists idx_lancamentos_produto
  on public.lancamentos_financeiros (id_produto);
create index if not exists idx_lancamentos_plano_contas
  on public.lancamentos_financeiros (id_plano_contas);
create index if not exists idx_despesas_fixas_empresa_ativo
  on public.despesas_fixas (id_empresa, ativo);
create index if not exists idx_despesas_fixas_plano_contas
  on public.despesas_fixas (id_plano_contas);

drop function if exists public.empresa_logada();

commit;
