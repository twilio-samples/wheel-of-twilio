export function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-6 py-4 min-w-[160px]">
      <div className="text-sm text-[#c3c2b7]">{label}</div>
      <div className="text-3xl font-semibold text-white">{value}</div>
    </div>
  );
}
