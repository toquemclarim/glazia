# Deploy Glazia — Firebase Hosting + Cloud Run + Supabase

Passo a passo para colocar o app no ar (primeira vez).  
Tempo estimado: **1–2 horas** (incluindo criar contas e instalar CLIs).

```text
Navegador → Firebase Hosting (React)
                ↓ VITE_API_URL
           Cloud Run (NestJS)
                ↓ DATABASE_URL
           Supabase Postgres
```

---

## 0) O que você precisa ter

- Conta Google (Gmail)
- Projeto no [Supabase](https://supabase.com) (já tem: banco Free)
- Cartão no Google Cloud (pode ser cobrado se estourar free tier — no começo quase não gasta)
- Neste PC:
  - [Node.js 22+](https://nodejs.org)
  - [Docker Desktop](https://www.docker.com/products/docker-desktop/) (ligado)
  - [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`)
  - Firebase CLI: `npm install -g firebase-tools`

Abra o PowerShell na pasta do projeto:

```powershell
cd C:\Users\euluc\OneDrive\Documentos\Glazia\glazia
```

---

## 1) Preparar secrets de produção (API)

**Não use** o `JWT_SECRET` de desenvolvimento em produção.

1. Gere um segredo forte:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

2. Anote estes valores (bloco de notas local, fora do git):

| Variável | Valor |
|----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | `8080` (Cloud Run define sozinho; pode omitir) |
| `CORS_ORIGIN` | URL do Firebase depois (ex.: `https://glazia-xxxx.web.app`) — na 1ª vez use `*` só para testar, depois troque |
| `DATABASE_URL` | Mesma URI do Supabase (Session pooler) do `server/.env` |
| `DB_SCHEMA` | `analytics` |
| `DB_CATALOG_SCHEMA` | `dt_catalogo` |
| `DB_POOL_MAX` | `5` |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | `false` (comece assim; depois tente `true`) |
| `JWT_SECRET` | o gerado acima (≥ 32 caracteres) |
| `JWT_EXPIRES_IN` | `8h` |
| `AUTH_DEMO_USERS` | `[]` |

> Em produção a API **recusa subir** se `AUTH_DEMO_USERS` tiver usuários demo.

---

## 2) Backend → Google Cloud Run

### 2.1 Login e projeto GCP

```powershell
gcloud auth login
gcloud config set project glazia-server
```

Projeto GCP do Glazia: **ID `glazia-server`** · número **985785675557**.

Ative APIs:

```powershell
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

Escolha região perto do Supabase (ex.: `southamerica-east1` = São Paulo):

```powershell
$REGION = "southamerica-east1"
```

### 2.2 Build e push da imagem

```powershell
cd C:\Users\euluc\OneDrive\Documentos\Glazia\glazia

gcloud builds submit ./server --tag "gcr.io/glazia-server/glazia-api:latest"
```

Aguarde o build (alguns minutos).

### 2.3 Deploy no Cloud Run

Cole as variáveis reais (troque os placeholders):

```powershell
$REGION = "southamerica-east1"

gcloud run deploy glazia-api `
  --image "gcr.io/glazia-server/glazia-api:latest" `
  --region $REGION `
  --platform managed `
  --allow-unauthenticated `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 3 `
  --timeout 60 `
  --set-env-vars "NODE_ENV=production,DB_SCHEMA=analytics,DB_CATALOG_SCHEMA=dt_catalogo,DB_POOL_MAX=5,DATABASE_SSL_REJECT_UNAUTHORIZED=false,JWT_EXPIRES_IN=8h,AUTH_DEMO_USERS=[],CORS_ORIGIN=*" `
  --set-env-vars "DATABASE_URL=COLE_A_URI_DO_SUPABASE_AQUI" `
  --set-env-vars "JWT_SECRET=COLE_O_SEGREDO_FORTE_AQUI"
```

> Dica: se a linha ficar longa demais no PowerShell, use o Console → Cloud Run → Edit → Variables.

Ao terminar, o comando mostra a URL, algo como:

`https://glazia-api-xxxxx-rj.a.run.app`

Teste a saúde:

```powershell
curl https://SUA-URL.run.app/api/v1/health
```

Deve responder JSON ok.

**Guarde essa URL** — é a API pública.

### 2.4 (Recomendado) Secrets no Secret Manager

Depois que estiver no ar, migre `DATABASE_URL` e `JWT_SECRET` para [Secret Manager](https://cloud.google.com/secret-manager) e referencie no Cloud Run (evita secrets em texto no histórico do shell).

---

## 3) Frontend → Firebase Hosting

### 3.1 Criar projeto Firebase

1. Abra [Firebase Console](https://console.firebase.google.com)
2. **Add project** → pode vincular ao **mesmo** projeto GCP
3. Só precisa de **Hosting** (não precisa Auth/Firestore)

### 3.2 Login e init

```powershell
cd C:\Users\euluc\OneDrive\Documentos\Glazia\glazia

firebase login
copy .firebaserc.example .firebaserc
```

Edite `.firebaserc` e coloque o **Project ID** do Firebase.

Ou rode:

```powershell
firebase use --add
```

e escolha o projeto.

### 3.3 Build com a URL da API

Crie `.env.production` na raiz do `glazia` (não commitar):

```env
VITE_API_URL=https://SUA-URL.run.app/api/v1
```

Build + deploy:

```powershell
npm run build
firebase deploy --only hosting
```

Ou em um comando:

```powershell
npm run deploy:web
```

Firebase mostra a URL: `https://SEU-PROJETO.web.app`

### 3.4 Ajustar CORS de verdade

Volte no Cloud Run e troque `CORS_ORIGIN=*` por:

```text
https://SEU-PROJETO.web.app,https://SEU-PROJETO.firebaseapp.com
```

Redeploy só das variáveis (ou Edit no Console → Deploy).

---

## 4) Checklist pós-deploy

- [ ] `https://…run.app/api/v1/health` responde
- [ ] Abrir o site Firebase → landing carrega
- [ ] Criar conta / login funciona
- [ ] No DevTools → Network, as chamadas vão para o Cloud Run (não `localhost`)
- [ ] `AUTH_DEMO_USERS=[]` e `JWT_SECRET` forte
- [ ] CORS só com o domínio Firebase

---

## 5) Atualizar o app depois (dia a dia)

**API mudou:**

```powershell
cd C:\Users\euluc\OneDrive\Documentos\Glazia\glazia
gcloud builds submit ./server --tag "gcr.io/glazia-server/glazia-api:latest"
gcloud run deploy glazia-api --image "gcr.io/glazia-server/glazia-api:latest" --region southamerica-east1
```

**Front mudou:**

```powershell
npm run deploy:web
```

---

## 6) Problemas comuns

| Sintoma | Causa provável | O quê fazer |
|---------|----------------|-------------|
| Front abre, login falha (CORS) | `CORS_ORIGIN` errado | Coloque a URL exata do Firebase |
| API 500 ao subir | `JWT_SECRET` fraco / demo users | Confira validação do `env.ts` |
| Timeout no 1º request | Cold start | Normal (3–6s); depois fica rápido |
| `npm ci` falha no Docker | lock ausente | Já existe `server/package-lock.json` |
| Front chama `localhost` | Falta `.env.production` | Crie e rode `npm run build` de novo |

---

## 7) Custos no começo

- Firebase Hosting Free: ok para tráfego inicial  
- Cloud Run Free tier: costuma cobrir testes e poucos usuários  
- Supabase Free: banco atual  

Monitore: [Google Cloud Billing](https://console.cloud.google.com/billing) e painel Supabase.

---

## Arquivos do repo usados neste deploy

- `server/Dockerfile` — imagem da API  
- `server/.dockerignore`  
- `firebase.json` — Hosting + SPA (React Router)  
- `.firebaserc.example` — modelo do projeto Firebase  
- `.env.production.example` — modelo da URL da API no front  
