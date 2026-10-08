# 🚀 Guia de Publicação e Integração: Google AI Studio & Google Cloud

Este projeto está 100% configurado para rodar e ser publicado nos serviços do Google:

1. **Google AI Studio / Google Project IDX** (Ambiente de desenvolvimento e testes de prompts Gemini na nuvem)
2. **Google Firebase App Hosting** (Deploy contínuo direto do GitHub)
3. **Google Cloud Run** (Deploy de container Docker serverless)

---

## 🤖 1. Integração com Google AI Studio (Gemini 2.0 / 1.5 Flash)

O sistema conta com um assistente pericial integrado com a API do **Google AI Studio** para analisar ordens de serviço e diagnósticos de hardware.

### Como obter sua chave gratuita:

1. Acesse [Google AI Studio](https://aistudio.google.com/).
2. Clique no botão **"Get API key"** (Obter chave de API).
3. Crie uma chave de API vinculada a um projeto Google Cloud ou use a padrão.
4. Você pode configurar a chave de duas maneiras:
   - **Pelo arquivo de ambiente:** Crie ou edite `.env` e adicione `VITE_GEMINI_API_KEY=sua_chave_aqui`.
   - **Direto pelo Navegador:** Dentro do painel da Ordem de Serviço, clique no botão **"Laudo IA"** ou **"Parecer IA"**, cole sua chave e clique em **"Salvar e Testar Conexão"**. A chave fica salva no navegador (`localStorage`) de forma segura e imediata.

---

## 🛠️ 2. Executar no Google Project IDX (Google AI Studio Workspace)

O repositório já contém a pasta `.idx/dev.nix` pré-configurada para o Google Project IDX:

1. Acesse [Google Project IDX](https://idx.google.com/).
2. Clique em **"Import a repository"** (Importar um repositório).
3. Insira a URL do repositório GitHub:
   `https://github.com/thiagoamaia/pixel-perfect-render-7586.git`
4. O Project IDX detectará automaticamente o arquivo `.idx/dev.nix`, instalará o runtime Bun, as dependências do projeto e iniciará o preview web na porta configurada com live reload.

---

## 🔥 3. Publicar no Google Firebase App Hosting

O repositório possui o arquivo [`apphosting.yaml`](file:///Users/thiagomaia/.gemini/antigravity/scratch/pixel-perfect-render-7586/apphosting.yaml) pronto.

1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Crie ou selecione seu projeto.
3. No menu lateral, acesse **App Hosting**.
4. Conecte sua conta do GitHub e selecione o repositório `thiagoamaia/pixel-perfect-render-7586`.
5. Em **Root directory**, mantenha `/`.
6. Configure as variáveis de ambiente necessárias (como `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e opcionalmente `VITE_GEMINI_API_KEY`).
7. Clique em **Deploy**. A cada novo push na branch `main`, o Firebase App Hosting fará o deploy automático!

---

## 🐳 4. Publicar no Google Cloud Run (Container Docker)

O projeto possui um [`Dockerfile`](file:///Users/thiagomaia/.gemini/antigravity/scratch/pixel-perfect-render-7586/Dockerfile) otimizado com Bun e suporte à variável `PORT` do Cloud Run.

### Deploy via Google Cloud CLI (`gcloud`):

```bash
# 1. Definir o projeto
gcloud config set project SEU_PROJETO_ID

# 2. Build e Deploy direto com um comando
gcloud run deploy br3tech \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "NODE_ENV=production,HOST=0.0.0.0,NITRO_HOST=0.0.0.0,PORT=8080"
```

---

## 📋 Checklist de Arquivos de Integração

- [x] [`.idx/dev.nix`](file:///Users/thiagomaia/.gemini/antigravity/scratch/pixel-perfect-render-7586/.idx/dev.nix) — Configuração nativa para Google Project IDX.
- [x] [`apphosting.yaml`](file:///Users/thiagomaia/.gemini/antigravity/scratch/pixel-perfect-render-7586/apphosting.yaml) — Configuração para Google Firebase App Hosting.
- [x] [`Dockerfile`](file:///Users/thiagomaia/.gemini/antigravity/scratch/pixel-perfect-render-7586/Dockerfile) & [`.dockerignore`](file:///Users/thiagomaia/.gemini/antigravity/scratch/pixel-perfect-render-7586/.dockerignore) — Container para Google Cloud Run.
- [x] [`src/lib/gemini.ts`](file:///Users/thiagomaia/.gemini/antigravity/scratch/pixel-perfect-render-7586/src/lib/gemini.ts) — Cliente REST nativo para API do Google AI Studio (Gemini 2.0 / 1.5).
- [x] [`src/components/ModalGoogleAIStudio.tsx`](file:///Users/thiagomaia/.gemini/antigravity/scratch/pixel-perfect-render-7586/src/components/ModalGoogleAIStudio.tsx) — Interface para geração de laudos e gerenciamento de chaves de IA.
