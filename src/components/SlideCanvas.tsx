import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Ellipse, Text, Arrow, Transformer, Circle, Image as KonvaImage } from "react-konva";
import Konva from "konva";
import { SLIDE_W, SLIDE_H } from "../types";
import type { Slide, SlideElement, ImageElement } from "../types";
import { getCachedImage, loadImage } from "../imageCache";

export const FONT_FAMILY = '"Yu Gothic", "Meiryo", "Hiragino Sans", "Noto Sans JP", sans-serif';

/** 画像要素。読み込み前は薄いプレースホルダを出す。 */
function SlideImage({ el, handlers }: { el: ImageElement; handlers: Record<string, unknown> }) {
  const [img, setImg] = useState<HTMLImageElement | undefined>(() => getCachedImage(el.src));
  useEffect(() => {
    let alive = true;
    const cached = getCachedImage(el.src);
    if (cached) {
      setImg(cached);
      return;
    }
    setImg(undefined);
    loadImage(el.src).then((i) => { if (alive) setImg(i); }).catch(() => {});
    return () => { alive = false; };
  }, [el.src]);

  if (!img) {
    return (
      <Rect
        id={el.id} x={el.x} y={el.y} width={el.width} height={el.height} rotation={el.rotation ?? 0}
        fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} dash={[8, 6]}
        {...handlers}
      />
    );
  }
  return (
    <KonvaImage
      id={el.id} image={img}
      x={el.x} y={el.y} width={el.width} height={el.height} rotation={el.rotation ?? 0}
      opacity={el.opacity ?? 1}
      {...handlers}
    />
  );
}

interface Props {
  slide: Slide;
  scale: number;
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (id: string, patch: Partial<SlideElement>) => void;
  onEditText?: (id: string) => void;
  stageRef?: (stage: Konva.Stage | null) => void;
}

