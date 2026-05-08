"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Tag = { id: number; name: string; emoji: string; defaultBucket: "savings" | "bills" | "wants" };

export function TagPicker({ tags, onBucketChange }: {
  tags: Tag[];
  onBucketChange?: (bucket: "savings" | "bills" | "wants") => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  function select(tag: Tag) {
    setSelected(tag.id);
    onBucketChange?.(tag.defaultBucket);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name="tagId" value={selected ?? ""} />
      {tags.map((tag) => (
        <button key={tag.id} type="button" onClick={() => select(tag)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm border transition-colors",
            selected === tag.id
              ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
              : "bg-white/[0.04] border-accent-purple/20 text-muted-base hover:text-foreground"
          )}>
          {tag.emoji} {tag.name}
        </button>
      ))}
    </div>
  );
}
