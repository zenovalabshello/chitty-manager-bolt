import { NAV_ITEMS, type NavItem, type PageId } from '@/nav';

interface MobileNavProps {
  current: PageId;
  onNavigate: (page: PageId) => void;
}

export default function MobileNav({ current, onNavigate }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-neutral-200 bg-white/90 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/90 lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item: NavItem) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium transition-colors ${
                active
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-neutral-400 dark:text-neutral-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
