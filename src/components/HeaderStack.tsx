import TabNav from './TabNav';
import NewsTicker from './NewsTicker';

export default function HeaderStack() {
  return (
    <header 
      className="header-stack"
      style={{
        position: 'sticky',
        top: 'env(safe-area-inset-top, 0)',
        zIndex: 60,
        background: 'hsl(var(--background))',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
      }}
    >
      <TabNav />
      <NewsTicker />
    </header>
  );
}
