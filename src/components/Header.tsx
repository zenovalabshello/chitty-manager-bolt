import { Moon, Sun, LogOut } from 'lucide-react';
import Logo from './Logo';
import { useTheme } from '@/theme/ThemeProvider';

interface HeaderProps {
  onSignOut: () => void;
}

export default function Header({ onSignOut }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-base font-semibold tracking-tight">Chitty Manager</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          <button
            onClick={onSignOut}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
