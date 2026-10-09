import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SlideCanvas, FONT_FAMILY } from "./SlideCanvas";
import { SLIDE_W, SLIDE_H } from "../types";
import type { Slide, SlideElement, TextElement } from "../types";

interface Props {
  slide: Slide;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<SlideElement>, coalesceKey?: string) => void;
  onAdd: (type: Exclude<SlideElement["type"], "image">) => void;
  onDelete: (id: string) => void;
}

export function Editor({ slide, selectedId, onSelect, onChange, onAdd, onDelete }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [editingId, setEditingId] = useState<string | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // コンテナに合わせて拡大率を決める
  useLayoutEffect(() => {
    const el = container.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth - 32;
      const h = el.clientHeight - 32;
      setScale(Math.max(0.1, Math.min(w / SLIDE_W, h / SLIDE_H)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 編集対象が消えたら編集モードを抜ける
  useEffect(() => {
    if (editingId && !slide.elements.some((e) => e.id === editingId)) setEditingId(null);
  }, [slide, editingId]);

  useEffect(() => {
    if (editingId && textarea.current) {
      textarea.current.focus();
      textarea.current.select();
    }
  }, [editingId]);

  const editing = editingId ? (slide.elements.find((e) => e.id === editingId) as TextElement | undefined) : undefined;

  return (
    <div className="editor">
      <div className="editor-tools">
        <span className="label">追加:</span>
        <button onClick={() => onAdd("text")}>テキスト</button>
        <button onClick={() => onAdd("rect")}>四角</button>
        <button onClick={() => onAdd("ellipse")}>円</button>
        <button onClick={() => onAdd("arrow")}>矢印</button>
        <span className="spacer" />
        {selectedId && (
          <button className="danger" onClick={() => onDelete(selectedId)}>選択した要素を削除</button>
        )}
      </div>
      <div className="editor-area" ref={container}>
        <div className="stage-wrap" style={{ width: SLIDE_W * scale, height: SLIDE_H * scale }}>
          <SlideCanvas
            slide={slide}
            scale={scale}
            editable
            selectedId={editingId ? null : selectedId}
            onSelect={(id) => {
              if (editingId) setEditingId(null);
              onSelect(id);
            }}
            onChange={(id, patch) => onChange(id, patch)}
            onEditText={(id) => {
              onSelect(id);
              setEditingId(id);
            }}
          />
          {editing && (
            <textarea
              ref={textarea}
              className="text-editor"
              value={editing.text}
              onChange={(e) => onChange(editing.id, { text: e.target.value }, "text:" + editing.id)}
              onBlur={() => setEditingId(null)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditingId(null);
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  setEditingId(null);
                }
              }}
              style={{
                left: editing.x * scale,
                top: editing.y * scale,
                width: editing.width * scale,
                height: editing.height * scale,
                fontSize: editing.fontSize * scale,
                fontFamily: FONT_FAMILY,
                fontWeight: editing.fontStyle.includes("bold") ? "bold" : "normal",
                fontStyle: editing.fontStyle.includes("italic") ? "italic" : "normal",
                textAlign: editing.align,
                lineHeight: editing.lineHeight ?? 1.25,
                color: editing.fill,
                transform: editing.rotation ? `rotate(${editing.rotation}deg)` : undefined,
                transformOrigin: "top left",
              }}
            />
          )}
        </div>
      </div>
      <div className="editor-hint">
        ドラッグで移動、角のハンドルでサイズ変更、テキストはダブルクリックで編集。Delete で削除、Ctrl+Z で元に戻す。
      </div>
    </div>
  );
}
