import { useCallback, useEffect, useRef, useState } from "react";
import { useDeckHistory, loadSavedDeck } from "./store";
import { sampleDeck } from "./sample";
import { blankSlide } from "./compile";
import { getTheme } from "./themes";
import { uid, SLIDE_W, SLIDE_H } from "./types";
import type { Deck, Slide, SlideElement } from "./types";
import { SlideList } from "./components/SlideList";
import { Editor } from "./components/Editor";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { GeneratePanel } from "./components/GeneratePanel";
import { ImagePanel } from "./components/ImagePanel";
import { PdfExporter } from "./components/PdfExporter";

type Tab = "generate" | "image" | "props";

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable;
}

type ShapeType = Exclude<SlideElement["type"], "image">;

function newElement(type: ShapeType, themeId: string): SlideElement {
  const t = getTheme(themeId);
  const base = { id: uid(), x: 440, y: 280, width: 400, height: 120 };
  switch (type) {
    case "text":
      return { ...base, type: "text", text: "テキスト", fontSize: 28, fill: t.text, fontStyle: "normal", align: "left", verticalAlign: "top" };
    case "rect":
      return { ...base, type: "rect", width: 300, height: 160, fill: t.card, stroke: t.accent, strokeWidth: 2, cornerRadius: 12 };
    case "ellipse":
      return { ...base, type: "ellipse", width: 220, height: 220, fill: t.card, stroke: t.accent, strokeWidth: 2 };
    case "arrow":
      return { ...base, type: "arrow", width: 240, height: 0, stroke: t.accent, strokeWidth: 4 };
  }
}

