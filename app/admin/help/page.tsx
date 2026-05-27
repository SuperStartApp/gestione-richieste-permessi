"use client";
import { BookOpen, UserPlus, FileText, Calendar, BarChart3, Send } from 'lucide-react';

export default function HelpPage() {
  const sections = [
    { 
      title: "Gestione Dipendenti", 
      icon: <UserPlus className="text-blue-500" />, 
      desc: "Qui puoi aggiungere i tuoi dipendenti. L'app genererà automaticamente un PIN e un Link privato che potrai inviare via WhatsApp. Ricorda di creare prima le Categorie (es. Autista, Meccanico)." 
    },
    { 
      title: "Gestione Richieste", 
      icon: <FileText className="text-green-500" />, 
      desc: "In questa sezione trovi tutte le richieste inviate dai dipendenti. Puoi approvarle, rifiutarle o modificarle. Cliccando sull'icona WhatsApp, invierai l'esito direttamente al dipendente." 
    },
    { 
      title: "Calendario Presenze", 
      icon: <Calendar className="text-todde" />, 
      desc: "Il calendario mostra solo le assenze APPROVATE. È una griglia dove ogni riga è un dipendente. Ti permette di vedere a colpo d'occhio chi manca in un determinato giorno." 
    },
    { 
      title: "Statistiche e Report", 
      icon: <BarChart3 className="text-purple-500" />, 
      desc: "Qui hai il riepilogo mensile. Puoi scaricare l'elenco completo in formato Excel (.csv) per i tuoi calcoli o stampare un Report PDF globale." 
    },
    { 
      title: "Area Dipendente", 
      icon: <Send className="text-orange-500" />, 
      desc: "Il dipendente entra tramite il link privato e il PIN. Può inviare richieste di ferie, permessi, malattie, congedi e lutto. Vedrà in tempo reale se la sua richiesta è stata accettata o rifiutata." 
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="text-todde" size={32} />
        <h2 className="text-3xl font-bold text-gray-800">Guida all'Utilizzo</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex gap-4 items-start">
            <div className="bg-gray-50 p-3 rounded-2xl">{s.icon}</div>
            <div>
              <h3 className="font-bold text-lg text-gray-800">{s.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-todde text-white p-8 rounded-3xl shadow-lg text-center">
        <h3 className="text-xl font-bold mb-2">Hai bisogno di assistenza?</h3>
        <p className="opacity-90 mb-4">Contatta il tuo sviluppatore SuPeR per qualsiasi modifica o supporto.</p>
        <div className="flex justify-center gap-4">
          <span className="bg-white/20 px-4 py-2 rounded-full text-sm font-medium">www.superstart.it</span>
        </div>
      </div>
    </div>
  );
}