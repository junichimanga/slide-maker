import { SLIDE_W, SLIDE_H, uid } from "./types";
import type { Deck, Slide, SlideElement, TextElement, RectElement, ArrowElement } from "./types";
import { getTheme, type Theme } from "./themes";
import type { DeckSpec, SlideSpec, Diagram } from "./spec";

const MARGIN = 80;
const CONTENT_W = SLIDE_W - MARGIN * 2;

function text(
  x: number, y: number, width: number, height: number,
  content: string, fontSize: number, fill: string,
  opts: Partial<TextElement> = {},
): TextElement {
  return {
    id: uid(), type: "text", x, y, width, height,
    text: content, fontSize, fill,
    fontStyle: "normal", align: "left", verticalAlign: "top",
    ...opts,
  };
}

function rect(
  x: number, y: number, width: number, height: number, fill: string,
  opts: Partial<RectElement> = {},
): RectElement {
  return { id: uid(), type: "rect", x, y, width, height, fill, cornerRadius: 12, ...opts };
}

function arrow(x1: number, y1: number, x2: number, y2: number, stroke: string): ArrowElement {
  return { id: uid(), type: "arrow", x: x1, y: y1, width: x2 - x1, height: y2 - y1, stroke, strokeWidth: 4 };
}

/** 見出し + アクセントライン（通常スライド共通） */
function header(title: string, t: Theme): SlideElement[] {
  return [
    text(MARGIN, 56, CONTENT_W, 70, title, 40, t.primary, { fontStyle: "bold", verticalAlign: "middle" }),
    rect(MARGIN, 132, 72, 6, t.accent, { cornerRadius: 3 }),
  ];
}

function layoutTitle(s: SlideSpec, t: Theme): SlideElement[] {
  return [
    rect(0, 0, 24, SLIDE_H, t.accent, { cornerRadius: 0 }),
    text(MARGIN + 40, 220, CONTENT_W - 40, 160, s.title, 60, t.primary, { fontStyle: "bold", verticalAlign: "middle" }),
    rect(MARGIN + 40, 392, 120, 6, t.accent, { cornerRadius: 3 }),
    text(MARGIN + 40, 420, CONTENT_W - 40, 80, s.subtitle, 28, t.muted, { verticalAlign: "top" }),
  ];
}

function layoutSection(s: SlideSpec, t: Theme): SlideElement[] {
  return [
    rect(0, 0, SLIDE_W, SLIDE_H, t.primary, { cornerRadius: 0 }),
    text(MARGIN, 250, CONTENT_W, 120, s.title, 54, t.background, { fontStyle: "bold", verticalAlign: "middle" }),
    rect(MARGIN, 380, 100, 6, t.accent, { cornerRadius: 3 }),
    text(MARGIN, 404, CONTENT_W, 80, s.subtitle, 26, t.background, {}),
  ];
}

function layoutBullets(s: SlideSpec, t: Theme): SlideElement[] {
  const items = s.bullets.length ? s.bullets : ["（内容を入力）"];
  const lineH = Math.min(78, Math.floor(480 / items.length));
  const body = items.map((b, i) =>
    text(MARGIN + 10, 180 + i * lineH, CONTENT_W - 10, lineH, "●  " + b, 28, t.text, { verticalAlign: "middle" }),
  );
  return [...header(s.title, t), ...body];
}

function column(x: number, w: number, heading: string, bullets: string[], t: Theme): SlideElement[] {
  const top = 180;
  const h = 460;
  const out: SlideElement[] = [
    rect(x, top, w, h, t.card),
    rect(x, top, w, 64, t.accent, { cornerRadius: 12 }),
    text(x, top, w, 64, heading, 26, "#ffffff", { fontStyle: "bold", align: "center", verticalAlign: "middle" }),
  ];
  const lineH = Math.min(80, Math.floor((h - 100) / Math.max(bullets.length, 1)));
  bullets.forEach((b, i) => {
    out.push(text(x + 28, top + 90 + i * lineH, w - 56, lineH, "・" + b, 24, t.cardText, { verticalAlign: "middle" }));
  });
  return out;
}

function layoutTwoColumn(s: SlideSpec, t: Theme): SlideElement[] {
  const gap = 40;
  const w = (CONTENT_W - gap) / 2;
  const left = s.left ?? { heading: "左", bullets: ["（内容を入力）"] };
  const right = s.right ?? { heading: "右", bullets: ["（内容を入力）"] };
  return [
    ...header(s.title, t),
    ...column(MARGIN, w, left.heading, left.bullets, t),
    ...column(MARGIN + w + gap, w, right.heading, right.bullets, t),
  ];
}

function layoutQuote(s: SlideSpec, t: Theme): SlideElement[] {
  return [
    rect(MARGIN, 160, 8, 320, t.accent, { cornerRadius: 4 }),
    text(MARGIN + 50, 160, CONTENT_W - 50, 320, s.title, 44, t.primary, { fontStyle: "bold", verticalAlign: "middle", lineHeight: 1.4 }),
    text(MARGIN + 50, 500, CONTENT_W - 50, 60, s.subtitle, 24, t.muted, {}),
  ];
}

function layoutClosing(s: SlideSpec, t: Theme): SlideElement[] {
  return [
    text(MARGIN, 240, CONTENT_W, 120, s.title, 52, t.primary, { fontStyle: "bold", align: "center", verticalAlign: "middle" }),
    rect(SLIDE_W / 2 - 60, 372, 120, 6, t.accent, { cornerRadius: 3 }),
    text(MARGIN, 400, CONTENT_W, 80, s.subtitle, 26, t.muted, { align: "center" }),
  ];
}

// ---------- 図解 ----------

