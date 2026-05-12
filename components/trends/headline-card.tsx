interface Props {
  text: string;
}

export function HeadlineCard({ text }: Props) {
  return (
    <section className="rounded-2xl bg-gradient-to-br from-violet-900/40 to-bg-deep border border-accent-purple/30 p-5">
      <p className="text-accent-gold text-[10px] uppercase tracking-widest font-bold mb-1">Headline</p>
      <p className="text-foreground text-xl font-bold leading-snug">{text}</p>
    </section>
  );
}
