"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * 统一表单基元 —— 复刻首页搜索框的精致度（.surface 同源玻璃感 + .focus-ring +
 * 暖纸边）。各工具页/论文库/检索页此前各自手写一长串 Tailwind，统一收到这里。
 *
 * 视觉锚点见 app/globals.css：--paper-2 / --line / --line-strong / .focus-ring。
 */
const baseField = cn(
  "focus-ring w-full rounded-xl border border-line bg-paper-2/80 px-4 py-3",
  "text-[13px] text-ink placeholder:text-ink-4 outline-none transition-colors",
  "hover:border-line-strong focus:border-line-strong",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

/** 字段标签 —— 统一用 .overline（JetBrains Mono 小字距上标）。 */
export function FieldLabel({
  children,
  className,
  htmlFor,
  hint,
}: {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("overline mb-2 block", className)}>
      {children}
      {hint && <span className="ml-2 font-sans normal-case tracking-normal text-ink-4">{hint}</span>}
    </label>
  );
}

export const TextField = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function TextField({ className, ...props }, ref) {
  return <input ref={ref} className={cn(baseField, className)} {...props} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { mono?: boolean }
>(function Textarea({ className, mono, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(baseField, "resize-y leading-relaxed", mono && "font-mono", className)}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(baseField, "cursor-pointer pr-9", className)} {...props}>
      {children}
    </select>
  );
});
