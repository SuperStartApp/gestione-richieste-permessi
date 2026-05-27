"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Clock, MessageCircle, Edit3, FileText, Search } from 'lucide-react';

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState('in sospeso'); // Default su in sospeso per comodità
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingRequest, setEditingRequest] = useState<any>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    const { data } = await supabase
      .from('tbpr_requests')
      .select('*, tbpr_employees(first_name, last_name, phone)')
      .order('created_at', { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  }

  async function updateStatus(id: string, newStatus: string) {
    const { error } = await supabase.from('tbpr_requests').update({ status: newStatus }).eq('id', id);
    if (error) alert("Errore aggiornamento: " + error.message);
    else fetchRequests();
  }

  async function handleUpdateRequest(e: React.FormEvent) {
    e.preventDefault();
    
    // CREIAMO UN OGGETTO PULITO: inseriamo solo i campi che vogliamo cambiare
    // Questo evita di inviare l'ID o i dati del dipendente a Supabase
    const updatePayload = {
      start_date: editingRequest.start_date || null,
      end_date: editingRequest.end_date || null,
      start_time: editingRequest.start_time || null,
      end_time: editingRequest.end_time || null,
      protocol_number: editingRequest.protocol_number || null,
      notes: editingRequest.notes || null,
    };

    const { error } = await supabase
      .from('tbpr_requests')
      .update(updatePayload) // Inviamo solo il payload pulito
      .eq('id', editingRequest.id); // Filtriamo per l'ID corretto

    if (error) {
      console.error("Errore Supabase:", error);
      alert("Errore modifica: " + error.message);
    } else {
      alert("Richiesta aggiornata con successo!");
      setEditingRequest(null);
      fetchRequests();
    }
  }

  const sendWhatsAppOutcome = async (req: any) => {
    const emp = req.tbpr_employees;
    const statusText = req.status === 'accettata' ? 'ACCETTATA ✅' : req.status === 'rifiutata' ? 'RIFIUTATA ❌' : 'IN SOSPESO ⏳';
    const message = `Ciao ${emp.first_name}, la tua richiesta di ${req.request_type} è stata ${statusText}.`;
    
    // 1. Apriamo WhatsApp
    window.open(`https://wa.me/${emp.phone}?text=${message}`, '_blank');

    // 2. AGGIORNIAMO IL DATABASE: segniamo che il messaggio è stato inviato
    const { error } = await supabase
      .from('tbpr_requests')
      .update({ wa_sent: true })
      .eq('id', req.id);

    if (error) {
      console.error("Errore aggiornamento WA:", error);
    } else {
      fetchRequests(); // Aggiorniamo la tabella per far apparire il badge "Inviato"
    }
  };

  const downloadPDF = (req: any) => {
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
      <html>
        <head>
          <title>Richiesta - Todde Bus</title>
          <style>
            body { font-family: sans-serif; padding: 40px; line-height: 1.6; }
            .header { color: #852136; border-bottom: 2px solid #852136; padding-bottom: 10px; margin-bottom: 20px; }
            .detail { margin-bottom: 10px; font-size: 18px; }
            .label { font-weight: bold; color: #555; }
          </style>
        </head>
        <body>
          <div class="header"><h1>TODDE BUS - Documento Richiesta</h1></div>
          <div class="detail"><span class="label">Dipendente:</span> ${req.tbpr_employees.first_name} ${req.tbpr_employees.last_name}</div>
          <div class="detail"><span class="label">Tipo:</span> ${req.request_type}</div>
          <div class="detail"><span class="label">Periodo:</span> ${req.start_date} $\rightarrow$ ${req.end_date || 'N/A'}</div>
          <div class="detail"><span class="label">Orario:</span> ${req.start_time || 'N/A'} $\rightarrow$ ${req.end_time || 'N/A'}</div>
          <div class="detail"><span class="label">Protocollo:</span> ${req.protocol_number || 'N/A'}</div>
          <div class="detail"><span class="label">Note:</span> ${req.notes || 'Nessuna'}</div>
          <div class="detail" style="font-size: 22px; margin-top: 30px; font-weight: bold;">STATO: ${req.status.toUpperCase()}</div>
        </body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.print();
  };

  // FILTRO COMBINATO: Stato + Ricerca Nome/Cognome
  const filteredRequests = requests.filter(r => {
    const matchesFilter = filter === 'tutte' ? true : r.status === filter;
    const fullName = `${r.tbpr_employees?.first_name} ${r.tbpr_employees?.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <FileText className="text-todde" size={32} />
          <h2 className="text-3xl font-bold text-gray-800">Gestione Richieste</h2>
        </div>
        
        {/* RICERCA DIPENDENTE */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cerca dipendente..." 
            className="pl-10 p-2 border rounded-xl shadow-sm w-full md:w-64 outline-none focus:border-todde transition"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TAB DI STATO */}
      <div className="flex flex-wrap gap-2 bg-gray-200 p-1 rounded-2xl w-fit">
        {[
          { id: 'tutte', label: 'Tutte', icon: <FileText size={14} /> },
          { id: 'in sospeso', label: 'Da Approvare', icon: <Clock size={14} /> },
          { id: 'accettata', label: 'Approvate', icon: <CheckCircle size={14} /> },
          { id: 'rifiutata', label: 'Rifiutate', icon: <XCircle size={14} /> },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === tab.id ? 'bg-white text-todde shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* MODALE MODIFICA */}
      {editingRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-lg border-t-8 border-todde">
            <h3 className="text-xl font-bold mb-4">Modifica Richiesta</h3>
            <form onSubmit={handleUpdateRequest} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="date" 
                  className="p-2 border rounded-lg" 
                  value={editingRequest.start_date || ''} 
                  onChange={e => setEditingRequest({...editingRequest, start_date: e.target.value})} 
                />
                <input 
                  type="date" 
                  className="p-2 border rounded-lg" 
                  value={editingRequest.end_date || ''} 
                  onChange={e => setEditingRequest({...editingRequest, end_date: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="time" 
                  className="p-2 border rounded-lg" 
                  value={editingRequest.start_time || ''} 
                  onChange={e => setEditingRequest({...editingRequest, start_time: e.target.value})} 
                />
                <input 
                  type="time" 
                  className="p-2 border rounded-lg" 
                  value={editingRequest.end_time || ''} 
                  onChange={e => setEditingRequest({...editingRequest, end_time: e.target.value})} 
                />
              </div>
              <input 
                type="text" 
                placeholder="Protocollo" 
                className="w-full p-2 border rounded-lg" 
                value={editingRequest.protocol_number || ''} 
                onChange={e => setEditingRequest({...editingRequest, protocol_number: e.target.value})} 
              />
              <textarea 
                className="w-full p-2 border rounded-lg" 
                rows={3} 
                value={editingRequest.notes || ''} 
                onChange={e => setEditingRequest({...editingRequest, notes: e.target.value})}
              ></textarea>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-todde text-white p-3 rounded-xl font-bold hover:bg-todde-dark transition">Salva Modifiche</button>
                <button type="button" onClick={() => setEditingRequest(null)} className="flex-1 bg-gray-200 text-gray-700 p-3 rounded-xl font-bold">Annulla</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TABELLA RICHIESTE */}
      <div className="bg-white rounded-3xl shadow-md overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-4">Dipendente</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Periodo</th>
                <th className="p-4">Stato</th>
                <th className="p-4 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400">Caricamento richieste...</td></tr>
              ) : filteredRequests.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400">Nessuna richiesta trovata.</td></tr>
              ) : filteredRequests.map(req => (
                <tr key={req.id} className="hover:bg-gray-50 transition">
                  <td className="p-4">
                    <div className="font-bold text-gray-800">{req.tbpr_employees?.first_name} {req.tbpr_employees?.last_name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{req.tbpr_employees?.phone}</span>
                      {/* BADGE INVIO WHATSAPP */}
                      {req.wa_sent && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                          <CheckCircle size={10} /> Inviato
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-bold">{req.request_type}</span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {req.start_date} {req.end_date ? ` → ${req.end_date}` : ''}
                    {req.start_time && <div className="text-[10px] text-gray-400">{req.start_time} - {req.end_time}</div>}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${req.status === 'accettata' ? 'bg-green-100 text-green-600' : req.status === 'rifiutata' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => updateStatus(req.id, 'accettata')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Accetta"><CheckCircle size={18} /></button>
                      <button onClick={() => updateStatus(req.id, 'rifiutata')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Rifiuta"><XCircle size={18} /></button>
                      <button onClick={() => setEditingRequest(req)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Modifica"><Edit3 size={18} /></button>
                      {/* Il tasto WA cambia colore se già inviato */}
                      <button 
                        onClick={() => sendWhatsAppOutcome(req)} 
                        className={`p-2 rounded-lg transition ${req.wa_sent ? 'text-gray-400 bg-gray-100' : 'text-green-500 hover:bg-green-50'}`} 
                        title={req.wa_sent ? "Già inviato" : "Avvisa WA"}
                      >
                        <MessageCircle size={18} />
                      </button>
                      <button onClick={() => downloadPDF(req)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" title="Stampa PDF"><FileText size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}