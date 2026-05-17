import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  tone?: "neutral" | "good" | "bad" | "warn";
  size?: "sm" | "md";
  className?: string;
}

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "bg-accent-purple/10 text-accent-purple-light",
  good:    "bg-emerald-500/10 text-emerald-400",
  bad:     "bg-red-500/10 text-red-400",
  warn:    "bg-amber-500/10 text-amber-400",
};

export function IconTile({ icon: Icon, tone = "neutral", size = "sm", className = "" }: Props) {
  const box = size === "md" ? "w-9 h-9" : "w-[30px] h-[30px]";
  const pixelSize = size === "md" ? 16 : 14;
  return (
    <div className={`${box} rounded-[10px] flex items-center justify-center shrink-0 ${TONE[tone]} ${className}`}>
      <Icon size={pixelSize} />
    </div>
  );
}
