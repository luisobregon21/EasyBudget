"use client";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BucketChip } from "./bucket-chip";
import { DeleteTagButton } from "./delete-tag-button";
import { createTag, updateTag } from "@/lib/actions/tags";

type Bucket = "savings" | "bills" | "wants";

export interface Tag {
  id: number;
  name: string;
  emoji: string;
  defaultBucket: Bucket;
}

interface ViewProps {
  mode: "view";
  tag: Tag;
  expenseCount: number;
  onEdit: () => void;
}

interface EditProps {
  mode: "edit";
  tag: Tag | null;     // null = creating a new tag
  expenseCount: number;
  onDone: () => void;
}

type Props = ViewProps | EditProps;

export function TagRow(props: Props) {
  if (props.mode === "view") return <ViewRow {...props} />;
  return <EditRow {...props} />;
}

function ViewRow({ tag, expenseCount, onEdit }: ViewProps) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <button
        type="button"
        onClick={onEdit}
        className="flex-1 flex items-center gap-3 min-w-0 text-left"
      >
        <span className="text-xl">{tag.emoji}</span>
        <span className="text-foreground font-medium truncate">{tag.name}</span>
        <BucketChip bucket={tag.defaultBucket} />
      </button>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${tag.name}`}
        className="p-2 text-muted-base hover:text-foreground transition-colors"
      >
        <Pencil size={16} />
      </button>
      <DeleteTagButton tagId={tag.id} tagName={tag.name} expenseCount={expenseCount} />
    </div>
  );
}

function EditRow({ tag, onDone }: EditProps) {
  const isCreate = tag === null;
  const action = isCreate ? createTag : updateTag.bind(null, tag.id);
  const [state, formAction, pending] = useActionState(action, undefined);
  const toastedState = useRef<typeof state>(undefined);

  useEffect(() => {
    if (!state || state === toastedState.current) return;
    toastedState.current = state;
    if (state.success) {
      toast.success(state.message);
      onDone();
    } else {
      toast.error(state.message);
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="px-4 py-4 space-y-3 bg-white/[0.02]">
      <div className="flex gap-3">
        <div className="w-16 space-y-1">
          <Label htmlFor="emoji" className="text-muted-base text-[10px] uppercase tracking-widest">Emoji</Label>
          <Input
            id="emoji"
            name="emoji"
            defaultValue={tag?.emoji ?? "🏷️"}
            maxLength={4}
            className="bg-bg-deep border-accent-purple/20 text-foreground text-center text-lg"
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor="name" className="text-muted-base text-[10px] uppercase tracking-widest">Name</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={tag?.name ?? ""}
            placeholder="e.g. Coffee"
            className="bg-bg-deep border-accent-purple/20 text-foreground"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Bucket</Label>
        <div className="flex gap-2">
          {(["savings", "wants", "bills"] as Bucket[]).map((b) => (
            <BucketRadio key={b} bucket={b} defaultSelected={tag?.defaultBucket ?? "wants"} />
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" onClick={onDone} variant="ghost" className="text-muted-base">
          Cancel
        </Button>
        <Button type="submit" disabled={pending} className="bg-gradient-brand text-white font-bold">
          {pending ? "Saving…" : isCreate ? "Create" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function BucketRadio({ bucket, defaultSelected }: { bucket: Bucket; defaultSelected: Bucket }) {
  const id = `bucket-${bucket}`;
  return (
    <label htmlFor={id} className="cursor-pointer">
      <input
        type="radio"
        id={id}
        name="defaultBucket"
        value={bucket}
        defaultChecked={bucket === defaultSelected}
        className="peer sr-only"
      />
      <div className="peer-checked:ring-2 peer-checked:ring-accent-purple peer-checked:ring-offset-1 peer-checked:ring-offset-bg-deep rounded-full">
        <BucketChip bucket={bucket} size="md" />
      </div>
    </label>
  );
}
