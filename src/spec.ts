import { z } from "zod";

/**
 * AI が返すスライドの「構造」。座標は含めない。
 * 座標やサイズは compile.ts のレイアウトテンプレートが決める。
 */
export const DiagramItemSchema = z.object({
  label: z.string().describe("図解の要素名。短く（15文字以内）"),
  description: z.string().describe("補足説明。1文、30文字以内。不要なら空文字"),
});

export const DiagramSchema = z.object({
  kind: z
    .enum(["flow", "cycle", "grid", "pyramid"])
    .describe("flow=手順や流れ, cycle=循環, grid=並列な要素の整理, pyramid=階層"),
  items: z.array(DiagramItemSchema).min(2).max(6),
});

export const ColumnSchema = z.object({
  heading: z.string(),
  bullets: z.array(z.string()).min(1).max(4),
});

export const SlideSpecSchema = z.object({
  layout: z
    .enum(["title", "section", "bullets", "two_column", "diagram", "quote", "closing"])
    .describe(
      "title=表紙, section=章扉, bullets=箇条書き, two_column=2カラム比較, diagram=図解, quote=強調メッセージ, closing=締め",
    ),
  title: z.string().describe("スライドのタイトル。25文字以内"),
  subtitle: z.string().describe("title/section/closing/quote で使うサブテキスト。不要なら空文字"),
  bullets: z.array(z.string()).max(6).describe("bullets レイアウト用。各40文字以内。不要なら空配列"),
  left: ColumnSchema.nullable().describe("two_column の左カラム。不要なら null"),
  right: ColumnSchema.nullable().describe("two_column の右カラム。不要なら null"),
  diagram: DiagramSchema.nullable().describe("diagram レイアウト用。不要なら null"),
});

export const DeckSpecSchema = z.object({
  title: z.string().describe("資料全体のタイトル"),
  slides: z.array(SlideSpecSchema).min(1).max(20),
});

export type DiagramItem = z.infer<typeof DiagramItemSchema>;
export type Diagram = z.infer<typeof DiagramSchema>;
export type SlideSpec = z.infer<typeof SlideSpecSchema>;
export type DeckSpec = z.infer<typeof DeckSpecSchema>;

export interface GenerateRequest {
  topic: string;
  slideCount: number;
  extra?: string;
}
