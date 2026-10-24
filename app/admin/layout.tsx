"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  FileText, 
  Calendar, 
  BarChart3, 
  Lightbulb, 
  Bus 
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin/employees', label: 'Dipendenti', icon: Users },
    { href: '/admin/requests', label: 'Richieste', icon: FileText },
    { href: '/admin/calendar', label: 'Calendario', icon: Calendar },
    { href: '/admin/stats', label: 'Statistiche', icon: BarChart3 },
    { href: '/admin/help', label: 'Guida', icon: Lightbulb, isHelp: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* HEADER MODERNA STICKY CON SFUMATURA E VETRO */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#6e192a] via-[#852136] to-[#5b1423] text-white shadow-md border-b border-white/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* BRAND LOGO CON BADGE ADMIN */}
          <Link href="/admin/employees" className="flex items-center gap-3 group transition-transform hover:scale-[1.01]">
            <div className="bg-white/10 p-2.5 rounded-2xl border border-white/15 shadow-inner flex items-center justify-center group-hover:bg-white/20 transition">
              <Bus size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-wider uppercase">TODDE BUS</span>
                <span className="bg-white/15 text-rose-100 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-white/20 tracking-wider">
                  ADMIN
                </span>
              </div>
              <span className="text-[11px] text-white/70 font-medium block -mt-0.5">Pannello Gestionale</span>
            </div>
          </Link>

          {/* MENU DI NAVIGAZIONE A PILLOLE ATTIVE */}
          <nav className="flex flex-wrap items-center justify-center gap-1.5 bg-black/15 p-1.5 rounded-2xl border border-white/10 backdrop-blur-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-todde shadow-md scale-100'
                      : item.isHelp
                        ? 'text-yellow-300 hover:text-yellow-200 hover:bg-white/10'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={15} className={item.isHelp && !isActive ? 'text-yellow-300' : ''} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* CONTENUTO PRINCIPALE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}