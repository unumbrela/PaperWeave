"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * 统一按钮基元 —— 三种态对齐既有视觉语言：
 *  - primary：.cta-gradient（暖→冷渐变，主行动）
 *  - outline：暖纸描边胶囊（次行动，对齐 handoff-controls 的按钮风）
 *  - ghost：无边框、hover 浅底（工具栏/图标动作）
 * 尺寸 sm/md。需要渲染成链接时用 buttonClasses() 拼到 <Link className>。
 */
export type ButtonVariant = "primary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md";

const sizeCls: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-[12px] gap-1.5",
  md: "px-5 py-2.5 text-[14px] gap-2",
};

const variantCls: Record<ButtonVariant, string> = {
  primary: "cta-gradient font-medium",
  outline:
    "border border-line bg-paper-2/70 text-ink-2 font-medium hover:border-line-strong hover:text-ink",
  ghost:
    "text-ink-2 hover:text-ink hover:bg-[rgba(26,23,19,0.04)]",
};

export function buttonClasses(
  variant: ButtonVariant = "outline",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center rounded-full transition-all focus-ring",
    "disabled:cursor-not-allowed disabled:opacity-40",
    sizeCls[size],
    variantCls[variant],
    className,
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }
>(function Button({ variant = "outline", size = "md", className, ...props }, ref) {
  return <button ref={ref} className={buttonClasses(variant, size, className)} {...props} />;
});
