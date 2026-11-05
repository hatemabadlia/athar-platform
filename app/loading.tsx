export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5" aria-busy="true" aria-label="جارٍ التحميل">
      <div className="h-40 rounded-3xl skeleton" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        <div className="h-[420px] rounded-3xl skeleton" />
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-2xl skeleton" />)}</div>
      </div>
    </div>
  );
}
