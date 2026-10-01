#!/bin/bash
set -e

# Adiciona todas as alterações no repositório
git add .

# Se houver modificações pendentes, faz o commit automático
if ! git diff-index --quiet HEAD --; then
  MENSAGEM=${1:-"chore: atualizacao automatica do projeto ($(date +'%Y-%m-%d %H:%M:%S'))"}
  git commit -m "$MENSAGEM"
fi

# Se houver remote origin configurado, faz o push para o GitHub
if git remote get-url origin >/dev/null 2>&1; then
  echo "Enviando para o GitHub (origin main)..."
  git push origin main
  echo "✓ Upload para o GitHub concluído com sucesso!"
else
  echo "Repositório git local atualizado com sucesso."
  echo "Para conectar ao GitHub remoto, forneça a URL do repositório ou configure:"
  echo "  git remote add origin https://<TOKEN>@github.com/<USUARIO>/<REPOSITORIO>.git"
fi
