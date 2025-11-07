import { useState } from 'react';
import ConfigModal from './ConfigModal';

export default function ConfigButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="cfg__btn" onClick={() => setOpen(true)} aria-label="Open configuration">
        Config
      </button>
      <ConfigModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
