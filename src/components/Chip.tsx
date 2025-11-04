import { cn } from '@/lib/utils';

type ChipProps = {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary';
  title?: string;
};

export default function Chip({ children, className, variant = 'default', title }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        variant === 'primary' && 'bg-primary/10 text-primary',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground',
        variant === 'default' && 'bg-muted text-muted-foreground',
        className
      )}
      title={title}
    >
      {children}
    </span>
  );
}
