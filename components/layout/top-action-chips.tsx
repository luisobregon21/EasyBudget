"use client";
import { useState } from "react";
import { Bell, MoreHorizontal } from "lucide-react";
import { MoreSheet } from "./more-sheet";

export function TopActionChips() {
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <>
      <button aria-label="Notifications" className="w-9 h-9 rounded-full border border-accent-purple/20 text-muted-base flex items-center justify-center">
        <Bell size={14} />
      </button>
      <button aria-label="More" onClick={() => setMoreOpen(true)} className="w-9 h-9 rounded-full border border-accent-purple/20 text-muted-base flex items-center justify-center">
        <MoreHorizontal size={14} />
      </button>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
