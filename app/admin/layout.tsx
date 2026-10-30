
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Users,
  FileText,
  Calendar,
  BarChart3,
  Lightbulb,
  Bus,
  LayoutGrid,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Riconosce l'area amministrazione note spese
  const isExpenseAdmin = pathname.startsWith("/admin/expenses");

  // Menu gestione personale
  const navItems = [
    {
      href: "/admin/employees",
      label: "Dipendenti",
      icon: Users,
    },
    {
      href: "/admin/requests",
      label: "Richieste",
      icon: FileText,
    },
    {
      href: "/admin/calendar",
      label: "Calendario",
      icon: Calendar,
    },
    {
      href: "/admin/stats",
      label: "Statistiche",
      icon: BarChart3,
    },
    {
      href: "/admin/help",
      label: "Guida",
      icon: Lightbulb,
      isHelp: true,
    },
  ];

  // Uscita dall'area amministrativa
  const handleExitToPortal = () => {
    sessionStorage.removeItem("todde_expense_auth");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50/50">

      {/* HEADER PRINCIPALE - NON STICKY */}
      <header className="relative z-10 bg-gradient-to-r from-[#6e192a] via-[#852136] to-[#5b1423] text-white shadow-sm">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

            {/* IDENTITA' TODDE BUS */}
            <div className="flex items-center justify-between gap-3">

              <button
                type="button"
                onClick={handleExitToPortal}
                className="flex items-center gap-3 text-left group min-w-0"
                title="Torna al Portale Principale"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <Bus size={24} className="text-white" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg sm:text-xl font-black tracking-wider uppercase leading-tight">
                      TODDE BUS
                    </span>

                    <span className="text-[9px] sm:text-[10px] font-bold tracking-wide bg-white/10 border border-white/15 text-rose-100 rounded-full px-2 py-0.5">
                      {isExpenseAdmin
                        ? "CONTABILITÀ"
                        : "HR & PERSONALE"}
                    </span>
                  </div>

                  <p className="text-[11px] sm:text-xs text-white/65 mt-1 font-medium">
                    {isExpenseAdmin
                      ? "Amministrazione Note Spese"
                      : "Pannello Gestionale Richieste"}
                  </p>
                </div>
              </button>

              {/* PULSANTE PORTALE MOBILE */}
              <button
                type="button"
                onClick={handleExitToPortal}
                className="lg:hidden shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 border border-white/15 hover:bg-white/20 transition"
                title="Torna al Portale"
                aria-label="Torna al Portale"
              >
                <LayoutGrid size={19} />
              </button>
            </div>

            {/* NAVIGAZIONE */}
            {isExpenseAdmin ? (

              /* MENU CONTABILITA' */
              <div className="flex items-center justify-between lg:justify-end gap-3 border-t border-white/10 pt-4 lg:border-0 lg:pt-0">

                <div className="flex items-center gap-2 text-xs font-semibold text-rose-100/80">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Area Amministrazione</span>
                </div>

                <button
                  type="button"
                  onClick={handleExitToPortal}
                  className="hidden lg:flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-white/15 transition"
                >
                  <LayoutGrid size={16} />
                  <span>Torna al Portale</span>
                </button>
              </div>

            ) : (

              /* MENU HR */
              <div className="w-full lg:w-auto">

                {/* MENU MOBILE: SEMPRE VISIBILE */}
                <nav
                  className="grid grid-cols-3 gap-2 lg:hidden border-t border-white/10 pt-4"
                  aria-label="Navigazione gestione personale"
                >
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`
                          flex flex-col items-center justify-center
                          gap-1.5 min-h-[70px] px-1 py-3
                          rounded-xl border text-center
                          transition-all duration-200
                          ${
                            isActive
                              ? "bg-white text-[#6e192a] border-white shadow-sm"
                              : item.isHelp
                              ? "bg-white/5 text-yellow-300 border-white/10 hover:bg-white/10"
                              : "bg-white/5 text-white/85 border-white/10 hover:bg-white/10"
                          }
                        `}
                      >
                        <Icon
                          size={20}
                          className={
                            item.isHelp && !isActive
                              ? "text-yellow-300"
                              : ""
                          }
                        />

                        <span className="text-[11px] font-bold leading-tight">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </nav>

                {/* MENU DESKTOP */}
                <nav
                  className="hidden lg:flex items-center gap-1 bg-black/15 border border-white/10 rounded-2xl p-1.5"
                  aria-label="Navigazione gestione personale"
                >
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`
                          flex items-center gap-2
                          px-3.5 py-2.5 rounded-xl
                          text-xs font-bold whitespace-nowrap
                          transition-all duration-200
                          ${
                            isActive
                              ? "bg-white text-[#6e192a] shadow-sm"
                              : item.isHelp
                              ? "text-yellow-300 hover:bg-white/10"
                              : "text-white/80 hover:text-white hover:bg-white/10"
                          }
                        `}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

              </div>
            )}

            {/* PULSANTE PORTALE DESKTOP */}
            {!isExpenseAdmin && (
              <button
                type="button"
                onClick={handleExitToPortal}
                className="hidden lg:flex shrink-0 w-11 h-11 items-center justify-center rounded-xl bg-white/10 border border-white/15 hover:bg-white/20 transition"
                title="Torna al Portale"
                aria-label="Torna al Portale"
              >
                <LayoutGrid size={19} />
              </button>
            )}

          </div>
        </div>
      </header>

      {/* CONTENUTO DELLE PAGINE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

    </div>
  );
}
