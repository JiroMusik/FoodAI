import { NavLink } from 'react-router-dom';
import { List, ScanLine, CalendarDays, Home, ShoppingCart, ChefHat } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Navigation() {
  const { t } = useTranslation();

  const navItems = [
    { path: '/dashboard', icon: Home, label: t('nav.dashboard') },
    { path: '/inventory', icon: List, label: t('nav.inventory') },
    { path: '/scanner', icon: ScanLine, label: t('nav.scanner') },
    { path: '/recipes', icon: ChefHat, label: t('nav.recipes') },
    { path: '/calendar', icon: CalendarDays, label: t('nav.calendar') },
    { path: '/shopping-list', icon: ShoppingCart, label: t('nav.shopping') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <Icon size={24} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
