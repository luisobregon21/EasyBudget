"use client";
import { useState } from "react";
import { TagPicker } from "./tag-picker";
import { cn } from "@/lib/utils";
import { BUCKET_ICON } from "@/lib/icons";

type Tag = { id: number; name: string; emoji: string; defaultBucket: "savings" | "bills" | "wants" };
type Bucket = "savings" | "bills" | "wants";

const BUCKET_STYLES: Record<Bucket, string> = {
  savings: "bg-amber-500/15 border-amber-500/40 text-amber-400",
  bills:   "bg-pink-500/15 border-pink-500/40 text-pink-400",
  wants:   "bg-violet-500/15 border-violet-500/40 text-violet-400",
};

export function TagPickerWrapper({ tags, defaultTagId, defaultBucket }: { tags: Tag[]; defaultTagId?: number | null; defaultBucket?: Bucket }) {
  const [bucket, setBucket] = useState<Bucket>(defaultBucket ?? "wants");

  return (
    <div className="space-y-3">
      <TagPicker tags={tags} onBucketChange={setBucket} defaultTagId={defaultTagId} />
      <div className="space-y-1">
        <p className="text-muted-base text-[10px] uppercase tracking-widest">Budget bucket</p>
        <div className="flex gap-2">
          {(["savings", "bills", "wants"] as Bucket[]).map((b) => {
            const Icon = BUCKET_ICON[b];
            return (
              <button key={b} type="button" onClick={() => setBucket(b)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm border capitalize transition-colors inline-flex items-center gap-1.5",
                  bucket === b ? BUCKET_STYLES[b] : "bg-white/[0.04] border-accent-purple/20 text-muted-base"
                )}>
                <Icon size={16} />
                {b}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="bucket" value={bucket} />
      </div>
    </div>
  );
}
