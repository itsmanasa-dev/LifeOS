import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, GraduationCap, Flame, CheckSquare, User } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

const MainShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Home', icon: Home },
    { path: '/college', label: 'College', icon: GraduationCap },
    { path: '/govexam', label: 'Study', icon: Flame },
    { path: '/planner', label: 'Tasks', icon: CheckSquare },
    { path: '/settings', label: 'Profile', icon: User },
  ];

  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text-primary flex flex-col md:flex-row">
      {/* Sidebar for Desktop/Tablet */}
      <aside className="hidden md:flex md:w-64 flex-col bg-dark-surface border-r border-slate-800/50 p-6 glass">
        {/* Branding */}
        <div className="flex items-center space-x-3 mb-10 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="p-2 bg-primary/10 rounded-xl border border-accent/20">
            <Flame className="w-6 h-6 text-accent animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white m-0 leading-none">LifeOS</h1>
            <span className="text-[10px] text-dark-text-secondary font-semibold tracking-wider uppercase">Workspace</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const ActiveIcon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 border border-primary/20'
                    : 'text-dark-text-secondary hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <ActiveIcon className={`w-5 h-5 ${active ? 'text-white' : 'text-dark-text-secondary'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info in sidebar */}
        <div className="pt-6 border-t border-slate-800/50">
          <p className="text-xs text-dark-text-secondary font-medium">LifeOS React v1.0</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-24 md:pb-6">
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-dark-surface/85 backdrop-blur-lg border-t border-slate-800/50 flex justify-around items-center py-2 px-3 z-50 glass">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all duration-200"
            >
              <div
                className={`p-2 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-primary/20 text-accent'
                    : 'text-dark-text-secondary'
                }`}
              >
                <IconComponent className={`w-5 h-5 ${active ? 'text-accent' : 'text-dark-text-secondary'}`} />
              </div>
              <span
                className={`text-[10px] mt-0.5 font-bold tracking-tight transition-colors duration-200 ${
                  active ? 'text-accent' : 'text-dark-text-secondary'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default MainShell;
