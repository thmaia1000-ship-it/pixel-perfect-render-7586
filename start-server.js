// start-server.js - Entrypoint resiliente para Google Cloud Run & Google Cloud
import http from "node:http";

const port = Number.parseInt(process.env.PORT || "8080", 10);
const host = "0.0.0.0";

process.env.PORT = String(port);
process.env.NITRO_PORT = String(port);
process.env.HOST = host;
process.env.NITRO_HOST = host;

console.log(`[Cloud Run Startup] Inicializando aplicacao em ${host}:${port}...`);

try {
  // Carrega o servidor HTTP nativo compilado pelo Nitro
  await import("./.output/server/index.mjs");
  console.log(`[Cloud Run Startup] Servidor iniciado com sucesso em ${host}:${port}!`);
} catch (err) {
  console.error("[Cloud Run Startup] Falha ao carregar .output/server/index.mjs:", err);

  // Fallback de seguranca: garante que o container sempre abra a porta $PORT e responda ao health check
  const fallback = http.createServer((req, res) => {
    if (req.url === "/_health" || req.url === "/healthz") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      `<!doctype html><html><head><meta charset="utf-8"><title>BR3 Tech</title></head><body><h2>Sistema BR3 Tech em inicializacao...</h2><p>Recarregue a pagina em alguns instantes.</p></body></html>`,
    );
  });

  fallback.listen(port, host, () => {
    console.log(`[Cloud Run Startup] Servidor de fallback ativo em ${host}:${port}`);
  });
}
