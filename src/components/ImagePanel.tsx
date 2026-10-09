import { useRef, useState } from "react";
import { loadImage } from "../imageCache";

interface Generated {
  url: string;
  width: number;
  height: number;
  prompt: string;
}

interface Props {
  /** 画像をスライドに配置する。幅・高さは元画像のピクセル数 */
  onPlace: (src: string, width: number, height: number) => void;
}

type Aspect = "landscape" | "square" | "portrait";

const STYLES = [
  { id: "", label: "指定なし" },
  { id: "フラットなベクターイラスト。シンプルな形と少ない色数。", label: "フラットイラスト" },
  { id: "柔らかい水彩画風。淡い色合い。", label: "水彩風" },
  { id: "写実的な写真。自然光。", label: "写真風" },
  { id: "線画の手描き風スケッチ。白背景。", label: "手描き線画" },
  { id: "3Dレンダリングのクレイ風。柔らかい陰影、パステルカラー。", label: "3Dクレイ風" },
  { id: "シンプルなアイコン風。単色の背景、中央に1つのモチーフ。", label: "アイコン風" },
];

export function ImagePanel({ onPlace }: Props) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(STYLES[0].id);
  const [aspect, setAspect] = useState<Aspect>("landscape");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Generated[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const generate = async () => {
    if (!prompt.trim()) {
      setError("画像の内容を入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    setElapsed(0);
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, aspect }),
      });
      const data = (await res.json()) as { url?: string; width?: number; height?: number; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? `サーバーエラー (${res.status})`);
      const img = await loadImage(data.url);
      const item: Generated = { url: data.url, width: data.width || img.naturalWidth, height: data.height || img.naturalHeight, prompt };
      setHistory((h) => [item, ...h]);
      onPlace(item.url, item.width, item.height);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const upload = async (file: File) => {
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("ファイルを読めませんでした"));
        r.readAsDataURL(file);
      });
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, dataUrl }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? `サーバーエラー (${res.status})`);
      const img = await loadImage(data.url);
      const item: Generated = { url: data.url, width: img.naturalWidth, height: img.naturalHeight, prompt: file.name };
      setHistory((h) => [item, ...h]);
      onPlace(item.url, item.width, item.height);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="panel-body">
      <h3>画像を生成して配置</h3>
      <p className="hint" style={{ marginTop: 0 }}>
        Codex CLI（ChatGPTサブスク）の画像生成を使います。1枚あたり1〜2分かかります。
      </p>
      <label className="field">
        <span>画像の内容</span>
        <textarea
          rows={4}
          placeholder="例: ノートPCで作業する若いビジネスパーソン。明るいオフィス。"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </label>
      <div className="grid2">
        <label className="field">
          <span>スタイル</span>
          <select value={style} onChange={(e) => setStyle(e.target.value)}>
            {STYLES.map((s) => (
              <option key={s.label} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>縦横比</span>
          <select value={aspect} onChange={(e) => setAspect(e.target.value as Aspect)}>
            <option value="landscape">横長 (3:2)</option>
            <option value="square">正方形</option>
            <option value="portrait">縦長 (2:3)</option>
          </select>
        </label>
      </div>
      <button className="primary big" onClick={generate} disabled={loading}>
        {loading ? `生成中… ${elapsed}秒` : "画像を生成してスライドに置く"}
      </button>
      {error && <p className="error">{error}</p>}

      <h4>PCの画像を置く</h4>
      <button onClick={() => fileInput.current?.click()}>画像ファイルを選ぶ…</button>
      <input
        ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
      />

      {history.length > 0 && (
        <>
          <h4>このセッションの画像（クリックで再配置）</h4>
          <div className="img-history">
            {history.map((h) => (
              <button key={h.url} className="img-thumb" title={h.prompt} onClick={() => onPlace(h.url, h.width, h.height)}>
                <img src={h.url} alt="" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
