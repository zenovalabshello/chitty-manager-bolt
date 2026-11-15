import { LayoutDashboard, Wallet, BarChart3, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PageId = 'dashboard' | 'chitties' | 'reports' | 'profile' | 'chitty-detail';

export interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'chitties', label: 'My Chitties', icon: Wallet },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'profile', label: 'Profile', icon: User },
];
