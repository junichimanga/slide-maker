import { SlideCanvas } from "./SlideCanvas";
import type { Slide } from "../types";

interface Props {
  slides: Slide[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}

const THUMB_SCALE = 0.15;

export function SlideList({ slides, currentIndex, onSelect, onAdd, onDuplicate, onDelete, onMove }: Props) {
  return (
    <div className="slide-list">
      <div className="slide-list-tools">
        <button onClick={onAdd} title="スライドを追加">＋</button>
        <button onClick={onDuplicate} title="複製">⧉</button>
        <button onClick={() => onMove(-1)} disabled={currentIndex === 0} title="上へ">↑</button>
        <button onClick={() => onMove(1)} disabled={currentIndex >= slides.length - 1} title="下へ">↓</button>
        <button className="danger" onClick={onDelete} disabled={slides.length <= 1} title="削除">✕</button>
      </div>
      <div className="slide-list-items">
        {slides.map((s, i) => (
          <div key={s.id} className={"thumb" + (i === currentIndex ? " selected" : "")} onClick={() => onSelect(i)}>
            <span className="thumb-index">{i + 1}</span>
            <div className="thumb-canvas">
              <SlideCanvas slide={s} scale={THUMB_SCALE} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
