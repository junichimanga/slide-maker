import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Codex CLI（ChatGPT サブスクでログイン済み）の組み込み画像生成ツールを使って画像を1枚作る。
 * 画像は ~/.codex/generated_images/<thread_id>/ に保存されるので、そこから回収して
 * プロジェクトの public/images/ にコピーする。
 */

export interface ImageRequest {
  prompt: string;
  style?: string;
  aspect?: "landscape" | "square" | "portrait";
}

export interface ImageResult {
  url: string;
  width: number;
  height: number;
  file: string;
}

const SIZES: Record<NonNullable<ImageRequest["aspect"]>, string> = {
  landscape: "1536x1024",
  square: "1024x1024",
  portrait: "1024x1536",
};

const TIMEOUT_MS = 6 * 60 * 1000;

function codexHome(): string {
  return process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

/** PNG ヘッダから幅と高さを読む */
export async function pngSize(file: string): Promise<{ width: number; height: number }> {
  const fh = await fs.open(file, "r");
  try {
    const buf = Buffer.alloc(24);
    await fh.read(buf, 0, 24, 0);
    if (buf.toString("ascii", 1, 4) !== "PNG") return { width: 0, height: 0 };
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } finally {
    await fh.close();
  }
}

function buildPrompt(req: ImageRequest): string {
  const size = SIZES[req.aspect ?? "landscape"];
  const lines = [
    "組み込みの画像生成ツール（image_gen）で画像を1枚だけ生成してください。",
    `サイズは ${size} にしてください。`,
    "生成したファイルのコピー・移動・確認コマンドの実行は不要です。生成が終わったら、最後の返答に生成画像のファイルパスだけを1行で書いて終了してください。",
    "",
    "## 画像の内容",
    req.prompt.trim(),
  ];
  if (req.style?.trim()) lines.push("", "## スタイル", req.style.trim());
  lines.push("", "## 注意", "プレゼン資料に貼る画像です。指示がない限り画像の中に文字を入れないでください。背景は単純にしてください。");
  return lines.join("\n");
}

async function newestPng(dir: string): Promise<string | null> {
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return null;
  }
  const pngs = names.filter((n) => n.toLowerCase().endsWith(".png"));
  if (pngs.length === 0) return null;
  const withTime = await Promise.all(
    pngs.map(async (n) => ({ n, t: (await fs.stat(path.join(dir, n))).mtimeMs })),
  );
  withTime.sort((a, b) => b.t - a.t);
  return path.join(dir, withTime[0].n);
}

function runCodex(prompt: string, workDir: string, model: string): Promise<{ threadId: string | null; stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const args = [
      "exec",
      "-m", model,
      "--skip-git-repo-check",
      "--sandbox", "workspace-write",
      "--ephemeral",
      "--json",
      "-C", workDir,
    ];
    // Windows では codex が .cmd シムなので shell 経由で起動する。プロンプトは stdin で渡す（引数のクォート問題を避ける）。
    const child = spawn("codex", args, { shell: process.platform === "win32", windowsHide: true });
    let stdout = "";
    let stderr = "";
    let threadId: string | null = null;

    const timer = setTimeout(() => {
      if (process.platform === "win32" && child.pid) {
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
      } else {
        child.kill("SIGKILL");
      }
      reject(new Error("画像生成がタイムアウトしました（6分）"));
    }, TIMEOUT_MS);

    child.stdout.on("data", (d: Buffer) => {
      const s = d.toString("utf8");
      stdout += s;
      if (!threadId) {
        const m = s.match(/"thread_id"\s*:\s*"([0-9a-f-]+)"/);
        if (m) threadId = m[1];
      }
    });
    child.stderr.on("data", (d: Buffer) => { stderr += d.toString("utf8"); });
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => { clearTimeout(timer); resolve({ threadId, stdout, stderr, code }); });

    child.stdin.write(prompt, "utf8");
    child.stdin.end();
  });
}

function extractErrors(stdout: string): string[] {
  const out: string[] = [];
  for (const line of stdout.split("\n")) {
    if (!line.includes('"type":"error"') && !line.includes('"turn.failed"')) continue;
    try {
      const ev = JSON.parse(line);
      const msg: string = ev.message ?? ev.error?.message ?? ev.item?.message ?? "";
      if (msg) out.push(msg);
    } catch { /* ignore */ }
  }
  return out;
}

export async function generateImage(req: ImageRequest, publicDir: string, model: string): Promise<ImageResult> {
  if (!req.prompt || !req.prompt.trim()) throw new Error("画像の説明が空です");

  const workDir = path.join(os.tmpdir(), "slide-maker-codex");
  await fs.mkdir(workDir, { recursive: true });

  const { threadId, stdout, stderr, code } = await runCodex(buildPrompt(req), workDir, model);

  let src: string | null = null;
  if (threadId) src = await newestPng(path.join(codexHome(), "generated_images", threadId));
  if (!src) {
    const errs = extractErrors(stdout);
    const tail = stderr.trim().split("\n").slice(-3).join("\n");
    throw new Error(
      "画像が生成されませんでした。" +
        (errs.length ? "\n" + errs.join("\n") : "") +
        (tail ? "\n" + tail : "") +
        (code !== 0 ? `\n(codex exit code ${code})` : ""),
    );
  }

  const outDir = path.join(publicDir, "images");
  await fs.mkdir(outDir, { recursive: true });
  const name = `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.png`;
  const dest = path.join(outDir, name);
  await fs.copyFile(src, dest);
  const { width, height } = await pngSize(dest);
  return { url: `/images/${name}`, width, height, file: dest };
}

/** ユーザーの手持ち画像（data URL）を public/images に保存する */
export async function saveUploadedImage(name: string, dataUrl: string, publicDir: string): Promise<{ url: string }> {
  const m = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/);
  if (!m) throw new Error("対応していない画像形式です（PNG / JPEG / WebP / GIF）");
  const ext = m[2] === "jpeg" ? "jpg" : m[2];
  const outDir = path.join(publicDir, "images");
  await fs.mkdir(outDir, { recursive: true });
  const base = (name || "upload").replace(/\.[^.]+$/, "").replace(/[^\w\-一-龠ぁ-んァ-ン]/g, "_").slice(0, 40);
  const file = `${base}-${Date.now().toString(36)}.${ext}`;
  await fs.writeFile(path.join(outDir, file), Buffer.from(m[3], "base64"));
  return { url: `/images/${file}` };
}
