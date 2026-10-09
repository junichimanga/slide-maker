import { useState } from "react";
import { THEMES } from "../themes";
import { compileDeck } from "../compile";
import type { Deck } from "../types";
import type { DeckSpec } from "../spec";

interface Props {
  currentThemeId: string;
  onGenerated: (deck: Deck) => void;
}

export function GeneratePanel({ currentThemeId, onGenerated }: Props) {
  const [topic, setTopic] = useState("");
  const [extra, setExtra] = useState("");
  const [slideCount, setSlideCount] = useState(8);
  const [themeId, setThemeId] = useState(currentThemeId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!topic.trim()) {
      setError("テーマを入力してください");
      return;
    }
    if (!window.confirm("今のスライドは新しい内容で置き換わります（元に戻すで復元できます）。生成しますか？")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, slideCount, extra }),
      });
      const data = (await res.json()) as { spec?: DeckSpec; error?: string };
      if (!res.ok || !data.spec) throw new Error(data.error ?? `サーバーエラー (${res.status})`);
      onGenerated(compileDeck(data.spec, themeId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel-body">
      <h3>AIでベースを作る</h3>
      <label className="field">
        <span>テーマ・伝えたいこと</span>
        <textarea
          rows={5}
          placeholder="例: 新人向けのタスク管理入門。優先順位の付け方、ツールの使い方、1週間の振り返り方法まで"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </label>
      <label className="field">
        <span>補足・要望（任意）</span>
        <textarea
          rows={3}
          placeholder="例: 対象は20代の社会人。図解を多めに。最後にチェックリストを入れて"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
        />
      </label>
      <div className="grid2">
        <label className="field">
          <span>枚数</span>
          <input type="number" min={3} max={20} value={slideCount} onChange={(e) => setSlideCount(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>テーマ色</span>
          <select value={themeId} onChange={(e) => setThemeId(e.target.value)}>
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="theme-swatches">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={"swatch" + (t.id === themeId ? " active" : "")}
            style={{ background: t.background, borderColor: t.accent }}
            onClick={() => setThemeId(t.id)}
            title={t.name}
          >
            <span style={{ background: t.primary }} />
            <span style={{ background: t.accent }} />
          </button>
        ))}
      </div>
      <button className="primary big" onClick={generate} disabled={loading}>
        {loading ? "生成中…（30秒〜1分ほど）" : "スライドを生成"}
      </button>
      {error && <p className="error">{error}</p>}
      <p className="hint">生成後は、キャンバス上でテキストや図解の各パーツを自由に動かせます。</p>
    </div>
  );
}
