import type { SlideElement, Slide } from "../types";

interface Props {
  slide: Slide;
  element: SlideElement | null;
  onChange: (id: string, patch: Partial<SlideElement>, coalesceKey?: string) => void;
  onSlideChange: (patch: Partial<Slide>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReorder: (id: string, dir: "front" | "back") => void;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" value={Math.round(value)} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
  return (
    <label className="field">
      <span>{label}</span>
      <span className="color-row">
        <input type="color" value={safe} onChange={(e) => onChange(e.target.value)} />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  );
}

export function PropertiesPanel({ slide, element, onChange, onSlideChange, onDelete, onDuplicate, onReorder }: Props) {
  if (!element) {
    return (
      <div className="panel-body">
        <h3>スライド</h3>
        <ColorField label="背景色" value={slide.background} onChange={(v) => onSlideChange({ background: v })} />
        <p className="hint">要素をクリックすると、ここで細かく編集できます。テキストはダブルクリックで直接編集できます。</p>
      </div>
    );
  }

  const el = element;
  const set = (patch: Partial<SlideElement>, key?: string) => onChange(el.id, patch, key);
  const typeName = { text: "テキスト", rect: "四角形", ellipse: "楕円", arrow: "矢印", image: "画像" }[el.type];

  return (
    <div className="panel-body">
      <h3>{typeName}</h3>

      {el.type === "text" && (
        <>
          <label className="field">
            <span>内容</span>
            <textarea rows={4} value={el.text} onChange={(e) => set({ text: e.target.value }, "text:" + el.id)} />
          </label>
          <NumberField label="文字サイズ" value={el.fontSize} onChange={(v) => set({ fontSize: Math.max(8, v) })} />
          <ColorField label="文字色" value={el.fill} onChange={(v) => set({ fill: v }, "fill:" + el.id)} />
          <div className="field">
            <span>スタイル</span>
            <div className="btn-group">
              <button className={el.fontStyle.includes("bold") ? "active" : ""}
                onClick={() => set({ fontStyle: el.fontStyle.includes("bold") ? (el.fontStyle.includes("italic") ? "italic" : "normal") : (el.fontStyle.includes("italic") ? "bold italic" : "bold") })}>
                <b>B</b>
              </button>
              <button className={el.fontStyle.includes("italic") ? "active" : ""}
                onClick={() => set({ fontStyle: el.fontStyle.includes("italic") ? (el.fontStyle.includes("bold") ? "bold" : "normal") : (el.fontStyle.includes("bold") ? "bold italic" : "italic") })}>
                <i>I</i>
              </button>
            </div>
          </div>
          <div className="field">
            <span>横位置</span>
            <div className="btn-group">
              {(["left", "center", "right"] as const).map((a) => (
                <button key={a} className={el.align === a ? "active" : ""} onClick={() => set({ align: a })}>
                  {a === "left" ? "左" : a === "center" ? "中" : "右"}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>縦位置</span>
            <div className="btn-group">
              {(["top", "middle", "bottom"] as const).map((a) => (
                <button key={a} className={el.verticalAlign === a ? "active" : ""} onClick={() => set({ verticalAlign: a })}>
                  {a === "top" ? "上" : a === "middle" ? "中" : "下"}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {(el.type === "rect" || el.type === "ellipse") && (
        <>
          <ColorField label="塗り" value={el.fill} onChange={(v) => set({ fill: v }, "fill:" + el.id)} />
          <ColorField label="枠線色" value={el.stroke ?? "#000000"} onChange={(v) => set({ stroke: v }, "stroke:" + el.id)} />
          <NumberField label="枠線の太さ" value={el.strokeWidth ?? 0} onChange={(v) => set({ strokeWidth: Math.max(0, v) })} />
          {el.type === "rect" && (
            <NumberField label="角の丸み" value={el.cornerRadius ?? 0} onChange={(v) => set({ cornerRadius: Math.max(0, v) })} />
          )}
        </>
      )}

      {el.type === "image" && (
        <>
          <div className="field">
            <span>プレビュー</span>
            <img src={el.src} alt="" className="img-preview" />
          </div>
          <label className="field">
            <span>不透明度 ({Math.round((el.opacity ?? 1) * 100)}%)</span>
            <input type="range" min={0} max={1} step={0.05} value={el.opacity ?? 1}
              onChange={(e) => set({ opacity: Number(e.target.value) }, "opacity:" + el.id)} />
          </label>
          <p className="hint">角のハンドルで縦横比を保ったまま拡大縮小できます。</p>
        </>
      )}

      {el.type === "arrow" && (
        <>
          <ColorField label="色" value={el.stroke} onChange={(v) => set({ stroke: v }, "stroke:" + el.id)} />
          <NumberField label="太さ" value={el.strokeWidth} onChange={(v) => set({ strokeWidth: Math.max(1, v) })} />
          <p className="hint">両端の丸いハンドルをドラッグすると向きを変えられます。</p>
        </>
      )}

      <h4>位置とサイズ</h4>
      <div className="grid2">
        <NumberField label="X" value={el.x} onChange={(v) => set({ x: v })} />
        <NumberField label="Y" value={el.y} onChange={(v) => set({ y: v })} />
        <NumberField label="幅" value={el.width} onChange={(v) => set({ width: v })} />
        <NumberField label="高さ" value={el.height} onChange={(v) => set({ height: v })} />
      </div>
      {el.type !== "arrow" && (
        <NumberField label="回転" value={el.rotation ?? 0} onChange={(v) => set({ rotation: v })} />
      )}

      <h4>操作</h4>
      <div className="btn-col">
        <button onClick={() => onReorder(el.id, "front")}>前面へ</button>
        <button onClick={() => onReorder(el.id, "back")}>背面へ</button>
        <button onClick={() => onDuplicate(el.id)}>複製</button>
        <button className="danger" onClick={() => onDelete(el.id)}>削除</button>
      </div>
    </div>
  );
}
