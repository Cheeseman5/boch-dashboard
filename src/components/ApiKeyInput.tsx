import { useState } from 'react';
import { Eye, EyeOff, Key, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export type ApiHeaderType = 'key' | 'user';

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  headerType: ApiHeaderType;
  onHeaderTypeChange: (type: ApiHeaderType) => void;
}

export function ApiKeyInput({ 
  value, 
  onChange, 
  onSubmit, 
  isLoading,
  headerType,
  onHeaderTypeChange,
}: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit();
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const handleToggle = (checked: boolean) => {
    onHeaderTypeChange(checked ? 'user' : 'key');
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Header type toggle row */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">API Key</Label>
        <div className="flex items-center gap-2">
          <Label 
            htmlFor="header-type-toggle" 
            className={`text-xs cursor-pointer ${headerType === 'key' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
          >
            X-RapidAPI-Key
          </Label>
          <Switch
            id="header-type-toggle"
            checked={headerType === 'user'}
            onCheckedChange={handleToggle}
          />
          <Label 
            htmlFor="header-type-toggle" 
            className={`text-xs cursor-pointer ${headerType === 'user' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
          >
            X-RapidAPI-User
          </Label>
        </div>
      </div>

      {/* Input field */}
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
