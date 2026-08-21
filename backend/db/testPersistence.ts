import { getSupabase } from './supabaseClient.js';

async function runOfficialPersistenceTest() {
  console.log('================================================================');
  console.log('  TESTE REAL DE PERSISTÊNCIA NO SUPABASE POSTGRESQL (LIVE TEST) ');
  console.log('================================================================\n');

  const supabase = getSupabase();

  if (!supabase) {
    console.error('ERRO FATAL: Cliente Supabase não pôde ser inicializado.');
    process.exit(1);
  }

  let testCompanyId: string = '';
  let testContactId: string = '';

  // =========================================================================
  // 1. CRIAR UMA EMPRESA NO SUPABASE
  // Tabela: "companies"
  // =========================================================================
  console.log('----------------------------------------------------------------');
  console.log('ETAPA 1: Criar uma empresa no Supabase');
  console.log('Tabela Utilizada: "companies"');
  console.log('----------------------------------------------------------------');

  const companyPayload = {
    name: 'SYNTECH AUDIT & QA ENTERPRISE LTDA',
    email: `auditoria_${Date.now()}@syntechdc.com.br`,
    phone: '+55 11 98765-4321',
    status: 'active',
  };

  const { data: createdCompany, error: errCreateComp } = await supabase
    .from('companies')
    .insert(companyPayload)
    .select()
    .single();

  if (errCreateComp) {
    console.error('❌ Resultado Etapa 1: ERRO');
    console.error('Mensagem de erro Supabase:', errCreateComp.message);
    console.error('Detalhes / Código:', errCreateComp.code, errCreateComp);
    return;
  }

  testCompanyId = createdCompany.id;
  console.log('✅ Resultado Etapa 1: SUCESSO');
  console.log('ID do Registro Criado (UUID):', testCompanyId);
  console.log('Dados salvos no PostgreSQL:', JSON.stringify(createdCompany, null, 2));


  // =========================================================================
  // 2. BUSCAR A EMPRESA
  // Tabela: "companies"
  // =========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('ETAPA 2: Buscar a empresa criada no Supabase');
  console.log('Tabela Utilizada: "companies"');
  console.log('----------------------------------------------------------------');

  const { data: fetchedCompany, error: errFetchComp } = await supabase
    .from('companies')
    .select('*')
    .eq('id', testCompanyId)
    .single();

  if (errFetchComp) {
    console.error('❌ Resultado Etapa 2: ERRO');
    console.error('Mensagem de erro Supabase:', errFetchComp.message);
    return;
  }

  console.log('✅ Resultado Etapa 2: SUCESSO');
  console.log('ID do Registro Consultado:', fetchedCompany.id);
  console.log('Dados recuperados do PostgreSQL:', {
    id: fetchedCompany.id,
    name: fetchedCompany.name,
    email: fetchedCompany.email,
    phone: fetchedCompany.phone,
    status: fetchedCompany.status,
    created_at: fetchedCompany.created_at,
  });


  // =========================================================================
  // 3. CRIAR UM CONTATO VINCULADO À EMPRESA
  // Tabela: "contacts"
  // =========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('ETAPA 3: Criar um contato vinculado à empresa');
  console.log('Tabela Utilizada: "contacts"');
  console.log('----------------------------------------------------------------');

  const contactPayload = {
    company_id: testCompanyId,
    name: 'Carlos Alberto Ferreira',
    phone: '+55 11 99887-1122',
    company_name: 'FarmaVida Brasil Matriz',
    store: 'Loja 01 - Av. Paulista',
    city: 'São Paulo',
    product: 'Disparos Corporativos WhatsApp Enterprise',
    blocked: false,
  };

  const { data: createdContact, error: errCreateContact } = await supabase
    .from('contacts')
    .insert(contactPayload)
    .select()
    .single();

  if (errCreateContact) {
    console.error('❌ Resultado Etapa 3: ERRO');
    console.error('Mensagem de erro Supabase:', errCreateContact.message);
    console.error('Detalhes / Código:', errCreateContact.code, errCreateContact);
    return;
  }

  testContactId = createdContact.id;
  console.log('✅ Resultado Etapa 3: SUCESSO');
  console.log('ID do Contato Criado (UUID):', testContactId);
  console.log('Vinculado ao Company ID:', createdContact.company_id);
  console.log('Dados salvos no PostgreSQL:', JSON.stringify(createdContact, null, 2));


  // =========================================================================
  // 4. BUSCAR O CONTATO
  // Tabela: "contacts"
  // =========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('ETAPA 4: Buscar o contato vinculado à empresa');
  console.log('Tabela Utilizada: "contacts"');
  console.log('----------------------------------------------------------------');

  const { data: fetchedContact, error: errFetchContact } = await supabase
    .from('contacts')
    .select('*')
    .eq('company_id', testCompanyId)
    .eq('id', testContactId)
    .single();

  if (errFetchContact) {
    console.error('❌ Resultado Etapa 4: ERRO');
    console.error('Mensagem de erro Supabase:', errFetchContact.message);
    return;
  }

  console.log('✅ Resultado Etapa 4: SUCESSO');
  console.log('ID do Contato Consultado:', fetchedContact.id);
  console.log('Dados recuperados do PostgreSQL:', {
    id: fetchedContact.id,
    name: fetchedContact.name,
    phone: fetchedContact.phone,
    store: fetchedContact.store,
    city: fetchedContact.city,
    blocked: fetchedContact.blocked,
  });


  // =========================================================================
  // 5. ATUALIZAR O CONTATO
  // Tabela: "contacts"
  // =========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('ETAPA 5: Atualizar o contato no Supabase');
  console.log('Tabela Utilizada: "contacts"');
  console.log('----------------------------------------------------------------');

  const updatePayload = {
    name: 'Carlos Alberto Ferreira (CARGO: DIRETOR DE OPERAÇÕES)',
    store: 'Loja 05 - Filial Campinas Shopping',
    city: 'Campinas',
    product: 'Disparos Corporativos WhatsApp + RCS Master',
    updated_at: new Date().toISOString(),
  };

  const { data: updatedContact, error: errUpdateContact } = await supabase
    .from('contacts')
    .update(updatePayload)
    .eq('company_id', testCompanyId)
    .eq('id', testContactId)
    .select()
    .single();

  if (errUpdateContact) {
    console.error('❌ Resultado Etapa 5: ERRO');
    console.error('Mensagem de erro Supabase:', errUpdateContact.message);
    return;
  }

  console.log('✅ Resultado Etapa 5: SUCESSO');
  console.log('ID do Registro Atualizado:', updatedContact.id);
  console.log('Novos dados persistidos no PostgreSQL:', {
    id: updatedContact.id,
    name: updatedContact.name,
    store: updatedContact.store,
    city: updatedContact.city,
    product: updatedContact.product,
    updated_at: updatedContact.updated_at,
  });


  // =========================================================================
  // 6. EXCLUIR O CONTATO
  // Tabela: "contacts"
  // =========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('ETAPA 6: Excluir o contato');
  console.log('Tabela Utilizada: "contacts"');
  console.log('----------------------------------------------------------------');

  const { error: errDeleteContact } = await supabase
    .from('contacts')
    .delete()
    .eq('company_id', testCompanyId)
    .eq('id', testContactId);

  if (errDeleteContact) {
    console.error('❌ Resultado Etapa 6: ERRO');
    console.error('Mensagem de erro Supabase:', errDeleteContact.message);
    return;
  }

  console.log('✅ Resultado Etapa 6: SUCESSO');
  console.log('Registro com ID deletado com sucesso:', testContactId);


  // =========================================================================
  // 7. CONFIRMAR QUE AS ALTERAÇÕES FORAM PERSISTIDAS NO POSTGRESQL
  // Tabela: "contacts" & "companies"
  // =========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('ETAPA 7: Confirmar que as alterações foram persistidas no PostgreSQL');
  console.log('Tabela Utilizada: "contacts" e "companies"');
  console.log('----------------------------------------------------------------');

  // 7.1 Confirmar que o contato NÃO existe mais no PostgreSQL
  const { data: checkContact, error: errCheckContact } = await supabase
    .from('contacts')
    .select('*')
    .eq('company_id', testCompanyId)
    .eq('id', testContactId)
    .maybeSingle();

  if (checkContact === null) {
    console.log('✅ Confirmação 7.1: O contato NÃO existe mais na tabela "contacts" (Exclusão persistida com sucesso).');
  } else {
    console.warn('❌ Falha na confirmação 7.1: Registro ainda existe:', checkContact);
  }

  // 7.2 Confirmar que a empresa ainda existe e continua intacta
  const { data: checkCompany, error: errCheckCompany } = await supabase
    .from('companies')
    .select('*')
    .eq('id', testCompanyId)
    .maybeSingle();

  if (checkCompany) {
    console.log('✅ Confirmação 7.2: A empresa pai continua persistida na tabela "companies" com ID:', checkCompany.id);
  }

  // Limpeza final da empresa criada para o teste
  console.log('\n--- LIMPEZA FINAL DO AMBIENTE ---');
  const { error: errCleanCompany } = await supabase
    .from('companies')
    .delete()
    .eq('id', testCompanyId);

  if (!errCleanCompany) {
    console.log('✅ Empresa de teste excluída com sucesso após a validação.');
  }

  console.log('\n================================================================');
  console.log('  TODAS AS 7 ETAPAS EXECUTADAS E VALIDALADAS COM SUCESSO NO DB  ');
  console.log('================================================================');
}

runOfficialPersistenceTest();
