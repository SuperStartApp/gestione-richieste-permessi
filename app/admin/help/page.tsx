"use client";
import { 
  BookOpen, UserPlus, FileText, Calendar, BarChart3, 
  Send, Mail, MapPin, CheckCircle2, ShieldCheck, Sparkles 
} from 'lucide-react';

export default function HelpPage() {
  const sections = [
    { 
      title: "1. Gestione Dipendenti & Sedi", 
      icon: <UserPlus className="text-blue-600" size={24} />,
      badge: "Anagrafica & Accessi",
      color: "border-blue-100 bg-blue-50/30",
      points: [
        "Inserimento anagrafica: Nome, Cognome, Telefono ed Email personale.",
        "Assegnazione Sede: scelta obbligatoria tra le sigle TB, MTE e MTC per consentire la ripartizione dei depositi.",
        "Generazione automatica di PIN a 6 cifre e Link Privato univoco per ogni lavoratore.",
        "Invio credenziali in un clic: tramite WhatsApp (icona verde) oppure tramite Email (icona viola), con copia certificata recapitata automaticamente a gestione.permessi@mtexplore.it.",
        "Creazione rapida delle Categorie aziendali (es. Autista, Meccanico, Ufficio)."
      ]
    },
    { 
      title: "2. Gestione Richieste & Notifiche", 
      icon: <FileText className="text-emerald-600" size={24} />,
      badge: "Flusso Permessi",
      color: "border-emerald-100 bg-emerald-50/30",
      points: [
        "Filtri multi-livello: ricerca per nome o telefono, filtro per Sede (TB/MTE/MTC) e per Tipo richiesta (Ferie, Permesso, ecc.).",
        "Schede stato rapide: Tutte, Da Approvare (con contatore rosso notifiche), Approvate e Rifiutate.",
        "Approvazione o Rifiuto guidati: al cambio di stato, il sistema chiede in automatico se si vuole inviare l'email di notifica al dipendente.",
        "Pulsante Email intelligente: abilitato solo sulle richieste già gestite per evitare invii accidentali su pratiche ancora in sospeso.",
        "Variazione orari/date: possibilità di modificare la richiesta con notifica di variazione e stampa del documento PDF ufficiale."
      ]
    },
    { 
      title: "3. Calendario Presenze & Flotta", 
      icon: <Calendar className="text-todde" size={24} />,
      badge: "Pianificazione Turni",
      color: "border-rose-100 bg-rose-50/30",
      points: [
        "3 Mini-Card KPI in tempo reale: In servizio oggi, Assenti oggi e calcolo automatico del 'Giorno più critico' con picco di assenze.",
        "Tasto magico 'Solo con assenze': attivo di default per snellire la vista su oltre 160 dipendenti e concentrarsi solo su chi è assente.",
        "Filtro Sede nel calendario: permette ai singoli capodeposito di visualizzare unicamente gli autisti della propria sede (TB, MTE o MTC).",
        "Riga 'Totale Assenti' giornaliera: evidenzia con codice cromatico (grigio, giallo, rosso) i giorni scoperti per prevenire carenze di personale.",
        "Tutte le assenze visibili corrispondono rigorosamente a richieste nello stato ACCETTATA."
      ]
    },
    { 
      title: "4. Area Personale del Dipendente", 
      icon: <Send className="text-amber-600" size={24} />,
      badge: "App Mobile Web",
      color: "border-amber-100 bg-amber-50/30",
      points: [
        "Accesso istantaneo da qualsiasi smartphone: non richiede installazione da store, basta aprire il link privato e digitare il PIN.",
        "Invio richieste guidato: Ferie, Permesso a ore (con orario inizio/fine), Malattia (con numero di protocollo certificato), Congedo e Lutto.",
        "Consultazione in tempo reale dello stato (Accettata, Rifiutata, In Sospeso).",
        "Ricevuta di notifica certificata: ogni richiesta mostra il badge viola con la data e l'ora esatta in cui l'email di esito è stata recapitata dall'ufficio.",
        "Visualizzazione della sede di appartenenza del lavoratore nell'header superiore."
      ]
    },
    { 
      title: "5. Statistiche, Reportistica & Sicurezza", 
      icon: <BarChart3 className="text-purple-600" size={24} />,
      badge: "Paghe & Audit",
      color: "border-purple-100 bg-purple-50/30",
      points: [
        "Riepilogo mensile aggregato dei giorni e delle ore di permesso richieste da ciascun dipendente.",
        "Esportazione tabellare Excel/CSV per facilitare l'elaborazione dei cedolini da parte del consulente del lavoro.",
        "Stampa del Report Globale aziendale in formato PDF.",
        "Registro storico su Supabase (tbpr_email_logs): memorizza ogni singola email partita dal sistema con timestamp, destinatario ed esito.",
        "Protezione dei dati con canali cifrati SMTP (SSL 465) e autenticazione cloud."
      ]
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* HEADER TITOLO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-todde p-3 rounded-2xl text-white shadow-md">
            <BookOpen size={26} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 leading-none">Guida Ufficiale Gestionale</h2>
            <p className="text-xs text-gray-500 mt-1">Manuale operativo per l'amministrazione e i responsabili di sede</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-2xl text-xs font-bold text-gray-700">
          <Sparkles size={16} className="text-amber-500" />
          <span>Versione 2.0 • Todde Bus</span>
        </div>
      </div>

      {/* GRIGLIA SEZIONI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((s, i) => (
          <div 
            key={i} 
            className={`bg-white p-6 rounded-3xl shadow-sm border ${s.color} transition-all hover:shadow-md flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                    {s.icon}
                  </div>
                  <h3 className="font-extrabold text-base text-gray-800">{s.title}</h3>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-white rounded-full border border-gray-200 text-gray-600">
                  {s.badge}
                </span>
              </div>

              <ul className="space-y-2.5 mt-2">
                {s.points.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-todde mt-1.5 shrink-0"></span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* BOX ASSISTENZA & CREDITI SVILUPPATORE */}
      <div className="bg-gradient-to-r from-[#6e192a] via-[#852136] to-[#5b1423] text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <ShieldCheck size={24} className="text-rose-200" />
            <h3 className="text-xl font-black tracking-wide">Assistenza & Sviluppo Software</h3>
          </div>
          <p className="text-sm text-rose-100/80 max-w-xl">
            Piattaforma realizzata e ottimizzata su misura per le esigenze logistiche di Todde Bus.
            Per manutenzione, nuove funzionalità o supporto tecnico:
          </p>
        </div>

        <div className="shrink-0 flex flex-col items-center gap-2">
          <a 
            href="https://www.superstart.it" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-white text-todde font-black px-6 py-3 rounded-2xl text-sm shadow-lg hover:bg-rose-50 transition-all hover:scale-105 active:scale-95"
          >
            SuPeR • www.superstart.it
          </a>
          <span className="text-[11px] text-rose-200/70 font-medium">Partner Tecnologico Ufficiale</span>
        </div>
      </div>
    </div>
  );
}