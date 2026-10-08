#!/bin/bash
set -e

# Se uma URL remota for fornecida como segundo argumento ou variável de ambiente GITHUB_REPO
REMOTE_URL=${2:-$GITHUB_REPO_URL}
if [ -n "$REMOTE_URL" ]; then
  if git remote get-url origin >/dev/null 2>&1; then
    git remote set-url origin "$REMOTE_URL"
  else
    git remote add origin "$REMOTE_URL"
  fi
  echo "✓ Remote origin configurado: $REMOTE_URL"
fi

# Adiciona todas as alterações no repositório
git add .

# Se houver modificações pendentes, faz o commit automático
if ! git diff-index --quiet HEAD --; then
  MENSAGEM=${1:-"chore: atualizacao do projeto para sincronizacao com Lovable ($(date +'%Y-%m-%d %H:%M:%S'))"}
  git commit -m "$MENSAGEM"
fi

CURRENT_BRANCH=$(git branch --show-current || echo "main")

# Se houver remote origin configurado, faz o push para o GitHub
if git remote get-url origin >/dev/null 2>&1; then
  echo "Enviando para o GitHub (origin $CURRENT_BRANCH)..."
  git push -u origin "$CURRENT_BRANCH"
  echo "✓ Upload para o GitHub concluído com sucesso!"
else
  echo "✓ Repositório git local sincronizado com sucesso na branch '$CURRENT_BRANCH'."
  echo "Para enviar diretamente ao GitHub e sincronizar com o Lovable, use:"
  echo "  bash scripts/git-sync.sh \"mensagem\" \"https://<SEU_TOKEN_OU_USUARIO>@github.com/<USUARIO>/<REPO>.git\""
fi

