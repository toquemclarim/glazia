import { createClient } from '@supabase/supabase-js';

process.loadEnvFile?.('.env');

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value;
};

async function main() {
  const supabase = createClient(
    required('SUPABASE_URL'),
    required('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const email = required('BOOTSTRAP_EMAIL').toLowerCase();
  const password = required('BOOTSTRAP_PASSWORD');
  const empresaNome = required('BOOTSTRAP_EMPRESA_NOME');

  const { data: usersPage, error: usersError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;

  let user = usersPage.users.find((item) => item.email === email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome_completo: 'Administrador Glazia' },
    });
    if (error) throw error;
    user = data.user;
  }

  const { data: perfilExistente, error: perfilError } = await supabase
    .from('perfis')
    .select('id_empresa')
    .eq('id', user.id)
    .maybeSingle();
  if (perfilError) throw perfilError;

  if (perfilExistente) {
    console.log(
      `Usuário ${email} já está vinculado à empresa ${perfilExistente.id_empresa}.`,
    );
    return;
  }

  const { data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .insert({ nome_fantasia: empresaNome, plano: 'BETA' })
    .select('id')
    .single();
  if (empresaError) throw empresaError;

  const empresaId = empresa.id as string;

  const { error: insertPerfilError } = await supabase.from('perfis').insert({
    id: user.id,
    id_empresa: empresaId,
    nome_completo: 'Administrador Glazia',
    cargo: 'ADMIN',
  });
  if (insertPerfilError) throw insertPerfilError;

  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .insert({
      id_empresa: empresaId,
      nome: 'Cliente demonstração',
    })
    .select('id')
    .single();
  if (clienteError) throw clienteError;

  const { error: catalogosError } = await supabase.from('produtos').insert([
    {
      id_empresa: empresaId,
      nome_produto: 'Box',
      linha_produto: 'L. SUPREMA',
      tipo_item: 'PRODUTO FINAL',
    },
    {
      id_empresa: empresaId,
      nome_produto: 'Sacada',
      linha_produto: 'L. GOLD',
      tipo_item: 'PRODUTO FINAL',
    },
    {
      id_empresa: empresaId,
      nome_produto: 'Janela',
      linha_produto: 'L. Slick',
      tipo_item: 'PRODUTO FINAL',
    },
    {
      id_empresa: empresaId,
      nome_produto: 'Portão',
      linha_produto: 'L. SUPREMA',
      tipo_item: 'PRODUTO FINAL',
    },
  ]);
  if (catalogosError) throw catalogosError;

  const { error: contasError } = await supabase.from('plano_contas').insert([
    {
      id_empresa: empresaId,
      tipo_conta: 'RECEITA',
      categoria: 'Vendas',
      subcategoria: 'Projetos',
    },
    {
      id_empresa: empresaId,
      tipo_conta: 'CUSTO',
      categoria: 'Materiais',
      subcategoria: 'Insumos',
    },
    {
      id_empresa: empresaId,
      tipo_conta: 'DESPESA FIXA',
      categoria: 'Operacional',
      subcategoria: 'Estrutura',
    },
  ]);
  if (contasError) throw contasError;

  const { error: projetoError } = await supabase.from('projetos').insert({
    id_empresa: empresaId,
    id_cliente: cliente.id,
    nome_obra: 'Obra demonstração',
    status: 'ANDAMENTO',
  });
  if (projetoError) throw projetoError;

  console.log(`Empresa criada: ${empresaNome} (${empresaId})`);
  console.log(`Login criado: ${email}`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Falha no bootstrap: ${message}`);
  process.exitCode = 1;
});
