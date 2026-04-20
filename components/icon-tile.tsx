import { cn } from "@/lib/utils";

export function IconTile({
  icon,
  gradient,
  size = "md",
}: {
  icon: string;
  gradient: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizing =
    size === "lg"
      ? "h-12 w-12 text-2xl rounded-2xl"
      : size === "sm"
        ? "h-7 w-7 text-sm rounded-lg"
        : "h-10 w-10 text-lg rounded-xl";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center bg-gradient-to-br",
        gradient,
        "inner-highlight shadow-[0_6px_20px_-8px_rgba(177,75,255,0.4)]",
        sizing,
      )}
    >
      {icon}
    </span>
  );
}
