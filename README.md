# SYNTECH DC — Disparos Corporativos

> **Plataforma SaaS Multi-Tenant corporativa de alta performance para gestão de contatos, automações e disparo de mensagens corporativas.**

---

## 🏛️ Visão Geral da Arquitetura

O **SYNTECH DC** foi projetado seguindo as melhores práticas de engenharia de software full-stack, com isolamento multi-tenant rigoroso por `company_id`, arquitetura modular, abstração de provedores de mensageria oficial (Meta WhatsApp Cloud API) e duas áreas totalmente segregadas:

1. **PORTAL DO CLIENTE (Tenant)**: Gestão de listas, segmentações, variáveis dinâmicas (`{nome}`, `{empresa}`, `{loja}`, `{cidade}`, `{produto}`), campanhas com agendamento inteligente, relatórios analíticos de entrega e taxas de leitura, gestão de assinaturas e suporte via helpdesk.
2. **PAINEL ADMINISTRATIVO INTERNO (SYNTECH DC Core)**: Centro de comando de infraestrutura com monitoramento de MRR, governança de empresas (clientes), gestão de planos e cotas, fila global de disparos, auditoria em tempo real e controle de tickets com SLA.

---

## 📂 Estrutura do Projeto

```
├── /backend
│   ├── /db                     # Conexão Supabase PostgreSQL e Repositórios
│   ├── /middleware             # Autenticação JWT/Session e RBAC (requireAdmin)
│   ├── /providers              # Camada de abstração MessageProvider (Meta Cloud API / WABA)
│   └── /routes                 # Rotas da API REST (auth, portal do cliente e admin)
├── /shared
│   └── types.ts                # Modelos de dados e contratos TypeScript unificados
├── /src
│   ├── /components             # Componentes de UI corporativos reutilizáveis
│   ├── /context                # Contextos de autenticação, empresa ativa e notificações
│   ├── /layouts                # Layouts responsivos (Portal do Cliente, Admin e Auth)
│   ├── /pages                  # Páginas do Portal e do Painel Administrativo
│   ├── /services               # Clientes de API REST
│   └── App.tsx                 # Roteador principal e gerenciador de visualizações
├── /supabase
│   └── schema_and_rls.sql      # Script DDL com Row Level Security (RLS) e isolamento
├── server.ts                   # Servidor Express integrado com middleware Vite
├── Dockerfile                  # Multi-stage Docker build para produção e Cloud Run
├── .dockerignore               # Filtro de arquivos para container Docker
├── .env.example                # Declaração padronizada de variáveis de ambiente
└── package.json                # Scripts de build e dependências de produção
```

---

## 📋 Guia Passo a Passo de Instalação e Execução

### 1. Como instalar dependências
Certifique-se de ter o **Node.js v18+** ou **v20+** instalado em seu ambiente:
```bash
npm install
```

---

### 2. Como rodar localmente (Desenvolvimento)
1. Crie o arquivo `.env` a partir do template `.env.example`:
```bash
cp .env.example .env
```
2. Inicie o servidor em modo de desenvolvimento (com hot-reload de API e Vite):
```bash
npm run dev
```
Acesse a aplicação no navegador em `http://localhost:3000`.

---

### 3. Como fazer build
Para gerar o build otimizado tanto do frontend estático quanto do backend em bundle único:
```bash
npm run build
```
Esse comando compila:
- **Frontend React/Vite**: Diretório `dist/` (HTML, JS, CSS minificados e assets).
- **Backend Node.js/Express**: Arquivo `dist/server.cjs` gerado pelo `esbuild`.

---

### 4. Variáveis de Ambiente Necessárias
Configure as seguintes variáveis no seu arquivo `.env` ou no painel de segredos do provedor de nuvem:

| Variável | Obrigatória | Descrição |
| :--- | :---: | :--- |
| `NODE_ENV` | Sim | Definir como `production` em ambiente de produção. |
| `PORT` | Sim | Porta de escuta da aplicação (padrão: `3000` ou injetada pelo Cloud Run). |
| `APP_URL` | Sim | URL pública base da aplicação (ex: `https://syntechdc.com.br`). |
| `FRONTEND_URL` | Sim | Origem autorizada para CORS restrito em produção. |
| `SUPABASE_URL` | Sim | URL da instância do Supabase (ex: `https://xxxx.supabase.co`). |
| `SUPABASE_ANON_KEY` | Sim | Chave pública do Supabase para o cliente frontend. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave de serviço privada restrita exclusivamente ao backend Node.js. |
| `JWT_SECRET` | Sim | Chave secreta para assinatura e verificação de tokens JWT. |
| `WHATSAPP_CLOUD_API_TOKEN` | Opcional | Token permanente da Meta Cloud API para disparos WABA. |
| `WHATSAPP_WABA_ID` | Opcional | ID da conta comercial WhatsApp (WABA). |
| `WHATSAPP_PHONE_ID` | Opcional | ID do número de telefone configurado na Meta. |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN`| Opcional | Token para verificação do webhook da Meta. |
| `GEMINI_API_KEY` | Opcional | Chave para IA de redação de mensagens e otimização. |

---

### 5. Como iniciar em Produção
Após executar o comando `npm run build`:
```bash
npm start
```
O servidor inicializará o arquivo `dist/server.cjs` servindo os arquivos estáticos e os endpoints de API `/api/*` e `/api/health`.

---

### 6. Como executar com Docker
A aplicação possui um `Dockerfile` multi-stage otimizado com usuário não-root e verificação de integridade (Health Check).

1. **Construir a imagem Docker**:
```bash
docker build -t syntech-dc:latest .
```

2. **Executar o container**:
```bash
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name syntech-dc-app \
  syntech-dc:latest
```

3. **Verificar o status de saúde**:
```bash
curl http://localhost:3000/api/health
```

---

### 7. Como publicar no Google Cloud Run
Para publicar o container no Google Cloud Run gerenciado:

1. **Autenticar no Google Cloud**:
```bash
gcloud auth login
gcloud config set project [SEU-PROJECT-ID]
```

2. **Executar o Deploy a partir do código-fonte**:
```bash
gcloud run deploy syntech-dc \
  --source . \
  --platform managed \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars "NODE_ENV=production,SUPABASE_URL=https://[PROJETO].supabase.co,FRONTEND_URL=https://[DOMINIO]"
```

3. **Verificar os logs em tempo real**:
```bash
gcloud run services logs tail syntech-dc --region southamerica-east1
```

---

## 🔒 Segurança, RBAC & Multi-Tenant
* **Autenticação**: Suporte a tokens Bearer e integração com sessões Supabase.
* **RBAC**: Permissões diferenciadas entre `ADMIN`, `MANAGER`, `SUPPORT`, `OPERATOR`, `CLIENT_ADMIN` e `CLIENT_MEMBER`. Perfis de clientes são bloqueados de acessar qualquer rota `/api/admin/*`.
* **Isolamento de Dados**: Todas as queries de contatos, campanhas, mensagens e tickets filtram e validam estritamente por `company_id`.
