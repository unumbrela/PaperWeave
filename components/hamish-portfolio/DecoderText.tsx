"use client";

import { memo, useEffect, useRef } from "react";
import { useSpring } from "framer-motion";

const GLYPHS = [
  "ア","イ","ウ","エ","オ","カ","キ","ク","ケ","コ",
  "サ","シ","ス","セ","ソ","タ","チ","ツ","テ","ト",
  "ナ","ニ","ヌ","ネ","ノ","ハ","ヒ","フ","ヘ","ホ",
  "マ","ミ","ム","メ","モ","ヤ","ユ","ヨ","ー",
  "ラ","リ","ル","レ","ロ","ワ","ヰ","ヱ","ヲ","ン",
  "ガ","ギ","グ","ゲ","ゴ","ザ","ジ","ズ","ゼ","ゾ",
  "ダ","ヂ","ヅ","デ","ド","バ","ビ","ブ","ベ","ボ",
  "パ","ピ","プ","ペ","ポ",
];

type Char =
  | { type: "glyph"; value: string }
  | { type: "value"; value: string };

function shuffle(content: string[], output: Char[], position: number): Char[] {
  return content.map((value, index) => {
    if (index < position) return { type: "value", value };
    if (position % 1 < 0.5) {
      const rand = Math.floor(Math.random() * GLYPHS.length);
      return { type: "glyph", value: GLYPHS[rand] };
    }
    return { type: "glyph", value: output[index]?.value ?? value };
  });
}

type Props = {
  text: string;
  delay?: number;
  className?: string;
};

export const DecoderText = memo(function DecoderText({
  text,
  delay: startDelay = 0,
  className,
}: Props) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const output = useRef<Char[]>([{ type: "glyph", value: "" }]);
  const spring = useSpring(0, { stiffness: 8, damping: 5 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const content = text.split("");

    const render = () => {
      container.innerHTML = output.current
        .map(
          (c) =>
            `<span class="hamish-decoder-${c.type}">${c.value}</span>`,
        )
        .join("");
    };

    const unsub = spring.on("change", (value: number) => {
      output.current = shuffle(content, output.current, value);
      render();
    });

    const timer = window.setTimeout(() => {
      spring.set(content.length);
    }, startDelay);

    return () => {
      unsub?.();
      window.clearTimeout(timer);
    };
  }, [spring, startDelay, text]);

  return (
    <span className={className}>
      <span className="hamish-sr-only">{text}</span>
      <span aria-hidden ref={containerRef} />
    </span>
  );
});
