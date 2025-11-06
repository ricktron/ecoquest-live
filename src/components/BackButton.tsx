import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackButton() {
  const navigate = useNavigate();
  
  return (
    <button 
      onClick={() => navigate(-1)} 
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background text-sm hover:bg-accent transition-colors" 
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}