export function SlideCanvas({ slide, scale, editable = false, selectedId, onSelect, onChange, onEditText, stageRef }: Props) {
  const stage = useRef<Konva.Stage | null>(null);
  const transformer = useRef<Konva.Transformer | null>(null);

  // 選択中の要素に Transformer を付ける（矢印は除外）
  useEffect(() => {
    const tr = transformer.current;
    const st = stage.current;
    if (!tr || !st) return;
    const selected = selectedId ? slide.elements.find((e) => e.id === selectedId) : null;
    if (selected && selected.type !== "arrow") {
      const node = st.findOne("#" + selectedId);
      tr.nodes(node ? [node] : []);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, slide]);

  const patch = (id: string, p: Partial<SlideElement>) => onChange?.(id, p);

  const commonHandlers = (el: SlideElement) =>
    editable
      ? {
          draggable: true,
          onClick: () => onSelect?.(el.id),
          onTap: () => onSelect?.(el.id),
          onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
            const node = e.target;
            if (el.type === "ellipse") {
              patch(el.id, { x: node.x() - el.width / 2, y: node.y() - el.height / 2 });
            } else {
              patch(el.id, { x: node.x(), y: node.y() });
            }
          },
          onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
            const node = e.target;
            const sx = node.scaleX();
            const sy = node.scaleY();
            node.scaleX(1);
            node.scaleY(1);
            const width = Math.max(20, node.width() * sx);
            const height = Math.max(20, node.height() * sy);
            if (el.type === "ellipse") {
              patch(el.id, { x: node.x() - width / 2, y: node.y() - height / 2, width, height, rotation: node.rotation() });
            } else {
              patch(el.id, { x: node.x(), y: node.y(), width, height, rotation: node.rotation() });
            }
          },
        }
      : {};

  const renderElement = (el: SlideElement) => {
    switch (el.type) {
      case "rect":
        return (
          <Rect
            key={el.id} id={el.id}
            x={el.x} y={el.y} width={el.width} height={el.height} rotation={el.rotation ?? 0}
            fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth ?? 0} cornerRadius={el.cornerRadius ?? 0}
            {...commonHandlers(el)}
          />
        );
      case "ellipse":
        return (
          <Ellipse
            key={el.id} id={el.id}
            x={el.x + el.width / 2} y={el.y + el.height / 2}
            radiusX={el.width / 2} radiusY={el.height / 2} rotation={el.rotation ?? 0}
            fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth ?? 0}
            {...commonHandlers(el)}
          />
        );
      case "text":
        return (
          <Text
            key={el.id} id={el.id}
            x={el.x} y={el.y} width={el.width} height={el.height} rotation={el.rotation ?? 0}
            text={el.text} fontSize={el.fontSize} fontFamily={FONT_FAMILY} fontStyle={el.fontStyle}
            fill={el.fill} align={el.align} verticalAlign={el.verticalAlign} lineHeight={el.lineHeight ?? 1.25}
            wrap="word"
            onDblClick={editable ? () => onEditText?.(el.id) : undefined}
            onDblTap={editable ? () => onEditText?.(el.id) : undefined}
            {...commonHandlers(el)}
          />
        );
      case "image":
        return <SlideImage key={el.id} el={el} handlers={commonHandlers(el)} />;
      case "arrow":
        return (
          <Arrow
            key={el.id} id={el.id}
            x={el.x} y={el.y} points={[0, 0, el.width, el.height]}
            stroke={el.stroke} fill={el.stroke} strokeWidth={el.strokeWidth}
            pointerLength={14} pointerWidth={14} hitStrokeWidth={24}
            {...commonHandlers(el)}
          />
        );
    }
  };

  const selectedEl = selectedId ? slide.elements.find((e) => e.id === selectedId) : null;
  const selectedArrow = selectedEl && selectedEl.type === "arrow" ? selectedEl : null;
  const keepRatio = selectedEl?.type === "image";

  return (
    <Stage
      ref={(s) => {
        stage.current = s;
        stageRef?.(s);
      }}
      width={SLIDE_W * scale}
      height={SLIDE_H * scale}
      scaleX={scale}
      scaleY={scale}
      listening={editable}
      onMouseDown={(e) => {
        if (e.target === e.target.getStage() || e.target.name() === "background") onSelect?.(null);
      }}
    >
      <Layer>
        <Rect name="background" x={0} y={0} width={SLIDE_W} height={SLIDE_H} fill={slide.background} />
        {slide.elements.map(renderElement)}
        {editable && (
          <Transformer
            ref={(t) => { transformer.current = t; }}
            rotateEnabled
            keepRatio={keepRatio}
            enabledAnchors={keepRatio ? ["top-left", "top-right", "bottom-left", "bottom-right"] : undefined}
            anchorSize={10}
            borderStroke="#2f80ed"
            anchorStroke="#2f80ed"
            boundBoxFunc={(oldBox, newBox) => (newBox.width < 20 || newBox.height < 20 ? oldBox : newBox)}
          />
        )}
        {editable && selectedArrow && selectedArrow.type === "arrow" && (
          <>
            <Circle
              x={selectedArrow.x} y={selectedArrow.y} radius={9} fill="#ffffff" stroke="#2f80ed" strokeWidth={2}
              draggable
              onDragEnd={(e) => {
                const nx = e.target.x(), ny = e.target.y();
                const endX = selectedArrow.x + selectedArrow.width;
                const endY = selectedArrow.y + selectedArrow.height;
                patch(selectedArrow.id, { x: nx, y: ny, width: endX - nx, height: endY - ny });
              }}
            />
            <Circle
              x={selectedArrow.x + selectedArrow.width} y={selectedArrow.y + selectedArrow.height}
              radius={9} fill="#ffffff" stroke="#2f80ed" strokeWidth={2}
              draggable
              onDragEnd={(e) => {
                patch(selectedArrow.id, { width: e.target.x() - selectedArrow.x, height: e.target.y() - selectedArrow.y });
              }}
            />
          </>
        )}
      </Layer>
    </Stage>
  );
}
