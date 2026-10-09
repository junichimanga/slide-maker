import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { DeckSpecSchema, type DeckSpec, type GenerateRequest } from "../src/spec";

const SYSTEM_PROMPT = `あなたはプロのプレゼンテーション設計者です。ユーザーが指定したテーマから、日本語のスライド資料の構成を作ります。

ルール:
- 1枚目は必ず layout "title"（表紙）、最後は "closing"。
- 中身は "bullets" ばかりにせず、"diagram"（流れ・循環・分類・階層）や "two_column"（比較・Before/After）、"quote"（強調したい一文）を積極的に混ぜる。
- 内容が複数の章に分かれるなら "section" で区切る。
- 文章は短く。タイトル25文字以内、箇条書きは1項目40文字以内、図解のラベルは15文字以内。
- 図解の kind は内容に合わせて選ぶ: 手順や時系列は flow、繰り返しは cycle、並列の要素は grid、階層や優先度は pyramid。
- 使わないフィールドは、文字列なら空文字、配列なら空配列、オブジェクトなら null にする。
- 具体的で読み手の役に立つ内容にする。抽象的な一般論で埋めない。`;

export async function generateDeck(
  apiKey: string,
  req: GenerateRequest,
): Promise<{ spec: DeckSpec; usage: unknown }> {
  if (!req.topic || !req.topic.trim()) throw new Error("テーマが空です");
  const count = Math.min(Math.max(Number(req.slideCount) || 8, 3), 20);
  const client = new Anthropic({ apiKey });

  const userText = [
    `テーマ: ${req.topic.trim()}`,
    `スライド枚数: ${count}枚（表紙と締めを含む）`,
    req.extra?.trim() ? `補足・要望: ${req.extra.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userText }],
    output_config: { format: betaZodOutputFormat(DeckSpecSchema), effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });

  if (response.stop_reason === "refusal") {
    throw new Error("このテーマは生成を断られました。別の表現で試してください。");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("出力が長すぎて途中で切れました。枚数を減らして試してください。");
  }
  const spec = response.parsed_output;
  if (!spec) throw new Error("AIの応答を解析できませんでした。もう一度試してください。");
  return { spec, usage: response.usage };
}
