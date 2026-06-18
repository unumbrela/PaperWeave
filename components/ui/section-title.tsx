import { cn } from "@/lib/utils";

/**
 * 区块标题 —— 复刻首页 "The Collection" 样式：serif 主标 + serif-italic 前缀 +
 * 右侧 .overline 计数/眉标。统一各内页此前零散的标题写法。
 */
export function SectionTitle({
  prefix,
  children,
  meta,
  size = "md",
  className,
}: {
  /** 斜体前缀词，如 "The" */
  prefix?: React.ReactNode;
  children: React.ReactNode;
  /** 右侧眉标/计数（.overline 风格） */
  meta?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeCls =
    size === "lg"
      ? "text-[28px] sm:text-[34px]"
      : size === "sm"
        ? "text-[18px] sm:text-[20px]"
        : "text-[22px] sm:text-[26px]";
  return (
    <div className={cn("flex items-baseline justify-between gap-4", className)}>
      <h2 className={cn("serif tracking-tight text-ink", sizeCls)}>
        {prefix && <span className="serif-italic text-ink-2">{prefix} </span>}
        {children}
      </h2>
      {meta != null && <span className="overline shrink-0">{meta}</span>}
    </div>
  );
}
