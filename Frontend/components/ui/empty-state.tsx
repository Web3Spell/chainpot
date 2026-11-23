import type { LucideIcon } from 'lucide-react';

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
      <Icon className="h-10 w-10 text-cp-muted" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-bold">{title}</p>
        <p className="text-sm text-cp-muted max-w-sm">{body}</p>
      </div>
      {action}
    </div>
  );
}
