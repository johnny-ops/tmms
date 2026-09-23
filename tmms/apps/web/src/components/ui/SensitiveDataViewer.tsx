import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface SensitiveDataViewerProps {
  value: string;
  type?: 'phone' | 'email' | 'address' | 'id';
  fallback?: string;
  className?: string;
}

export function SensitiveDataViewer({ value, type = 'phone', fallback = '—', className = '' }: SensitiveDataViewerProps) {
  const [isVisible, setIsVisible] = useState(false);

  if (!value) return <span className={className}>{fallback}</span>;

  let maskedValue = value;

  if (type === 'phone' && value.length >= 10) {
    // Show first 4, last 2 (e.g., 0912****89)
    maskedValue = `${value.slice(0, 4)}${'*'.repeat(value.length - 6)}${value.slice(-2)}`;
  } else if (type === 'email' && value.includes('@')) {
    // Show first 3 chars of name, hide rest until @ (e.g., jua***@gmail.com)
    const [name, domain] = value.split('@');
    if (name.length > 3) {
      maskedValue = `${name.slice(0, 3)}***@${domain}`;
    } else {
      maskedValue = `${name.charAt(0)}***@${domain}`;
    }
  } else if (type === 'address') {
    // Hide details, show only general area or asterisks
    maskedValue = '*** (Protected Address) ***';
  } else {
    // Generic mask for IDs or short strings
    maskedValue = value.length > 4 ? `${'*'.repeat(value.length - 4)}${value.slice(-4)}` : '****';
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontFamily: type === 'phone' || type === 'id' ? 'monospace' : 'inherit' }}>
        {isVisible ? value : maskedValue}
      </span>
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        title={isVisible ? "Hide details" : "Show details"}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '2px', color: '#94a3b8', display: 'flex', alignItems: 'center'
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
      >
        {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}
