"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { tagIcon } from "@/lib/icons";

type Tag = { id: number; name: string; emoji: string | null; defaultBucket: "savings" | "bills" | "wants" };

export function TagPicker({
  tags,
  onBucketChange,
  defaultTagId,
  suggestedTagId,
  onSelectionChange,
}: {
  tags: Tag[];
  onBucketChange?: (bucket: "savings" | "bills" | "wants") => void;
  defaultTagId?: number | null;
  /** When set and the user hasn't touched the picker, the picker shows this tag as selected. */
  suggestedTagId?: number | null;
  /** Notify parent of effective selection (after suggestion or manual pick). */
  onSelectionChange?: (tagId: number | null) => void;
}) {
  const [selected, setSelected] = useState<number | null>(defaultTagId ?? null);
  const [userTouched, setUserTouched] = useState(false);
  const lastNotified = useRef<number | null>(selected);

  // When a suggestion arrives and the user hasn't picked anything yet, adopt it.
  useEffect(() => {
    if (userTouched) return;
    if (suggestedTagId == null) return;
    if (suggestedTagId === selected) return;
    setSelected(suggestedTagId);
    const tag = tags.find((t) => t.id === suggestedTagId);
    if (tag) onBucketChange?.(tag.defaultBucket);
  }, [suggestedTagId, userTouched, tags, onBucketChange, selected]);

  // Notify parent only when the *effective* selection changes.
  useEffect(() => {
    if (lastNotified.current === selected) return;
    lastNotified.current = selected;
    onSelectionChange?.(selected);
  }, [selected, onSelectionChange]);

  function select(tag: Tag) {
    setUserTouched(true);
    setSelected(tag.id);
    onBucketChange?.(tag.defaultBucket);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name="tagId" value={selected ?? ""} />
      {tags.map((tag) => {
        const Icon = tagIcon(tag.name);
        const isSelected = selected === tag.id;
        const isSuggested = !userTouched && suggestedTagId === tag.id;
        return (
          <button key={tag.id} type="button" onClick={() => select(tag)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm border transition-colors inline-flex items-center gap-1.5",
              isSelected
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                : "bg-white/[0.04] border-accent-purple/20 text-muted-base hover:text-foreground",
              isSuggested && !userTouched && "ring-1 ring-amber-400/40",
            )}>
            {tag.emoji ? <span>{tag.emoji}</span> : <Icon size={14} />}
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
