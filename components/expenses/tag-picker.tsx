"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { tagIcon } from "@/lib/icons";

type Tag = { id: number; name: string; emoji: string | null; defaultBucket: "savings" | "bills" | "wants" };

export function TagPicker({ tags, onBucketChange, defaultTagId }: {
  tags: Tag[];
  onBucketChange?: (bucket: "savings" | "bills" | "wants") => void;
  defaultTagId?: number | null;
}) {
  const [selected, setSelected] = useState<number | null>(defaultTagId ?? null);

  function select(tag: Tag) {
    setSelected(tag.id);
    onBucketChange?.(tag.defaultBucket);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name="tagId" value={selected ?? ""} />
      {tags.map((tag) => {
        const Icon = tagIcon(tag.name);
        return (
          <button key={tag.id} type="button" onClick={() => select(tag)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm border transition-colors inline-flex items-center gap-1.5",
              selected === tag.id
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                : "bg-white/[0.04] border-accent-purple/20 text-muted-base hover:text-foreground"
            )}>
            {tag.emoji ? <span>{tag.emoji}</span> : <Icon size={14} />}
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
