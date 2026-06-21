"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { LegacySample } from "@/lib/med-seg/types";

interface Props {
  samples: LegacySample[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function SampleGallery({ samples, selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {samples.map((s, idx) => {
        const active = s.id === selectedId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            title={`#${idx + 1} · Dice ${s.dice.toFixed(3)}`}
            className={cn(
              "relative h-12 w-12 overflow-hidden rounded-md transition-all border-2",
              active
                ? "border-ink shadow-[0_6px_18px_-6px_rgba(26,23,19,0.35)]"
                : "border-[rgba(26,23,19,0.14)] hover:border-[rgba(26,23,19,0.4)]",
            )}
          >
            <Image
              src={s.thumb}
              alt={s.id}
              fill
              sizes="48px"
              placeholder="blur"
              blurDataURL={s.blur.input}
              className={cn(
                "object-cover transition-opacity",
                active ? "opacity-100" : "opacity-65",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
