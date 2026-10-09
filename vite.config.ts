import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { generateDeck } from "./server/generate";
import { generateImage, saveUploadedImage } from "./server/image";

type Handler = (body: any) => Promise<unknown>;

/** POST の JSON ボディを受け取り、JSON を返す小さなルート */
function jsonRoute(handler: Handler) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("Content-Type", "application/json");
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: "Method Not Allowed" }));
      return;
    }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try {
      const result = await handler(JSON.parse(raw || "{}"));
      res.end(JSON.stringify(result));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[api]", message);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: message }));
    }
  };
}

/** 開発サーバー内で /api/* を処理する。API キーはブラウザに渡らない。 */
function localApiPlugin(env: Record<string, string>): Plugin {
  const publicDir = path.resolve(process.cwd(), "public");
  const codexModel = env.CODEX_MODEL || "gpt-5.5";
  return {
    name: "local-api",
    configureServer(server) {
      server.middlewares.use(
        "/api/generate",
        jsonRoute(async (body) => {
          if (!env.ANTHROPIC_API_KEY) throw new Error(".env に ANTHROPIC_API_KEY が設定されていません");
          return generateDeck(env.ANTHROPIC_API_KEY, body);
        }),
      );
      server.middlewares.use(
        "/api/image",
        jsonRoute((body) => generateImage(body, publicDir, codexModel)),
      );
      server.middlewares.use(
        "/api/upload",
        jsonRoute((body) => saveUploadedImage(body.name, body.dataUrl, publicDir)),
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), localApiPlugin(env)],
    server: { port: Number(process.env.PORT) || 5180, strictPort: false },
  };
});
