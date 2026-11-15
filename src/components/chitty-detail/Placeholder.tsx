import { Users } from 'lucide-react';

export function Placeholder({
  icon: Icon,
  title,
  message,
}: {
  icon: typeof Users;
  title: string;
  message: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
        <Icon className="h-7 w-7" />
      </div>
      <div className="max-w-sm space-y-1.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
      </div>
    </div>
  );
}
