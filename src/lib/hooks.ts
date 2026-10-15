"use client";

import { useEffect, useState } from "react";

/** 「〇分前」の表示を定期的に更新するための現在時刻 */
export function useNow(intervalMs = 60_000): Date {
  // 事前描画（プリレンダー）の時刻を残さないよう、表示後に現在時刻を入れる。
  // データの読み込みは表示後に始まるため、時刻を使う表示より先に更新される。
  const [now, setNow] = useState(() => new Date(0));
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
}
