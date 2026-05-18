"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { User as UserIcon, Lock, ImagePlus, Trash2 } from "lucide-react";
import {
  updateProfileName,
  updateProfilePassword,
  updateProfileAvatar,
  removeProfileAvatar,
} from "@/lib/actions/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/image-compress";

interface Props {
  initialName: string;
  initialEmail: string;
  hasAvatar: boolean;
}

export function ProfileSection({ initialName, initialEmail, hasAvatar }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <UserIcon size={16} className="text-accent-purple-light" />
        <h3 className="text-foreground font-semibold">Profile</h3>
      </div>

      <AvatarBlock hasAvatar={hasAvatar} />
      <NameForm initialName={initialName} initialEmail={initialEmail} />
      <PasswordForm />
    </section>
  );
}

function AvatarBlock({ hasAvatar }: { hasAvatar: boolean }) {
  // Bump on save/remove so the <img> refetches the new avatar
  const [version, setVersion] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prev: unknown, fd: FormData) => {
      if (!file) return { success: false, message: "Pick an image first." };
      const compressed = await compressImage(file, { maxEdge: 512, quality: 0.85 });
      fd.set("avatar", compressed);
      return updateProfileAvatar(prev, fd);
    },
    undefined,
  );
  const toasted = useRef<typeof state>(undefined);

  useEffect(() => {
    if (!state || state === toasted.current) return;
    toasted.current = state;
    if (state.success) {
      toast.success(state.message);
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setVersion((v) => v + 1);
    } else {
      toast.error(state.message);
    }
  }, [state, preview]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pickFile(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleRemove() {
    setRemoving(true);
    const result = await removeProfileAvatar();
    setRemoving(false);
    if (result.success) {
      toast.success(result.message);
      setVersion((v) => v + 1);
    } else {
      toast.error(result.message);
    }
  }

  const showCurrent = hasAvatar && !preview;
  const currentSrc = showCurrent ? `/api/avatar?v=${version}` : null;

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-3">
      <Label className="text-muted-base text-[10px] uppercase tracking-widest">Avatar</Label>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-bg-deep border border-accent-purple/20 flex items-center justify-center shrink-0">
          {preview ? (
            <img src={preview} alt="avatar preview" className="w-full h-full object-cover" />
          ) : currentSrc ? (
            <img src={currentSrc} alt="current avatar" className="w-full h-full object-cover" />
          ) : (
            <UserIcon size={24} className="text-muted-base" />
          )}
        </div>
        <form action={formAction} className="flex-1 flex flex-wrap items-center gap-2">
          <label className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-deep border border-accent-purple/20 cursor-pointer hover:border-accent-purple/40 transition-colors">
            <ImagePlus size={14} className="text-muted-base shrink-0" />
            <span className="text-muted-base text-xs truncate">
              {file ? file.name : "Choose a photo"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {file && (
            <Button
              type="submit"
              disabled={pending}
              className="bg-gradient-brand text-white font-bold text-xs px-3 py-2 h-auto"
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          )}
          {hasAvatar && !file && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="text-muted-base hover:text-red-400 transition-colors p-2 disabled:opacity-50"
              aria-label="Remove avatar"
            >
              <Trash2 size={14} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function NameForm({ initialName, initialEmail }: { initialName: string; initialEmail: string }) {
  const [name] = useState(initialName);
  const [state, formAction, pending] = useActionState(updateProfileName, undefined);
  const toasted = useRef<typeof state>(undefined);
  useEffect(() => {
    if (!state || state === toasted.current) return;
    toasted.current = state;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-3">
      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Name</Label>
        <Input
          name="name"
          defaultValue={name}
          required
          className="bg-bg-deep border-accent-purple/20 text-foreground"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Email</Label>
        <p className="text-foreground text-sm font-mono break-all">{initialEmail}</p>
      </div>
      <Button type="submit" disabled={pending} className="bg-gradient-brand text-white font-bold">
        {pending ? "Saving…" : "Save Name"}
      </Button>
    </form>
  );
}

function PasswordForm() {
  const [state, formAction, pending] = useActionState(updateProfilePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const toasted = useRef<typeof state>(undefined);

  useEffect(() => {
    if (!state || state === toasted.current) return;
    toasted.current = state;
    if (state.success) {
      toast.success(state.message);
      formRef.current?.reset();
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl bg-white/[0.03] border border-accent-purple/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Lock size={14} className="text-muted-base" />
        <p className="text-foreground font-medium text-sm">Change Password</p>
      </div>
      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Current</Label>
        <Input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="bg-bg-deep border-accent-purple/20 text-foreground"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">New</Label>
        <Input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="bg-bg-deep border-accent-purple/20 text-foreground"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-muted-base text-[10px] uppercase tracking-widest">Confirm New</Label>
        <Input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="bg-bg-deep border-accent-purple/20 text-foreground"
        />
      </div>
      <Button type="submit" disabled={pending} className="bg-gradient-brand text-white font-bold">
        {pending ? "Updating…" : "Update Password"}
      </Button>
    </form>
  );
}
