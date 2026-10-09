import { compileDeck } from "./compile";
import type { Deck } from "./types";
import type { DeckSpec } from "./spec";

/** 初回起動時に表示するサンプル（APIキーなしでも編集を試せる） */
const SAMPLE_SPEC: DeckSpec = {
  title: "スライドメーカーの使い方",
  slides: [
    {
      layout: "title",
      title: "スライドメーカーの使い方",
      subtitle: "AIでベースを作り、あとから自由に編集する",
      bullets: [], left: null, right: null, diagram: null,
    },
    {
      layout: "diagram",
      title: "基本の流れ",
      subtitle: "",
      bullets: [], left: null, right: null,
      diagram: {
        kind: "flow",
        items: [
          { label: "テーマを入力", description: "右の「AI生成」タブに伝えたいことを書く" },
          { label: "AIが生成", description: "構成・文章・図解のベースができる" },
          { label: "手直し", description: "テキストや図形をドラッグして整える" },
          { label: "PDF書き出し", description: "上の「PDF書き出し」ボタンで保存" },
        ],
      },
    },
    {
      layout: "bullets",
      title: "編集でできること",
      subtitle: "",
      bullets: [
        "テキストをダブルクリックして書き換える",
        "四角・円・矢印を自由に動かす、大きさを変える",
        "図解の各パーツも個別に編集できる",
        "右のパネルで色や文字サイズを調整",
        "Ctrl+Z で元に戻す、Ctrl+Y でやり直す",
      ],
      left: null, right: null, diagram: null,
    },
    {
      layout: "two_column",
      title: "AIに任せること / 自分でやること",
      subtitle: "",
      bullets: [],
      left: { heading: "AIに任せる", bullets: ["全体の構成", "各スライドの文章", "図解の種類と中身"] },
      right: { heading: "自分でやる", bullets: ["言い回しの微調整", "レイアウトの好み", "強調したい箇所"] },
      diagram: null,
    },
    {
      layout: "diagram",
      title: "改善のサイクル",
      subtitle: "",
      bullets: [], left: null, right: null,
      diagram: {
        kind: "cycle",
        items: [
          { label: "生成する", description: "" },
          { label: "眺める", description: "" },
          { label: "直す", description: "" },
          { label: "書き出す", description: "" },
        ],
      },
    },
    {
      layout: "closing",
      title: "さっそく作ってみましょう",
      subtitle: "右の「AI生成」タブからどうぞ",
      bullets: [], left: null, right: null, diagram: null,
    },
  ],
};

export function sampleDeck(): Deck {
  return compileDeck(SAMPLE_SPEC, "clean");
}
