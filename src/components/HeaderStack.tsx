import { useEffect } from 'react';
import TabNav from './TabNav';
import NewsTicker from './NewsTicker';

export default function HeaderStack() {
  const showTicker = true; // Control ticker visibility

  useEffect(() => {
    document.body.classList.toggle('has-ticker', showTicker);
    return () => document.body.classList.remove('has-ticker');
  }, [showTicker]);

  return (
    <header 
      className="site-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        background: 'hsl(var(--background))',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        paddingTop: 'env(safe-area-inset-top, 0)',
      }}
    >
      <TabNav />
      {showTicker && <NewsTicker />}
    </header>
  );
}
