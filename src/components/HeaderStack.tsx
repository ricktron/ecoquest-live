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
    <header className="site-header">
      <TabNav />
      {showTicker && (
        <div className="app-ticker">
          <NewsTicker />
        </div>
      )}
    </header>
  );
}
