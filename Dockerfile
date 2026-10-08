# Imagem oficial Bun para build e execução rápida no Google Cloud Run
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Copia manifestos de pacotes
COPY package.json bun.lock* ./

# Instala todas as dependências
RUN bun install --frozen-lockfile || bun install

# Copia código-fonte
COPY . .

# Argumentos de build do Vite / Supabase
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
    NITRO_PRESET=node-server \
    NODE_ENV=production

# Compila o projeto com preset de servidor universal
RUN bun run build

# Stage 2: Runtime enxuto e resiliente
FROM oven/bun:1.2-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080

COPY --from=builder /app ./

EXPOSE 8080

# Inicia o servidor HTTP universal do Nitro que atende na porta $PORT do Cloud Run / Google Cloud
CMD ["bun", ".output/server/index.mjs"]
