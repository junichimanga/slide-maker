export const SLIDE_W = 1280;
export const SLIDE_H = 720;

export interface BaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  fill: string;
  fontStyle: "normal" | "bold" | "italic" | "bold italic";
  align: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
  lineHeight?: number;
}

export interface RectElement extends BaseElement {
  type: "rect";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

export interface EllipseElement extends BaseElement {
  type: "ellipse";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

/** 矢印: (x,y) が始点、(x+width, y+height) が終点 */
export interface ArrowElement extends BaseElement {
  type: "arrow";
  stroke: string;
  strokeWidth: number;
}

export interface ImageElement extends BaseElement {
  type: "image";
  /** 画像のURL（/images/xxx.png など） */
  src: string;
  opacity?: number;
}

export type SlideElement = TextElement | RectElement | EllipseElement | ArrowElement | ImageElement;

export interface Slide {
  id: string;
  background: string;
  elements: SlideElement[];
}

export interface Deck {
  title: string;
  themeId: string;
  slides: Slide[];
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
