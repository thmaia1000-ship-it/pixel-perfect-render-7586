# Imagem oficial Bun baseada em Debian (glibc) compativel com o Google Cloud Run e gVisor
FROM oven/bun:1.2 AS builder

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

# Stage 2: Runtime estavel Debian para Google Cloud Run
FROM oven/bun:1.2 AS runner

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    NITRO_HOST=0.0.0.0 \
    PORT=8080

COPY --from=builder /app ./

EXPOSE 8080

# Inicia o entrypoint resiliente do Cloud Run que escuta na porta $PORT
CMD ["bun", "start-server.js"]
