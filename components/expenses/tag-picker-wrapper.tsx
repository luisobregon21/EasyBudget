"use client";
import { useState } from "react";
import { TagPicker } from "./tag-picker";
import { cn } from "@/lib/utils";

type Tag = { id: number; name: string; emoji: string; defaultBucket: "savings" | "bills" | "wants" };
type Bucket = "savings" | "bills" | "wants";

const BUCKET_STYLES: Record<Bucket, string> = {
  savings: "bg-amber-500/15 border-amber-500/40 text-amber-400",
  bills:   "bg-pink-500/15 border-pink-500/40 text-pink-400",
  wants:   "bg-violet-500/15 border-violet-500/40 text-violet-400",
};

export function TagPickerWrapper({ tags }: { tags: Tag[] }) {
  const [bucket, setBucket] = useState<Bucket>("wants");

  return (
    <div className="space-y-3">
      <TagPicker tags={tags} onBucketChange={setBucket} />
      <div className="space-y-1">
        <p className="text-muted-base text-[10px] uppercase tracking-widest">Budget bucket</p>
        <div className="flex gap-2">
          {(["savings", "bills", "wants"] as Bucket[]).map((b) => (
            <button key={b} type="button" onClick={() => setBucket(b)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm border capitalize transition-colors",
                bucket === b ? BUCKET_STYLES[b] : "bg-white/[0.04] border-accent-purple/20 text-muted-base"
              )}>
              {b}
            </button>
          ))}
        </div>
        <input type="hidden" name="bucket" value={bucket} />
      </div>
    </div>
  );
}
