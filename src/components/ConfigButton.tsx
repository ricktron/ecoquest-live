import { useState, useEffect } from 'react';
import ConfigModal from './ConfigModal';
import { supabase } from '@/lib/supabaseClient';

export default function ConfigButton() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if admin token matches config_filters.flags.admin_token
    const checkAdminAccess = async () => {
      const localToken = localStorage.getItem('admin_token');
      if (!localToken) {
        setVisible(false);
        return;
      }

      const { data } = await supabase()
        .from('config_filters' as any)
        .select('flags')
        .eq('id', true)
        .single();

      const adminToken = (data?.flags as any)?.admin_token;
      setVisible(localToken === adminToken);
    };

    checkAdminAccess();
  }, []);

  if (!visible) return null;

  return (
    <>
      <button className="cfg__btn" onClick={() => setOpen(true)} aria-label="Open configuration">
        Config
      </button>
      <ConfigModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
