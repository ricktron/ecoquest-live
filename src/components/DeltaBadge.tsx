export default function DeltaBadge({delta}:{delta?: number}) {
  if (delta === undefined || delta === null || delta === 0) return null;
  const up = delta > 0;
  return (
    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${up ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
      {up ? "▲" : "▼"} {Math.abs(delta)}
    </span>
  );
}
