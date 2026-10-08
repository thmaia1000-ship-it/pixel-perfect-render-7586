# Configurando domínio customizado (br3tech.ia.studio)

Este documento descreve os passos necessários para mapear o domínio **br3tech.ia.studio** ao serviço Cloud Run criado a partir do Google AI Studio.

## 1. Verificar a propriedade do domínio
1. Acesse o [Google Search Console](https://search.google.com/search-console) e adicione o domínio **br3tech.ia.studio** como *Domain property*.
2. Crie o registro **TXT** indicado no seu provedor de DNS e clique em **Verify**.

## 2. Criar o mapeamento no Cloud Run
### UI
1. Abra o **Google Cloud Console** → **Cloud Run** → selecione o serviço (ex.: `br3tech`).
2. Clique em **Manage custom domains** → **Add mapping**.
3. Selecione o domínio verificado e continue. O console exibirá os registros **A** e **AAAA** que precisam ser criados.

### CLI (alternativa)
```bash
PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME=br3tech   # nome do serviço Cloud Run
REGION=us-central1     # região de implantação
CUSTOM_DOMAIN=br3tech.ia.studio

gcloud run domain-mappings create \
  --service=$SERVICE_NAME \
  --domain=$CUSTOM_DOMAIN \
  --region=$REGION \
  --project=$PROJECT_ID
```

## 3. Atualizar registros DNS
No seu provedor de DNS (GoDaddy, Namecheap, Cloudflare, etc.) crie/edite os seguintes registros (substitua pelos valores retornados pelo Cloud Run):
| Tipo | Nome | Valor |
|------|------|-------|
| A    | @    | `<IP fornecido>` |
| AAAA | @    | `<IPv6 fornecido>` |
| CNAME| www  | `br3tech.ia.studio.` (opcional) |

Remova quaisquer registros antigos que apontem para o URL gerado automaticamente (`*.run.app`).

## 4. Propagação e certificado SSL
Aguarde alguns minutos (até 30 min) para a propagação DNS e a emissão automática do certificado Managed SSL pelo Cloud Run. O status do mapeamento deve ficar **Active**.

## 5. Teste final
Abra https://br3tech.ia.studio no navegador. A aplicação deve carregar normalmente.

---
**Observação:** Não são necessárias alterações de código para que o domínio funcione; apenas a configuração acima. Caso queira garantir que o Vite use caminhos relativos, adicione `base: '/'` ao `vite.config.ts` (já está configurado).
