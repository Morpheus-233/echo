import Link from "next/link";
import { daysInMonth, mondayIndex, monthKey } from "@/lib/date";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function Calendar({
  month,
  counts,
  selected,
  today,
}: {
  month: string;
  counts: Record<string, number>;
  selected: string | null;
  today: string;
}) {
  const [year, monthNumber] = month.split("-").map(Number);
  const total = daysInMonth(year, monthNumber);
  const offset = mondayIndex(`${month}-01`);
  const currentMonth = monthKey(today);

  const cells: Array<number | null> = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 pb-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) return <div key={`blank-${index}`} />;

          const iso = `${month}-${String(day).padStart(2, "0")}`;
          const count = counts[iso] ?? 0;
          const isSelected = selected === iso;
          const isToday = iso === today;
          const isFuture = iso > today;

          return (
            <Link
              key={iso}
              href={`/journal?m=${month}&d=${iso}`}
              aria-label={`${day}, ${count} ${count === 1 ? "note" : "notes"}`}
              className={[
                "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition",
                isSelected
                  ? "bg-ink text-paper"
                  : count > 0
                    ? "bg-paper-raised text-ink hover:bg-paper-deep"
                    : "text-ink-faint hover:bg-paper-deep/60",
                isFuture ? "opacity-45" : "",
                isToday && !isSelected ? "ring-1 ring-accent/60" : "",
              ].join(" ")}
            >
              <span className={count > 0 ? "font-medium" : ""}>{day}</span>
              {count > 0 ? (
                <span
                  className={`mt-0.5 text-[9px] leading-none ${
                    isSelected ? "text-paper/70" : "text-accent"
                  }`}
                >
                  {count > 1 ? `● ${count}` : "●"}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {selected === today && currentMonth === month ? (
        <p className="mt-3 text-[11px] text-ink-faint">Today is outlined.</p>
      ) : null}
    </div>
  );
}
