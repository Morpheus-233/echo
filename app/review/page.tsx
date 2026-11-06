import { ReviewSession } from "@/components/review-session";
import { requireAuth } from "@/lib/auth";
import { todayISO } from "@/lib/date";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  await requireAuth();
  const today = todayISO();
  const store = getStore();
  const [cards, counts] = await Promise.all([store.dueCards(today), store.counts(today)]);

  return (
    <div>
      {cards.length > 0 ? (
        <div className="mb-6 flex items-baseline justify-between gap-3 border-b border-rule/70 pb-3">
          <p className="label">Review</p>
          <p className="text-[11px] text-ink-faint">
            {cards.length} {cards.length === 1 ? "question" : "questions"} due
          </p>
        </div>
      ) : null}
      {/* Always mounted: finishing the last card must not unmount the summary. */}
      <ReviewSession cards={cards} hasNotes={counts.notes > 0} />
    </div>
  );
}
