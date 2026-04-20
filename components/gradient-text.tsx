import { cn } from "@/lib/utils";

export function GradientText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-gradient-to-r from-[#ff4f8b] via-[#b14bff] to-[#4b8bff] bg-clip-text text-transparent",
        className,
      )}
    >
      {children}
    </span>
  );
}
