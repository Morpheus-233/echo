export default function Loading() {
  return (
    <div className="rise animate-pulse">
      <div className="h-4 w-28 rounded bg-rule/50" />
      <div className="mt-4 h-10 w-72 rounded-lg bg-rule/40 sm:h-12 sm:w-96" />
      <div className="mt-4 h-4 w-80 rounded bg-rule/30" />

      <div className="mt-8 space-y-4">
        <div className="h-28 w-full rounded-2xl border border-rule/50 bg-paper-raised/60" />
        <div className="h-20 w-full rounded-xl border border-rule/40 bg-paper-raised/40" />
      </div>
    </div>
  );
}
