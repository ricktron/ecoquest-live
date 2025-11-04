export default function DeltaBadge({delta}:{delta?: number}) {
  if (delta === undefined || delta === null || delta === 0) return null;
  const up = delta > 0;
  return (
    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${up ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200" : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"}`}>
      {up ? "▲" : "▼"} {Math.abs(delta)}
    </span>
  );
}
