/**
 * Utilitários para processamento e compressão de mídias (fotos e vídeos)
 * da conferência de entrada do aparelho.
 */

export function formatarTamanhoBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Comprime uma imagem no navegador utilizando Canvas, limitando dimensões
 * e aplicando compressão JPEG para otimização de salvamento.
 */
export async function comprimirImagem(
  arquivo: File,
  maxDimensao = 1280,
  qualidade = 0.78,
): Promise<{ url: string; tamanhoFormatado: string; tamanhoBytes: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let largura = img.width;
        let altura = img.height;

        if (largura > maxDimensao || altura > maxDimensao) {
          if (largura > altura) {
            altura = Math.round((altura * maxDimensao) / largura);
            largura = maxDimensao;
          } else {
            largura = Math.round((largura * maxDimensao) / altura);
            altura = maxDimensao;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível inicializar o contexto de imagem."));
          return;
        }

        ctx.drawImage(img, 0, 0, largura, altura);
        const dataUrl = canvas.toDataURL("image/jpeg", qualidade);

        // Estima o tamanho em bytes da string base64
        const tamanhoBytes = Math.round((dataUrl.length * 3) / 4);

        resolve({
          url: dataUrl,
          tamanhoFormatado: formatarTamanhoBytes(tamanhoBytes),
          tamanhoBytes,
        });
      };

      img.onerror = () => reject(new Error("Falha ao processar o arquivo de imagem."));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Falha ao ler o arquivo selecionado."));
    reader.readAsDataURL(arquivo);
  });
}

/**
 * Processa um vídeo carregado pelo usuário, convertendo em Data URL
 */
export async function processarVideo(
  arquivo: File,
): Promise<{ url: string; tamanhoFormatado: string; tamanhoBytes: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const tamanhoBytes = arquivo.size;

      resolve({
        url: dataUrl,
        tamanhoFormatado: formatarTamanhoBytes(tamanhoBytes),
        tamanhoBytes,
      });
    };

    reader.onerror = () => reject(new Error("Falha ao processar o arquivo de vídeo."));
    reader.readAsDataURL(arquivo);
  });
}
