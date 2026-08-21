import { getSupabase } from './supabaseClient.js';

async function runProductionPersistenceValidation() {
  console.log('================================================================');
  console.log('  TESTE DE PERSISTÊNCIA REAL PARA PRODUÇÃO NO SUPABASE POSTGRES ');
  console.log('================================================================\n');

  const supabase = getSupabase();

  if (!supabase) {
    console.error('ERRO FATAL: Cliente Supabase não pôde ser inicializado.');
    process.exit(1);
  }

  // 1. Criar Empresa: SYNTECH PRODUCAO TESTE
  console.log('1. Inserindo empresa na tabela "companies"...');
  const companyPayload = {
    name: 'SYNTECH PRODUCAO TESTE',
    email: 'producao-teste@syntechdc.com.br',
    phone: '+55 11 97777-0001',
    status: 'active',
  };

  const { data: createdCompany, error: errComp } = await supabase
    .from('companies')
    .insert(companyPayload)
    .select()
    .single();

  if (errComp) {
    console.error('❌ ERRO ao criar empresa:', errComp.message, errComp);
    process.exit(1);
  }

  const companyUuid = createdCompany.id;
  console.log('✅ Empresa criada com sucesso na tabela "companies".');
  console.log('UUID da Empresa (companies.id):', companyUuid);

  // 2. Criar Contato: CLIENTE PRODUCAO TESTE
  console.log('\n2. Inserindo contato na tabela "contacts" vinculado à empresa...');
  const contactPayload = {
    company_id: companyUuid,
    name: 'CLIENTE PRODUCAO TESTE',
    phone: '+55 11 98888-0001',
    company_name: 'SYNTECH PRODUCAO TESTE',
    store: 'MATRIZ PRODUCAO',
    city: 'São Paulo',
    product: 'SYNTECH DISPAROS ENTERPRISE',
    blocked: false,
  };

  const { data: createdContact, error: errContact } = await supabase
    .from('contacts')
    .insert(contactPayload)
    .select()
    .single();

  if (errContact) {
    console.error('❌ ERRO ao criar contato:', errContact.message, errContact);
    process.exit(1);
  }

  const contactUuid = createdContact.id;
  console.log('✅ Contato criado com sucesso na tabela "contacts".');
  console.log('UUID do Contato (contacts.id):', contactUuid);
  console.log('Vinculado ao company_id:', createdContact.company_id);

  // 3. Consultar novamente a Empresa
  console.log('\n3. Consultando novamente a empresa na tabela "companies"...');
  const { data: fetchedCompany, error: errFetchComp } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyUuid)
    .single();

  if (errFetchComp) {
    console.error('❌ ERRO ao consultar empresa:', errFetchComp.message);
  } else {
    console.log('✅ Consulta da Empresa bem-sucedida:');
    console.log(JSON.stringify(fetchedCompany, null, 2));
  }

  // 4. Consultar novamente o Contato
  console.log('\n4. Consultando novamente o contato na tabela "contacts"...');
  const { data: fetchedContact, error: errFetchContact } = await supabase
    .from('contacts')
    .select('*')
    .eq('company_id', companyUuid)
    .eq('id', contactUuid)
    .single();

  if (errFetchContact) {
    console.error('❌ ERRO ao consultar contato:', errFetchContact.message);
  } else {
    console.log('✅ Consulta do Contato bem-sucedida:');
    console.log(JSON.stringify(fetchedContact, null, 2));
  }

  console.log('\n================================================================');
  console.log('NENHUMA EXCLUSÃO EXECUTADA — DADOS PERSISTIDOS PERMANENTEMENTE.');
  console.log('================================================================');
}

runProductionPersistenceValidation();
