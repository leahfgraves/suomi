"use client";

interface StarsProps {
  count: 0 | 1 | 2 | 3;
  size?: "sm" | "md";
}

export function Stars({ count, size = "md" }: StarsProps) {
  const sz = size === "sm" ? "text-xs" : "text-sm";
  return (
    <div className={`flex gap-0.5 ${sz}`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= count ? "text-gold" : "text-surface"}>
          ★
        </span>
      ))}
    </div>
  );
}