function diagramFlow(d: Diagram, t: Theme): SlideElement[] {
  const n = d.items.length;
  const gap = 36;
  const boxW = Math.min(240, (CONTENT_W - gap * (n - 1)) / n);
  const total = boxW * n + gap * (n - 1);
  const x0 = (SLIDE_W - total) / 2;
  const y = 260;
  const boxH = 120;
  const out: SlideElement[] = [];
  d.items.forEach((it, i) => {
    const x = x0 + i * (boxW + gap);
    out.push(rect(x, y, boxW, boxH, t.accent));
    out.push(text(x, y, boxW, boxH, it.label, 26, "#ffffff", { fontStyle: "bold", align: "center", verticalAlign: "middle" }));
    if (it.description) {
      out.push(text(x - 10, y + boxH + 16, boxW + 20, 110, it.description, 18, t.muted, { align: "center", lineHeight: 1.4 }));
    }
    if (i < n - 1) {
      out.push(arrow(x + boxW + 6, y + boxH / 2, x + boxW + gap - 6, y + boxH / 2, t.primary));
    }
  });
  return out;
}

function diagramCycle(d: Diagram, t: Theme): SlideElement[] {
  const n = d.items.length;
  const cx = SLIDE_W / 2;
  const cy = 430;
  const r = 190;
  const boxW = 200;
  const boxH = 80;
  const out: SlideElement[] = [];
  const pos = d.items.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  pos.forEach((p, i) => {
    const q = pos[(i + 1) % n];
    // 中心同士を結び、ボックスの外側だけを矢印にする
    const dx = q.x - p.x, dy = q.y - p.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const trim = 70;
    out.push(arrow(p.x + ux * trim, p.y + uy * trim, q.x - ux * trim, q.y - uy * trim, t.accent));
  });
  d.items.forEach((it, i) => {
    const p = pos[i];
    out.push({ id: uid(), type: "ellipse", x: p.x - boxW / 2, y: p.y - boxH / 2, width: boxW, height: boxH, fill: t.card, stroke: t.accent, strokeWidth: 3 });
    out.push(text(p.x - boxW / 2, p.y - boxH / 2, boxW, boxH, it.label, 22, t.cardText, { fontStyle: "bold", align: "center", verticalAlign: "middle" }));
  });
  return out;
}

function diagramGrid(d: Diagram, t: Theme): SlideElement[] {
  const n = d.items.length;
  const cols = n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const gap = 28;
  const top = 170;
  const areaH = SLIDE_H - top - 50;
  const w = (CONTENT_W - gap * (cols - 1)) / cols;
  const h = (areaH - gap * (rows - 1)) / rows;
  const out: SlideElement[] = [];
  d.items.forEach((it, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = MARGIN + c * (w + gap);
    const y = top + r * (h + gap);
    out.push(rect(x, y, w, h, t.card));
    out.push(rect(x, y, 8, h, t.accent, { cornerRadius: 4 }));
    out.push(text(x + 28, y + 18, w - 48, 48, it.label, 26, t.cardText, { fontStyle: "bold", verticalAlign: "middle" }));
    if (it.description) {
      out.push(text(x + 28, y + 70, w - 48, h - 86, it.description, 20, t.text, { lineHeight: 1.4 }));
    }
  });
  return out;
}

function diagramPyramid(d: Diagram, t: Theme): SlideElement[] {
  const n = d.items.length;
  const top = 180;
  const areaH = SLIDE_H - top - 60;
  const levelH = Math.min(96, (areaH - 10 * (n - 1)) / n);
  const maxW = 620;
  const minW = 220;
  const cx = 420;
  const out: SlideElement[] = [];
  d.items.forEach((it, i) => {
    const w = minW + ((maxW - minW) * i) / Math.max(n - 1, 1);
    const y = top + i * (levelH + 10);
    out.push(rect(cx - w / 2, y, w, levelH, t.accent, { cornerRadius: 8 }));
    out.push(text(cx - w / 2, y, w, levelH, it.label, 24, "#ffffff", { fontStyle: "bold", align: "center", verticalAlign: "middle" }));
    if (it.description) {
      out.push(text(cx + maxW / 2 + 40, y, SLIDE_W - MARGIN - (cx + maxW / 2 + 40), levelH, it.description, 20, t.text, { verticalAlign: "middle" }));
    }
  });
  return out;
}

function layoutDiagram(s: SlideSpec, t: Theme): SlideElement[] {
  const d: Diagram = s.diagram ?? { kind: "flow", items: [{ label: "A", description: "" }, { label: "B", description: "" }] };
  const body =
    d.kind === "cycle" ? diagramCycle(d, t)
    : d.kind === "grid" ? diagramGrid(d, t)
    : d.kind === "pyramid" ? diagramPyramid(d, t)
    : diagramFlow(d, t);
  return [...header(s.title, t), ...body];
}

export function compileSlide(spec: SlideSpec, themeId: string): Slide {
  const t = getTheme(themeId);
  const builders: Record<SlideSpec["layout"], (s: SlideSpec, t: Theme) => SlideElement[]> = {
    title: layoutTitle,
    section: layoutSection,
    bullets: layoutBullets,
    two_column: layoutTwoColumn,
    diagram: layoutDiagram,
    quote: layoutQuote,
    closing: layoutClosing,
  };
  return { id: uid(), background: t.background, elements: builders[spec.layout](spec, t) };
}

export function compileDeck(spec: DeckSpec, themeId: string): Deck {
  return { title: spec.title, themeId, slides: spec.slides.map((s) => compileSlide(s, themeId)) };
}

/** 空の新規スライド（箇条書きテンプレ） */
export function blankSlide(themeId: string): Slide {
  return compileSlide(
    { layout: "bullets", title: "新しいスライド", subtitle: "", bullets: ["ここに内容を入力"], left: null, right: null, diagram: null },
    themeId,
  );
}
