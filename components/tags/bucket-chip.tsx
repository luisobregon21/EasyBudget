type Bucket = "savings" | "bills" | "wants";

const STYLES: Record<Bucket, { label: string; emoji: string; bg: string; border: string; text: string }> = {
  savings: { label: "Savings",  emoji: "💰", bg: "bg-amber-500/15",  border: "border-amber-500/30",  text: "text-amber-400"  },
  bills:   { label: "Bills",    emoji: "🏦", bg: "bg-pink-500/15",   border: "border-pink-500/30",   text: "text-pink-400"   },
  wants:   { label: "Personal", emoji: "✨", bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-400" },
};

interface Props {
  bucket: Bucket;
  size?: "sm" | "md";
}

export function BucketChip({ bucket, size = "sm" }: Props) {
  const s = STYLES[bucket];
  const sizeClass = size === "md" ? "text-xs px-2.5 py-1" : "text-[10px] px-2 py-0.5";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-bold ${sizeClass} ${s.bg} ${s.border} ${s.text}`}>
      <span>{s.emoji}</span>{s.label}
    </span>
  );
}
