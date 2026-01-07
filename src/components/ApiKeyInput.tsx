import { useState } from 'react';
import { Eye, EyeOff, Key } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
}

export function ApiKeyInput({ value, onChange, onSubmit, isLoading }: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);

  const maskedKey = value.length > 5 
    ? '•'.repeat(value.length - 5) + value.slice(-5)
    : value;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="relative">
        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type={showKey ? 'text' : 'password'}
          placeholder="Enter your RapidAPI key"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 bg-input border-border font-mono text-sm"
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <Button 
        onClick={onSubmit} 
        disabled={!value.trim() || isLoading}
        className="w-full"
      >
        {isLoading ? 'Loading...' : 'Connect'}
      </Button>
    </div>
  );
}
