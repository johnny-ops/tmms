import { useState, useRef } from 'react';
import { Upload, X, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DocumentUploadProps {
  bucket: string;
  folderPath: string;
  onUploadSuccess: (url: string) => void;
  label?: string;
  accept?: string;
}

export function DocumentUpload({ bucket, folderPath, onUploadSuccess, label = 'Upload Document', accept = '.pdf,.jpg,.jpeg,.png' }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccess(false);
    setUploadProgress(10); // initial progress

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${folderPath}/${fileName}`;

      setUploadProgress(40);
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(80);

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      
      setUploadProgress(100);
      setSuccess(true);
      onUploadSuccess(data.publicUrl);
    } catch (err: any) {
      setError(err.message || 'Error uploading file');
    } finally {
      setTimeout(() => setIsUploading(false), 500);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
        {label}
      </label>
      
      <div 
        onClick={() => !isUploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${success ? '#22c55e' : error ? '#ef4444' : '#cbd5e1'}`,
          borderRadius: 8,
          padding: '24px 16px',
          textAlign: 'center',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          background: success ? '#f0fdf4' : error ? '#fef2f2' : '#f8fafc',
          transition: 'all 0.2s ease'
        }}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept={accept}
          disabled={isUploading}
        />
        
        {isUploading ? (
          <div>
            <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#3a65ae', width: `${uploadProgress}%`, transition: 'width 0.2s' }} />
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Uploading... {uploadProgress}%</p>
          </div>
        ) : success ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={24} color="#22c55e" />
            <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 500 }}>Upload complete!</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={20} color="#64748b" />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500, margin: 0 }}>
                Click to upload <span style={{ color: '#3a65ae' }}>or drag and drop</span>
              </p>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                {accept.replace(/\./g, '').toUpperCase()} (Max 5MB)
              </p>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: '0.75rem', marginTop: 8 }}>
          <X size={12} /> {error}
        </div>
      )}
    </div>
  );
}
