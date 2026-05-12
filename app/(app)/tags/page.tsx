import { getUserTags, countExpensesUsingTag } from "@/lib/actions/tags";
import { TagList } from "@/components/tags/tag-list";

export default async function TagsPage() {
  const tags = await getUserTags();
  // Fetch all counts in parallel; index by tag id.
  const counts = await Promise.all(tags.map((t) => countExpensesUsingTag(t.id)));
  const expenseCounts: Record<number, number> = {};
  tags.forEach((t, i) => { expenseCounts[t.id] = counts[i]; });

  const bucketCount = new Set(tags.map((t) => t.defaultBucket)).size;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h2 className="text-foreground text-xl font-bold">Tags</h2>
        <p className="text-muted-base text-sm">
          {tags.length} {tags.length === 1 ? "tag" : "tags"}
          {bucketCount > 0 && ` · ${bucketCount} ${bucketCount === 1 ? "bucket" : "buckets"}`}
          <span className="block">Manage what categories you spend in.</span>
        </p>
      </div>

      <TagList
        tags={tags.map((t) => ({
          id: t.id,
          name: t.name,
          emoji: t.emoji,
          defaultBucket: t.defaultBucket,
        }))}
        expenseCounts={expenseCounts}
      />
    </div>
  );
}
