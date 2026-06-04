'use client';
import { useState, useEffect } from 'react';

interface Toast { id: number; message: string; type: 'success' | 'error' | 'saving'; }

let _id = 0;
export function toast(message: string, type: Toast['type'] = 'success') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type, id: ++_id } }));
}

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function handler(e: Event) {
      const t = (e as CustomEvent).detail as Toast;
      setToasts(prev => [...prev.slice(-4), t]);
      if (t.type !== 'saving') {
        setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3000);
      }
    }
    window.addEventListener('app:toast', handler);
    return () => window.removeEventListener('app:toast', handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${
            t.type === 'success' ? 'bg-[#27AE60]'
            : t.type === 'error'  ? 'bg-red-500'
            : 'bg-[#0F172A]'
          }`}
        >
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : '⟳'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
