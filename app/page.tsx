
"use client";

import Link from "next/link";

import {
  Bus,
  Users,
  Receipt,
  Calendar,
  ArrowRight,
  FileText,
  Lock,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white flex flex-col justify-between p-6 sm:p-10 font-sans">

      {/* HEADER PORTALE */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-todde p-3 rounded-2xl text-white shadow-lg shadow-todde/40">
            <Bus size={28} />
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase">
              TODDE BUS
            </h1>
            <p className="text-xs text-gray-400 font-medium">
              Portale Gestionale Integrato
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full text-xs text-gray-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Sistemi Operativi Online</span>
        </div>
      </header>

      {/* SEZIONE MODULI */}
      <main className="max-w-6xl mx-auto w-full my-auto py-12 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-black uppercase tracking-widest text-todde bg-rose-500/10 px-3.5 py-1.5 rounded-full border border-rose-500/20">
            Pannello di Controllo
          </span>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Scegli l'area a cui vuoi accedere
          </h2>

          <p className="text-sm sm:text-base text-gray-400">
            Seleziona il modulo operativo per avviare la sessione di lavoro
          </p>
        </div>

        {/* GRIGLIA MODULI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">

          {/* GESTIONE PERSONALE */}
          <Link
            href="/admin/employees"
            className="group relative bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-todde/60 rounded-3xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-todde/20 flex flex-col justify-between space-y-8"
          >
            <div className="flex items-start justify-between">
              <div className="p-4 bg-gradient-to-br from-rose-600 to-todde rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform">
                <Users size={32} />
              </div>

              <span className="text-xs font-bold text-gray-400 group-hover:text-white flex items-center gap-1 transition">
                Accedi
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </div>

            <div>
              <h3 className="text-2xl font-black text-white group-hover:text-rose-200 transition mb-2">
                Gestione Personale & Richieste
              </h3>

              <p className="text-sm text-gray-400 leading-relaxed">
                Approvazione ferie, gestione permessi, anagrafica autisti con sedi (TB, MTE, MTC) e calendario presenze della flotta.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-xs font-bold text-gray-400">
              <Calendar size={14} className="text-rose-400" />
              <span>Ferie • Permessi • Calendario • Notifiche</span>
            </div>
          </Link>

          {/* AMMINISTRAZIONE */}
          <Link
            href="/admin/expenses"
            className="group relative bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/60 rounded-3xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/20 flex flex-col justify-between space-y-8"
          >
            <div className="flex items-start justify-between">
              <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform">
                <Receipt size={32} />
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-white/10 text-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-full border border-white/15 flex items-center gap-1">
                  <Lock size={10} />
                  PIN RICHIESTO
                </span>

                <span className="text-xs font-bold text-gray-400 group-hover:text-white flex items-center gap-1 transition">
                  Accedi
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-black text-white group-hover:text-emerald-200 transition mb-2">
                Amministrazione & Note Spese
              </h3>

              <p className="text-sm text-gray-400 leading-relaxed">
                Lavagna controllo scontrini, gestione rimborsi, revisioni duplicate, fatturazione ed esportazione Excel per il commercialista.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-xs font-bold text-gray-400">
              <FileText size={14} className="text-emerald-400" />
              <span>Scontrini • Rimborsi • Revisioni • Export Excel</span>
            </div>
          </Link>
        </div>
      </main>

      {/* FOOTER AZIENDALE */}
      <footer className="max-w-6xl mx-auto w-full text-center py-4 border-t border-white/10 text-xs text-gray-500">
        <p>© 2026 Todde Bus S.r.l. • Tutti i diritti riservati</p>
      </footer>
    </div>
  );
}
