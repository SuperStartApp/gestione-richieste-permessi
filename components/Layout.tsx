import { Phone, MessageCircle, Globe, Mail } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Il contenuto cambia a seconda della pagina (Admin o Dipendente) */}
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* FOOTER - Questo resta per tutti perché è il tuo marchio */}
      <footer className="bg-white border-t border-gray-200 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center gap-4">
          <p className="text-gray-600 text-sm font-medium">
            Webapp ideata da <span className="text-todde font-bold">SuPeR</span>
          </p>
          <div className="flex gap-6 text-gray-500">
            <a href="tel:+393934533500" className="hover:text-todde transition"><Phone size={20} /></a>
            <a href="https://wa.me/393934533500" className="hover:text-todde transition"><MessageCircle size={20} /></a>
            <a href="https://www.superstart.it" target="_blank" className="hover:text-todde transition"><Globe size={20} /></a>
            <a href="mailto:info@superstart.it" className="hover:text-todde transition"><Mail size={20} /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}