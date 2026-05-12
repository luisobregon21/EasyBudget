"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { TagRow, type Tag } from "./tag-row";

interface Props {
  tags: Tag[];
  expenseCounts: Record<number, number>;
}

type EditingState = number | "new" | null;

export function TagList({ tags, expenseCounts }: Props) {
  const [editing, setEditing] = useState<EditingState>(null);

  return (
    <div className="space-y-3">
      {/* Add new tag */}
      {editing === "new" ? (
        <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 overflow-hidden">
          <TagRow mode="edit" tag={null} expenseCount={0} onDone={() => setEditing(null)} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-dashed border-accent-purple/30 text-muted-base hover:text-foreground hover:bg-white/[0.05] hover:border-accent-purple/50 transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm font-medium">Add new tag</span>
        </button>
      )}

      {/* Tag rows */}
      <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 divide-y divide-white/5">
        {tags.length === 0 ? (
          <p className="px-4 py-8 text-center text-muted-base text-sm">No tags yet. Add your first one above.</p>
        ) : (
          tags.map((tag) =>
            editing === tag.id ? (
              <TagRow
                key={tag.id}
                mode="edit"
                tag={tag}
                expenseCount={expenseCounts[tag.id] ?? 0}
                onDone={() => setEditing(null)}
              />
            ) : (
              <TagRow
                key={tag.id}
                mode="view"
                tag={tag}
                expenseCount={expenseCounts[tag.id] ?? 0}
                onEdit={() => setEditing(tag.id)}
              />
            ),
          )
        )}
      </div>
    </div>
  );
}
