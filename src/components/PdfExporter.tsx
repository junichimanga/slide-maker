import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import { jsPDF } from "jspdf";
import { SlideCanvas } from "./SlideCanvas";
import { SLIDE_W, SLIDE_H } from "../types";
import type { Deck } from "../types";
import { loadImage } from "../imageCache";

interface Props {
  deck: Deck;
  onDone: (error?: string) => void;
}

/**
 * 画面外に全スライドを等倍で描画し、1枚ずつ画像化して PDF にまとめる。
 * マウント後に一度だけ走り、終わったら onDone を呼ぶ。
 */
export function PdfExporter({ deck, onDone }: Props) {
  const stages = useRef<(Konva.Stage | null)[]>([]);
  const started = useRef(false);

  // 画像要素を先に全部読み込んでから描画する（未読み込みだとPDFに出ない）
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const srcs = deck.slides.flatMap((s) => s.elements.filter((e) => e.type === "image").map((e) => (e as { src: string }).src));
    Promise.allSettled(srcs.map(loadImage)).then(() => setReady(true));
  }, [deck]);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    const raf = requestAnimationFrame(() => {
      try {
        const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [SLIDE_W, SLIDE_H], compress: true });
        deck.slides.forEach((_, i) => {
          const stage = stages.current[i];
          if (!stage) throw new Error(`スライド ${i + 1} を描画できませんでした`);
          const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: "image/jpeg", quality: 0.92 });
          if (i > 0) pdf.addPage([SLIDE_W, SLIDE_H], "landscape");
          pdf.addImage(dataUrl, "JPEG", 0, 0, SLIDE_W, SLIDE_H);
        });
        pdf.save((deck.title || "slides") + ".pdf");
        onDone();
      } catch (e) {
        onDone(e instanceof Error ? e.message : String(e));
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [ready, deck, onDone]);

  return (
    <div style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none" }} aria-hidden>
      {ready && deck.slides.map((s, i) => (
        <SlideCanvas key={s.id} slide={s} scale={1} stageRef={(st) => { stages.current[i] = st; }} />
      ))}
    </div>
  );
}
