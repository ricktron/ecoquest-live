import React from 'react';

export function InfoPopover({ text }: { text: string }) {
  return (
    <details className="relative inline-block ml-2 align-middle">
      <summary className="cursor-pointer select-none rounded-full border border-border px-2 text-xs leading-6 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
        i
      </summary>
      <div className="absolute z-50 mt-2 w-64 rounded-xl border border-border bg-popover p-3 text-sm shadow-lg text-popover-foreground">
        {text}
      </div>
    </details>
  );
}
