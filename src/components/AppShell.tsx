import type { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import type { PageId } from '@/nav';

interface AppShellProps {
  current: PageId;
  onNavigate: (page: PageId) => void;
  onSignOut: () => void;
  children: ReactNode;
}

export default function AppShell({ current, onNavigate, onSignOut, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Header onSignOut={onSignOut} />
      <div className="flex">
        <Sidebar current={current} onNavigate={onNavigate} />
        <main className="min-h-[calc(100vh-4rem)] flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10 lg:pt-8">
          <div className="mx-auto w-full max-w-4xl animate-fade-in">{children}</div>
        </main>
      </div>
      <MobileNav current={current} onNavigate={onNavigate} />
    </div>
  );
}
