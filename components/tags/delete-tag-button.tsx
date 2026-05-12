"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteTag } from "@/lib/actions/tags";

interface Props {
  tagId: number;
  tagName: string;
  expenseCount: number;
}

export function DeleteTagButton({ tagId, tagName, expenseCount }: Props) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    const msg = expenseCount > 0
      ? `Delete "${tagName}"? ${expenseCount} past expense${expenseCount === 1 ? "" : "s"} will become Untagged.`
      : `Delete "${tagName}"?`;
    if (!confirm(msg)) return;
    startTransition(async () => {
      const result = await deleteTag(tagId);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={`Delete ${tagName}`}
      className="p-2 text-muted-base hover:text-red-400 transition-colors disabled:opacity-50"
    >
      <Trash2 size={16} />
    </button>
  );
}
