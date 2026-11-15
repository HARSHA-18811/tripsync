import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { initials } from '@/lib/util';

export const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <label className="block"><span className="label">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-navy/50">{hint}</span>}</label>
);
export const PageHeader = ({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{sub && <p className="mt-1 text-sm text-navy/60">{sub}</p>}</div>{action}
  </div>
);
export const Empty = ({ title, text, action }: { title: string; text: string; action?: ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-10 text-center">
    <p className="font-medium">{title}</p><p className="mx-auto mt-1 max-w-sm text-sm text-navy/60">{text}</p>{action && <div className="mt-4">{action}</div>}
  </div>
);
export const Stat = ({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: 'bad' | 'good' }) => (
  <div className="card"><p className="text-xs text-navy/60">{label}</p>
    <p className={`mt-1 text-xl font-semibold ${tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-teal' : ''}`}>{value}</p>
    {sub && <p className="mt-0.5 text-xs text-navy/50">{sub}</p>}</div>
);
export const Avatar = ({ name }: { name: string }) => (
  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand" title={name}>{initials(name)}</span>
);
export const Bar = ({ pct, tone = 'brand' }: { pct: number; tone?: 'brand' | 'teal' | 'red' }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-black/5" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
    <div className={`h-full rounded-full ${tone === 'red' ? 'bg-red-500' : tone === 'teal' ? 'bg-teal' : 'bg-brand'}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
  </div>
);
export const Cover = ({ name, url, className = 'h-32' }: { name: string; url?: string; className?: string }) => (
  <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-navy via-brand to-teal ${className}`}>
    {url && <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />}
    <span className="absolute bottom-2 left-3 text-sm font-semibold text-white drop-shadow">{name}</span>
  </div>
);
export const Alert = ({ tone = 'warn', children }: { tone?: 'warn' | 'bad' | 'info' | 'good'; children: ReactNode }) => {
  const c = { warn: 'bg-amber-50 text-amber-900 border-amber-200', bad: 'bg-red-50 text-red-800 border-red-200', info: 'bg-violet-50 text-violet-900 border-violet-200', good: 'bg-teal/10 text-teal border-teal/30' }[tone];
  return <div role="alert" className={`rounded-xl border px-3 py-2 text-sm ${c}`}>{children}</div>;
};

export const Modal = ({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`relative w-full ${maxWidth} max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-3.5 bg-sand/30">
          <h3 className="text-base font-semibold text-navy">{title}</h3>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close dialog"
            className="rounded-lg p-1 text-navy/50 hover:bg-black/5 hover:text-navy transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
};
