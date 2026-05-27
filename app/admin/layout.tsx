import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="bg-todde text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">
            TODDE BUS <span className="text-xs font-normal block text-gray-200">Pannello Admin</span>
          </h1>
          <nav className="flex flex-wrap justify-center gap-2 text-sm">
            <Link href="/admin/employees" className="px-3 py-2 hover:bg-todde-dark rounded-md transition">
              Dipendenti
            </Link>
            <Link href="/admin/requests" className="px-3 py-2 hover:bg-todde-dark rounded-md transition">
              Richieste
            </Link>
            <Link href="/admin/calendar" className="px-3 py-2 hover:bg-todde-dark rounded-md transition">
              Calendario
            </Link>
            <Link href="/admin/stats" className="px-3 py-2 hover:bg-todde-dark rounded-md transition">
              Statistiche
            </Link>
            {/* LA NUOVA VOCE È QUI SOTTO */}
            <Link href="/admin/help" className="px-3 py-2 hover:bg-todde-dark rounded-md transition font-bold text-yellow-300">
              Guida 💡
            </Link>
          </nav>
        </div>
      </header>
      {/* Questo div dà lo spazio necessario tra l'header e il contenuto della pagina */}
      <div className="py-6">
        {children}
      </div>
    </>
  );
}