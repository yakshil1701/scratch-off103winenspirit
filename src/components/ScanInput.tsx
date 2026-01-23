import { useRef, useEffect, useState, KeyboardEvent, ChangeEvent } from 'react';
import { ScanBarcode } from 'lucide-react';
import { StateCode } from '@/types/settings';

interface ScanInputProps {
  onScan: (barcode: string) => void;
  disabled?: boolean;
  stateCode?: StateCode;
}

export const ScanInput = ({ onScan, disabled = false, stateCode = 'MD' }: ScanInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  // Keep input focused at all times
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current && !disabled) {
        inputRef.current.focus();
      }
    };

    focusInput();
    
    // Refocus on window focus, click, and periodically
    window.addEventListener('focus', focusInput);
    window.addEventListener('click', focusInput);
    const interval = setInterval(focusInput, 1000);

    return () => {
      window.removeEventListener('focus', focusInput);
      window.removeEventListener('click', focusInput);
      clearInterval(interval);
    };
  }, [disabled]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      onScan(value.trim());
      setValue('');
      // Ensure focus remains
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Allow numeric input and dashes for DC format
    const cleanedValue = stateCode === 'DC'
      ? e.target.value.replace(/[^0-9-]/g, '')
      : e.target.value.replace(/\D/g, '');
    setValue(cleanedValue);
  };

  const placeholder = stateCode === 'DC'
    ? 'Scan barcode (e.g., 1619-04147-7-017)...'
    : 'Scan scratch-off ticket barcode...';

  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2">
        <ScanBarcode className="w-8 h-8 text-primary" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="scan-input w-full pl-16 pr-4 bg-card text-foreground placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
    </div>
  );
};
