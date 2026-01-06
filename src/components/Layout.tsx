import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, ScanBarcode, FileText, Ticket } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/setup', label: 'Box Setup', icon: Settings },
  { path: '/', label: 'Scan Tickets', icon: ScanBarcode },
  { path: '/summary', label: 'Daily Summary', icon: FileText },
];

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-2 border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-xl p-2">
                <Ticket className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Scratch-Off Counter</h1>
                <p className="text-sm text-muted-foreground">Ticket Inventory System</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 py-3">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};
