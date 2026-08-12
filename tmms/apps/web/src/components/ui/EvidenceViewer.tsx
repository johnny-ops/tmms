import { ExternalLink } from 'lucide-react';

interface EvidenceViewerProps {
  url: string;
  alt?: string;
  className?: string;
}

export function EvidenceViewer({ url, alt = 'Evidence', className = '' }: EvidenceViewerProps) {
  if (!url) return null;

  const getFileType = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'ogg'].includes(ext)) return 'video';
    if (ext === 'pdf') return 'pdf';
    return 'unknown';
  };

  const type = getFileType(url);

  if (type === 'image') {
    return (
      <img 
        src={url} 
        alt={alt} 
        className={className} 
        style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #e2e8f0', objectFit: 'contain' }}
      />
    );
  }

  if (type === 'video') {
    return (
      <video 
        src={url} 
        controls 
        className={className}
        style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #e2e8f0' }}
      />
    );
  }

  return (
    <div className={className} style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem', color: '#1e293b' }}>
        {url.split('/').pop()}
      </div>
      <a 
        href={url} 
        target="_blank" 
        rel="noreferrer" 
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#3a65ae', fontWeight: 600, textDecoration: 'none' }}
      >
        View <ExternalLink size={14} />
      </a>
    </div>
  );
}
