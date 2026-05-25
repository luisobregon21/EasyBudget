"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteExpense } from "@/lib/actions/expenses";

interface Props {
  /** The visible row content (already includes its own padding + Link if desired). */
  children: React.ReactNode;
  /** Expense id to delete when the user taps the revealed Delete button. */
  expenseId: number;
  /** Optional ARIA description for the row (e.g. "Netflix · $12") */
  label?: string;
}

const REVEAL_WIDTH = 80; // px the row slides left to show the Delete button
const TRIGGER_THRESHOLD = 40; // px of drag needed to snap open

/**
 * Mobile-first swipe-to-delete wrapper.
 *
 * - Touch: drag left to reveal a red Delete button. Tap Delete to confirm.
 * - Desktop: the swipe layer doesn't mount (`md:hidden`) so the underlying row
 *   keeps its existing trashcan + link behavior unchanged.
 *
 * Vertical scroll isn't blocked: motion's `drag="x"` only consumes horizontal pan.
 */
export function SwipeableRow({ children, expenseId, label }: Props) {
  const x = useMotionValue(0);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fade in the Delete button only after the user has dragged enough to signal intent.
  const deleteOpacity = useTransform(x, [-REVEAL_WIDTH, -TRIGGER_THRESHOLD, 0], [1, 0.6, 0]);

  function handleDragEnd(_e: unknown, info: PanInfo) {
    if (info.offset.x < -TRIGGER_THRESHOLD) {
      setOpen(true);
      x.set(-REVEAL_WIDTH);
    } else {
      setOpen(false);
      x.set(0);
    }
  }

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      const result = await deleteExpense(expenseId);
      if (!result.success) {
        toast.error(result.message ?? "Failed to delete");
        setDeleting(false);
        setOpen(false);
        x.set(0);
        return;
      }
      toast.success("Expense deleted");
      // Leave the row hidden; the server-action revalidation will remove it.
    } catch {
      toast.error("Failed to delete");
      setDeleting(false);
      setOpen(false);
      x.set(0);
    }
  }

  function dismiss() {
    setOpen(false);
    x.set(0);
  }

  return (
    <div className="relative md:hidden">
      {/* Underlay: Delete button revealed when swiped */}
      <motion.button
        type="button"
        onClick={confirmDelete}
        disabled={deleting}
        aria-label={label ? `Delete ${label}` : "Delete"}
        className="absolute inset-y-0 right-0 flex items-center justify-center gap-1.5 bg-red-500/90 text-white text-xs font-bold rounded-r-lg px-3"
        style={{ width: REVEAL_WIDTH, opacity: deleteOpacity }}
      >
        <Trash2 size={14} />
        {deleting ? "…" : "Delete"}
      </motion.button>

      {/* Foreground: the row content, draggable horizontally */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
        dragElastic={0.05}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={handleDragEnd}
        onClick={open ? dismiss : undefined}
        className="relative bg-bg-deep"
      >
        {children}
      </motion.div>
    </div>
  );
}
