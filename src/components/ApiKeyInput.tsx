import { useState } from 'react';
import { Eye, EyeOff, Key, X } from 'lucide-react';
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

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="relative">
        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type={showKey ? 'text' : 'password'}
          placeholder="Your X-RapidApi-Key or X-RapidApi-User key"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-16 bg-input border-border font-mono text-sm"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear API key"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
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
