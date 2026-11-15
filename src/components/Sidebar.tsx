import { NAV_ITEMS, type NavItem, type PageId } from '@/nav';

interface SidebarProps {
  current: PageId;
  onNavigate: (page: PageId) => void;
}

export default function Sidebar({ current, onNavigate }: SidebarProps) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-neutral-200 bg-white px-3 py-6 dark:border-neutral-800 dark:bg-neutral-950 lg:block">
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item: NavItem) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-item ${active ? 'nav-item-active' : 'nav-item-inactive'}`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
