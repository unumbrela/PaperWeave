"use client";

import { useRef } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { imageOptions } from "@/lib/cnn-explainer/config";

export interface ImagePickerProps {
  selected: string;
  onSelect: (file: string) => void;
  onCustomImage: (dataUrl: string) => void;
  disabled?: boolean;
  customImageUrl?: string | null;
}

export function ImagePicker({
  selected,
  onSelect,
  onCustomImage,
  disabled = false,
  customImageUrl,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onCustomImage(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {imageOptions.map((opt) => {
        const active = selected === opt.file;
        return (
          <button
            key={opt.file}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt.file)}
            title={opt.label}
            className={cn(
              "relative h-11 w-11 overflow-hidden rounded-md transition-all",
              "border-2",
              active
                ? "border-ink shadow-[0_6px_18px_-6px_rgba(26,23,19,0.35)]"
                : "border-[rgba(26,23,19,0.14)] hover:border-[rgba(26,23,19,0.35)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <Image
              src={`/cnn-explainer/assets/img/${opt.file}`}
              alt={opt.label}
              fill
              sizes="44px"
              className={cn(
                "object-cover transition-opacity",
                active ? "opacity-100" : "opacity-65",
              )}
            />
          </button>
        );
      })}

      {/* Custom upload */}
      <button
        type="button"
        disabled={disabled}
        onClick={pickFile}
        title="上传自定义图片"
        className={cn(
          "relative h-11 w-11 overflow-hidden rounded-md transition-all",
          "border-2 flex items-center justify-center",
          selected === "custom"
            ? "border-ink"
            : "border-[rgba(26,23,19,0.14)] hover:border-[rgba(26,23,19,0.35)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {customImageUrl && selected === "custom" ? (
          <Image
            src={customImageUrl}
            alt="custom"
            fill
            sizes="44px"
            className="object-cover"
          />
        ) : (
          <Plus className="h-4 w-4 text-ink-3" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
