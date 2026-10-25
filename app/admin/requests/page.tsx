"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle, XCircle, Clock, MessageCircle, Edit3, 
  FileText, Search, Calendar, Mail, Loader2, MapPin, CalendarDays
} from 'lucide-react';

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('tutte'); 
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('tutte');
  const [typeFilter, setTypeFilter] = useState('tutte');
  
  const [loading, setLoading] = useState(true);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<any>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    const { data } = await supabase
      .from('tbpr_requests')
      .select('*, tbpr_employees(first_name, last_name, phone, branch, email, private_link_id)')
      .order('created_at', { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  }

  const availableTypes = useMemo(() => {
    const types = requests.map(r => r.request_type).filter(Boolean);
    return Array.from(new Set(types));
  }, [requests]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSimpleDate = (dateString: string) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateString;
  };

  // --- INVIO EMAIL ---
  const sendEmailOutcome = async (req: any, customType?: 'approved' | 'rejected' | 'modified') => {
    const emp = req.tbpr_employees;
    if (!emp?.email) {
      alert("Questo dipendente non ha un indirizzo email registrato!");
      return;
    }

    if (req.status === 'in sospeso' && !customType) {
      alert("Attenzione: devi prima accettare o rifiutare la richiesta per inviare l'esito!");
      return;
    }

    const emailType = customType || (req.status === 'accettata' ? 'approved' : 'rejected');

    setSendingEmailId(req.id);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: emailType,
          employeeId: req.employee_id,
          requestId: req.id,
          recipientEmail: emp.email,
          firstName: emp.first_name,
          privateLinkId: emp.private_link_id,
          requestType: req.request_type,
          startDate: req.start_date,
          endDate: req.end_date,
          startTime: req.start_time,
          endTime: req.end_time,
          notes: req.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");

      alert(`✅ Email inviata con successo a ${emp.email}!`);
    } catch (err: any) {
      alert("❌ Errore durante l'invio dell'email: " + err.message);
    } finally {
      setSendingEmailId(null);
    }
  };

  async function updateStatus(req: any, newStatus: string) {
    const { error } = await supabase.from('tbpr_requests').update({ status: newStatus }).eq('id', req.id);
    if (error) {
      alert("Errore aggiornamento: " + error.message);
      return;
    }

    await fetchRequests();

    if (req.tbpr_employees?.email) {
      const wantEmail = confirm(
        `Richiesta segnata come ${newStatus.toUpperCase()}!\n\nVuoi inviare subito l'email di notifica a ${req.tbpr_employees.first_name} (${req.tbpr_employees.email})?`
      );
      if (wantEmail) {
        await sendEmailOutcome({ ...req, status: newStatus }, newStatus === 'accettata' ? 'approved' : 'rejected');
      }
    }
  }

  async function handleUpdateRequest(e: React.FormEvent) {
    e.preventDefault();
    const updatePayload = {
      start_date: editingRequest.start_date || null,
      end_date: editingRequest.end_date || null,
      start_time: editingRequest.start_time || null,
      end_time: editingRequest.end_time || null,
      protocol_number: editingRequest.protocol_number || null,
      notes: editingRequest.notes || null,
      wa_sent: false,
    };

    const { error } = await supabase.from('tbpr_requests').update(updatePayload).eq('id', editingRequest.id);

    if (error) {
      alert("Errore modifica: " + error.message);
    } else {
      const modifiedReq = { ...editingRequest, ...updatePayload };
      setEditingRequest(null);
      await fetchRequests();

      if (modifiedReq.tbpr_employees?.email) {
        const wantEmail = confirm(
          `Modifiche salvate con successo!\n\nVuoi inviare un'email di variazione a ${modifiedReq.tbpr_employees.first_name}?`
        );
        if (wantEmail) {
          await sendEmailOutcome(modifiedReq, 'modified');
        }
      }
    }
  }

  const sendWhatsAppOutcome = async (req: any) => {
    const emp = req.tbpr_employees;
    const statusText = req.status === 'accettata' ? 'ACCETTATA ✅' : req.status === 'rifiutata' ? 'RIFIUTATA ❌' : 'IN SOSPESO ⏳';
    const introMessage = req.status === 'in sospeso' 
      ? `Ciao ${emp.first_name}, ci sono aggiornamenti sulla tua richiesta di ${req.request_type}. Lo stato attuale è: ${statusText}.`
      : `Ciao ${emp.first_name}, la tua richiesta di ${req.request_type} è stata ${statusText}.`;

    const startFormatted = formatSimpleDate(req.start_date);
    const endFormatted = req.end_date ? formatSimpleDate(req.end_date) : '';
    const dateRange = startFormatted + (endFormatted ? ` → ${endFormatted}` : '');
    const timeRange = (req.start_time && req.end_time) ? ` (${req.start_time} - ${req.end_time})` : '';
    const message = `${introMessage}\n\n📅 Periodo: ${dateRange}${timeRange}\n📝 Note: ${req.notes || 'Nessuna'}`;
    
    const cleanPhone = emp.phone ? emp.phone.replace(/\s+/g, '').replace('+', '') : '';
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');

    await supabase.from('tbpr_requests').update({ wa_sent: true }).eq('id', req.id);
    fetchRequests();
  };

  const downloadPDF = (req: any) => {
    const printWindow = window.open('', '_blank');
    const startFormatted = formatSimpleDate(req.start_date);
    const endFormatted = req.end_date ? formatSimpleDate(req.end_date) : 'N/A';

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
          <div class="detail"><span class="label">Dipendente:</span> ${req.tbpr_employees.first_name} ${req.tbpr_employees.last_name} ${req.tbpr_employees.branch ? `(${req.tbpr_employees.branch})` : ''}</div>
          <div class="detail"><span class="label">Tipo:</span> ${req.request_type}</div>
          <div class="detail"><span class="label">Periodo:</span> ${startFormatted} → ${endFormatted}</div>
          <div class="detail"><span class="label">Orario:</span> ${req.start_time || 'N/A'} → ${req.end_time || 'N/A'}</div>
          <div class="detail"><span class="label">Protocollo:</span> ${req.protocol_number || 'N/A'}</div>
          <div class="detail"><span class="label">Note:</span> ${req.notes || 'Nessuna'}</div>
          <div class="detail" style="font-size: 22px; margin-top: 30px; font-weight: bold;">STATO: ${req.status.toUpperCase()}</div>
        </body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.print();
  };

  const pendingCount = requests.filter(r => r.status === 'in sospeso').length;

  const filteredRequests = requests.filter(r => {
    const matchesStatus = statusFilter === 'tutte' ? true : r.status === statusFilter;
    const matchesBranch = branchFilter === 'tutte' ? true : r.tbpr_employees?.branch === branchFilter;
    const matchesType = typeFilter === 'tutte' ? true : r.request_type === typeFilter;
    
    const fullName = `${r.tbpr_employees?.first_name} ${r.tbpr_employees?.last_name}`.toLowerCase();
    const phone = (r.tbpr_employees?.phone || '').toLowerCase();
    const query = search.toLowerCase();
    const matchesSearch = fullName.includes(query) || phone.includes(query);

    return matchesStatus && matchesBranch && matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* HEADER TITOLO */}
      <div className="flex items-center gap-3 bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
        <div className="bg-todde p-2 rounded-xl text-white">
          <FileText size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800 leading-none">Gestione Richieste</h2>
          <p className="text-xs text-gray-400 mt-1">Approvazione, variazioni e notifiche ferie/permessi</p>
        </div>
      </div>

      {/* BARRA FILTRI */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-3xl shadow-sm border border-gray-200">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cerca dipendente per nome o telefono..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-todde transition"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <MapPin size={16} className="text-gray-400" />
          <select 
            className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="tutte">Tutte le sedi</option>
            <option value="TB">Sede TB</option>
            <option value="MTE">Sede MTE</option>
            <option value="MTC">Sede MTC</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <CalendarDays size={16} className="text-gray-400" />
          <select 
            className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="tutte">Tutti i tipi</option>
            {availableTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABS STATO */}
      <div className="flex flex-wrap gap-2 bg-gray-200/70 p-1.5 rounded-2xl w-fit">
        {[
          { id: 'tutte', label: 'Tutte', icon: <FileText size={14} /> },
          { id: 'in sospeso', label: 'Da Approvare', icon: <Clock size={14} /> },
          { id: 'accettata', label: 'Approvate', icon: <CheckCircle size={14} /> },
          { id: 'rifiutata', label: 'Rifiutate', icon: <XCircle size={14} /> },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${statusFilter === tab.id ? 'bg-white text-todde shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.icon} {tab.label}
            {tab.id === 'in sospeso' && pendingCount > 0 && (
              <span className="ml-1 flex items-center justify-center bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full shadow-sm">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* MODAL MODIFICA */}
      {editingRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-lg border-t-8 border-todde">
            <h3 className="text-xl font-bold mb-4">Modifica Richiesta</h3>
            <form onSubmit={handleUpdateRequest} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="date" className="p-2 border rounded-lg" value={editingRequest.start_date || ''} onChange={e => setEditingRequest({...editingRequest, start_date: e.target.value})} />
                <input type="date" className="p-2 border rounded-lg" value={editingRequest.end_date || ''} onChange={e => setEditingRequest({...editingRequest, end_date: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="time" className="p-2 border rounded-lg" value={editingRequest.start_time || ''} onChange={e => setEditingRequest({...editingRequest, start_time: e.target.value})} />
                <input type="time" className="p-2 border rounded-lg" value={editingRequest.end_time || ''} onChange={e => setEditingRequest({...editingRequest, end_time: e.target.value})} />
              </div>
              <input type="text" placeholder="Protocollo" className="w-full p-2 border rounded-lg" value={editingRequest.protocol_number || ''} onChange={e => setEditingRequest({...editingRequest, protocol_number: e.target.value})} />
              <textarea className="w-full p-2 border rounded-lg" rows={3} placeholder="Note amministrazione..." value={editingRequest.notes || ''} onChange={e => setEditingRequest({...editingRequest, notes: e.target.value})}></textarea>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-todde text-white p-3 rounded-xl font-bold hover:bg-todde-dark transition">Salva Modifiche</button>
                <button type="button" onClick={() => setEditingRequest(null)} className="flex-1 bg-gray-200 text-gray-700 p-3 rounded-xl font-bold">Annulla</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TABELLA */}
      <div className="bg-white rounded-3xl shadow-md overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-4">Dipendente</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Data Invio</th>
                <th className="p-4">Periodo</th>
                <th className="p-4">Stato</th>
                <th className="p-4 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-10 text-center text-gray-400">Caricamento richieste...</td></tr>
              ) : filteredRequests.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-gray-400">Nessuna richiesta trovata.</td></tr>
              ) : filteredRequests.map(req => {
                const isPending = req.status === 'in sospeso';

                return (
                  <tr key={req.id} className="hover:bg-gray-50 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 uppercase">
                          {req.tbpr_employees?.first_name} {req.tbpr_employees?.last_name}
                        </span>
                        {req.tbpr_employees?.branch && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-300">
                            {req.tbpr_employees.branch}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{req.tbpr_employees?.phone}</span>
                        {req.tbpr_employees?.email && (
                          <span className="text-xs text-gray-500 font-medium">• {req.tbpr_employees.email}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-bold">{req.request_type}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={14} className="text-gray-400" />
                        {formatDate(req.created_at)}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 font-medium">
                      {formatSimpleDate(req.start_date)} {req.end_date ? ` → ${formatSimpleDate(req.end_date)}` : ''}
                      {req.start_time && <div className="text-[10px] text-gray-400">{req.start_time} - {req.end_time}</div>}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${req.status === 'accettata' ? 'bg-green-100 text-green-600' : req.status === 'rifiutata' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        {/* ACCETTA */}
                        <button onClick={() => updateStatus(req, 'accettata')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Accetta"><CheckCircle size={18} /></button>
                        
                        {/* RIFIUTA */}
                        <button onClick={() => updateStatus(req, 'rifiutata')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Rifiuta"><XCircle size={18} /></button>
                        
                        {/* MODIFICA */}
                        <button onClick={() => setEditingRequest(req)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Modifica"><Edit3 size={18} /></button>
                        
                        {/* WHATSAPP */}
                        <button 
                          onClick={() => sendWhatsAppOutcome(req)} 
                          className={`p-2 rounded-lg transition ${req.wa_sent ? 'text-gray-400 bg-gray-100' : 'text-green-500 hover:bg-green-50'}`} 
                          title={req.wa_sent ? "Già inviato via WA" : "Avvisa via WA"}
                        >
                          <MessageCircle size={18} />
                        </button>

                        {/* INVIA EMAIL (DISABILITATA SE IN SOSPESO) */}
                        <button 
                          onClick={() => sendEmailOutcome(req)} 
                          disabled={sendingEmailId === req.id || isPending}
                          className={`p-2 rounded-lg transition ${
                            isPending 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : req.tbpr_employees?.email 
                                ? 'text-purple-600 hover:bg-purple-50' 
                                : 'text-gray-300 cursor-not-allowed'
                          }`}
                          title={
                            isPending 
                              ? "Accetta o rifiuta prima la richiesta per inviare l'email" 
                              : req.tbpr_employees?.email 
                                ? "Invia notifica esito via Email" 
                                : "Dipendente senza email"
                          }
                        >
                          {sendingEmailId === req.id ? (
                            <Loader2 size={18} className="animate-spin text-purple-600" />
                          ) : (
                            <Mail size={18} />
                          )}
                        </button>

                        {/* STAMPA PDF */}
                        <button onClick={() => downloadPDF(req)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" title="Stampa PDF"><FileText size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}