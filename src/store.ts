import { useCallback, useEffect, useRef, useState } from "react";
import type { Deck } from "./types";

const STORAGE_KEY = "slide-maker:deck";

export function loadSavedDeck(): Deck | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Deck;
    if (!parsed || !Array.isArray(parsed.slides)) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface History {
  past: Deck[];
  present: Deck;
  future: Deck[];
}

/**
 * 元に戻す / やり直し付きのデッキ状態。
 * coalesceKey を渡すと、同じキーの連続した変更（文字入力など）は1つの履歴にまとまる。
 */
export function useDeckHistory(initial: Deck) {
  const [history, setHistory] = useState<History>({ past: [], present: initial, future: [] });
  const lastCoalesce = useRef<{ key: string; time: number } | null>(null);

  const update = useCallback((updater: (deck: Deck) => Deck, coalesceKey?: string) => {
    const now = Date.now();
    const merge =
      !!coalesceKey &&
      lastCoalesce.current !== null &&
      lastCoalesce.current.key === coalesceKey &&
      now - lastCoalesce.current.time < 1500;
    lastCoalesce.current = coalesceKey ? { key: coalesceKey, time: now } : null;

    setHistory((h) => {
      const next = updater(h.present);
      if (next === h.present) return h;
      if (merge) return { ...h, present: next, future: [] };
      return { past: [...h.past.slice(-99), h.present], present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    lastCoalesce.current = null;
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] };
    });
  }, []);

  const redo = useCallback(() => {
    lastCoalesce.current = null;
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const [next, ...rest] = h.future;
      return { past: [...h.past, h.present], present: next, future: rest };
    });
  }, []);

  // 自動保存
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history.present));
      } catch {
        /* 容量超過などは無視 */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [history.present]);

  return {
    deck: history.present,
    update,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