export default function App() {
  const { deck, update, undo, redo, canUndo, canRedo } = useDeckHistory(loadSavedDeck() ?? sampleDeck());
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("generate");
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const current = deck.slides[Math.min(index, deck.slides.length - 1)];
  const currentIndex = deck.slides.indexOf(current);
  const selected = current.elements.find((e) => e.id === selectedId) ?? null;

  const updateSlide = useCallback(
    (slideId: string, fn: (s: Slide) => Slide, coalesceKey?: string) => {
      update((d) => ({ ...d, slides: d.slides.map((s) => (s.id === slideId ? fn(s) : s)) }), coalesceKey);
    },
    [update],
  );

  const changeElement = useCallback(
    (id: string, patch: Partial<SlideElement>, coalesceKey?: string) => {
      updateSlide(
        current.id,
        (s) => ({ ...s, elements: s.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as SlideElement) : e)) }),
        coalesceKey,
      );
    },
    [updateSlide, current.id],
  );

  const deleteElement = (id: string) => {
    updateSlide(current.id, (s) => ({ ...s, elements: s.elements.filter((e) => e.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateElement = (id: string) => {
    const src = current.elements.find((e) => e.id === id);
    if (!src) return;
    const copy = { ...src, id: uid(), x: src.x + 24, y: src.y + 24 };
    updateSlide(current.id, (s) => ({ ...s, elements: [...s.elements, copy] }));
    setSelectedId(copy.id);
  };

  const reorderElement = (id: string, dir: "front" | "back") => {
    updateSlide(current.id, (s) => {
      const el = s.elements.find((e) => e.id === id);
      if (!el) return s;
      const rest = s.elements.filter((e) => e.id !== id);
      return { ...s, elements: dir === "front" ? [...rest, el] : [el, ...rest] };
    });
  };

  const addElement = (type: ShapeType) => {
    const el = newElement(type, deck.themeId);
    updateSlide(current.id, (s) => ({ ...s, elements: [...s.elements, el] }));
    setSelectedId(el.id);
    setTab("props");
  };

  /** 画像をスライド中央に、幅 640px 以内で縦横比を保って配置 */
  const addImageElement = (src: string, naturalW: number, naturalH: number) => {
    const maxW = 640, maxH = 480;
    const ratio = naturalW > 0 && naturalH > 0 ? naturalW / naturalH : 1.5;
    let width = maxW, height = maxW / ratio;
    if (height > maxH) { height = maxH; width = maxH * ratio; }
    const el: SlideElement = {
      id: uid(), type: "image", src, width, height,
      x: (SLIDE_W - width) / 2, y: (SLIDE_H - height) / 2,
    };
    updateSlide(current.id, (s) => ({ ...s, elements: [...s.elements, el] }));
    setSelectedId(el.id);
    setTab("props");
  };

  const selectElement = (id: string | null) => {
    setSelectedId(id);
    if (id) setTab("props");
  };

  // ---- スライド操作 ----
  const addSlide = () => {
    const s = blankSlide(deck.themeId);
    update((d) => {
      const slides = [...d.slides];
      slides.splice(currentIndex + 1, 0, s);
      return { ...d, slides };
    });
    setIndex(currentIndex + 1);
    setSelectedId(null);
  };

  const duplicateSlide = () => {
    const copy: Slide = { ...current, id: uid(), elements: current.elements.map((e) => ({ ...e, id: uid() })) };
    update((d) => {
      const slides = [...d.slides];
      slides.splice(currentIndex + 1, 0, copy);
      return { ...d, slides };
    });
    setIndex(currentIndex + 1);
    setSelectedId(null);
  };

  const deleteSlide = () => {
    if (deck.slides.length <= 1) return;
    update((d) => ({ ...d, slides: d.slides.filter((s) => s.id !== current.id) }));
    setIndex(Math.max(0, currentIndex - 1));
    setSelectedId(null);
  };

  const moveSlide = (dir: -1 | 1) => {
    const to = currentIndex + dir;
    if (to < 0 || to >= deck.slides.length) return;
    update((d) => {
      const slides = [...d.slides];
      [slides[currentIndex], slides[to]] = [slides[to], slides[currentIndex]];
      return { ...d, slides };
    });
    setIndex(to);
  };

  // ---- デッキ操作 ----
  const replaceDeck = (d: Deck) => {
    update(() => d);
    setIndex(0);
    setSelectedId(null);
  };

  const newDeck = () => {
    if (!window.confirm("今のスライドを消して新規作成します（元に戻すで復元できます）。よろしいですか？")) return;
    replaceDeck({ title: "無題のスライド", themeId: deck.themeId, slides: [blankSlide(deck.themeId)] });
  };

  const saveJson = () => {
    const blob = new Blob([JSON.stringify(deck, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (deck.title || "slides") + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openJson = (file: File) => {
    file.text().then((text) => {
      try {
        const d = JSON.parse(text) as Deck;
        if (!d || !Array.isArray(d.slides) || d.slides.length === 0) throw new Error("形式が違います");
        replaceDeck(d);
      } catch (e) {
        setMessage("読み込めませんでした: " + (e instanceof Error ? e.message : String(e)));
      }
    });
  };

  // ---- キーボード ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if (ctrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (ctrl && e.key.toLowerCase() === "d" && selectedId) {
        e.preventDefault();
        duplicateElement(selectedId);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteElement(selectedId);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <div className="app">
      <header className="topbar">
        <input
          className="deck-title"
          value={deck.title}
          onChange={(e) => update((d) => ({ ...d, title: e.target.value }), "title")}
          placeholder="資料タイトル"
        />
        <div className="topbar-actions">
          <button onClick={undo} disabled={!canUndo} title="元に戻す (Ctrl+Z)">↶ 元に戻す</button>
          <button onClick={redo} disabled={!canRedo} title="やり直す (Ctrl+Y)">↷ やり直す</button>
          <span className="divider" />
          <button onClick={newDeck}>新規</button>
          <button onClick={() => fileInput.current?.click()}>JSONを開く</button>
          <button onClick={saveJson}>JSONで保存</button>
          <input
            ref={fileInput} type="file" accept="application/json" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) openJson(f); e.target.value = ""; }}
          />
          <button className="primary" onClick={() => setExporting(true)} disabled={exporting}>
            {exporting ? "書き出し中…" : "PDF書き出し"}
          </button>
        </div>
      </header>

      <div className="main">
        <SlideList
          slides={deck.slides}
          currentIndex={currentIndex}
          onSelect={(i) => { setIndex(i); setSelectedId(null); }}
          onAdd={addSlide}
          onDuplicate={duplicateSlide}
          onDelete={deleteSlide}
          onMove={moveSlide}
        />

        <Editor
          slide={current}
          selectedId={selectedId}
          onSelect={selectElement}
          onChange={changeElement}
          onAdd={addElement}
          onDelete={deleteElement}
        />

        <aside className="side-panel">
          <div className="tabs">
            <button className={tab === "generate" ? "active" : ""} onClick={() => setTab("generate")}>AI生成</button>
            <button className={tab === "image" ? "active" : ""} onClick={() => setTab("image")}>画像</button>
            <button className={tab === "props" ? "active" : ""} onClick={() => setTab("props")}>プロパティ</button>
          </div>
          {tab === "generate" ? (
            <GeneratePanel currentThemeId={deck.themeId} onGenerated={(d) => { replaceDeck(d); setMessage("生成しました。キャンバスで自由に編集できます。"); }} />
          ) : tab === "image" ? (
            <ImagePanel onPlace={addImageElement} />
          ) : (
            <PropertiesPanel
              slide={current}
              element={selected}
              onChange={changeElement}
              onSlideChange={(patch) => updateSlide(current.id, (s) => ({ ...s, ...patch }), "slide:" + current.id)}
              onDelete={deleteElement}
              onDuplicate={duplicateElement}
              onReorder={reorderElement}
            />
          )}
        </aside>
      </div>

      {message && <div className="toast">{message}</div>}

      {exporting && (
        <PdfExporter
          deck={deck}
          onDone={(err) => {
            setExporting(false);
            setMessage(err ? "PDF書き出しに失敗: " + err : "PDFを書き出しました");
          }}
        />
      )}
    </div>
  );
}
