import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import Button from './Button';
import { cn } from '../../utils/cn';

interface NotFoundStateProps {
  title?: string;
  message?: string;
  className?: string;
  showBackButton?: boolean;
}

const NotFoundState: React.FC<NotFoundStateProps> = ({ 
  title = "Page Not Found", 
  message = "The item you're looking for might have been moved or deleted in the meantime.",
  className,
  showBackButton = true
}) => {
  const navigate = useNavigate();

  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[60vh] p-8 text-center", className)}>
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-accent/10 blur-3xl rounded-full scale-150" />
        <div className="relative bg-bg-2 border border-border p-6 rounded-2xl shadow-sm">
          <FileQuestion className="h-12 w-12 text-accent" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-font-1 mb-2">{title}</h2>
      <p className="text-font-2 max-w-md mb-8 leading-relaxed">
        {message}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3">
        {showBackButton && (
          <Button variant="secondary" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        )}
        <Button onClick={() => navigate('/')} className="gap-2">
          <Home className="h-4 w-4" />
          Return Home
        </Button>
      </div>
    </div>
  );
};

export default NotFoundState;
