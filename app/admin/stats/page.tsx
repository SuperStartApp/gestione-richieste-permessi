"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, Download, FileText, Users, Clock, 
  CheckCircle, AlertCircle, CalendarDays, Filter, Search 
} from 'lucide-react';

export default function StatsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [search, setSearch] = useState(''); // NUOVO: Stato per la ricerca

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('stats-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tbpr_requests' },
        () => {
          console.log("Aggiornamento dati in tempo reale...");
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: reqData } = await supabase
      .from('tbpr_requests')
      .select('*, tbpr_employees(first_name, last_name)');
    const { data: empData } = await supabase
      .from('tbpr_employees')
      .select('*');
    
    if (reqData) setRequests(reqData);
    if (empData) setEmployees(empData);
    setLoading(false);
  }

  // --- LOGICA DI FILTRO INTEGRATA (Tempo + Nome Dipendente) ---
  const filteredRequests = requests.filter(r => {
    // 1. Filtro per Nome/Cognome
    const fullName = `${r.tbpr_employees?.first_name} ${r.tbpr_employees?.last_name}`.toLowerCase();
    if (!fullName.includes(search.toLowerCase())) return false;

    // 2. Filtro Temporale
    if (timeFilter === 'all') return true;
    
    const reqDate = new Date(r.start_date);
    const now = new Date();

    if (timeFilter === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return reqDate >= sevenDaysAgo;
    }
    if (timeFilter === 'month') {
      return reqDate.getMonth() === now.getMonth() && reqDate.getFullYear() === now.getFullYear();
    }
    if (timeFilter === 'year') {
      return reqDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // --- CALCOLI STATISTICHE (Ora basati su filteredRequests che include la ricerca) ---
  const totalRequests = filteredRequests.length;
  const approvedCount = filteredRequests.filter(r => r.status === 'accettata').length;
  const pendingCount = filteredRequests.filter(r => r.status === 'in sospeso').length;
  const rejectedCount = filteredRequests.filter(r => r.status === 'rifiutata').length;

  const types = ['FERIE', 'PERMESSO', 'MALATTIA', 'CONGEDO', 'LUTTO'];
  const typeStats = types.map(type => {
    const allOfType = filteredRequests.filter(r => r.request_type === type);
    return {
      name: type,
      total: allOfType.length,
      accepted: allOfType.filter(r => r.status === 'accettata').length,
      rejected: allOfType.filter(r => r.status === 'rifiutata').length
    };
  });

  const exportToCSV = () => {
    if (filteredRequests.length === 0) return alert("Nessun dato per i filtri selezionati");

    const headers = "Dipendente,Tipo,Inizio,Fine,Stato,Note\n";
    const rows = filteredRequests.map(r => 
      `"${r.tbpr_employees?.first_name} ${r.tbpr_employees?.last_name}","${r.request_type}","${r.start_date}","${r.end_date || ''}","${r.status}","${r.notes || ''}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `report_todde_${timeFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
      <html>
        <head>
          <title>Report - Todde Bus</title>
          <style>
            body { font-family: sans-serif; padding: 40px; }
            .header { color: #852136; border-bottom: 3px solid #852136; padding-bottom: 10px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; }
            .summary { margin-bottom: 30px; display: flex; gap: 20px; }
            .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; flex: 1; text-align: center; }
            .val { font-size: 20px; font-weight: bold; color: #852136; }
          </style>
        </head>
        <body>
          <div class="header"><h1>TODDE BUS - Report Assenze</h1></div>
          <div class="summary">
            <div class="card">Totale Richieste<br/><span class="val">${totalRequests}</span></div>
            <div class="card">Approvate<br/><span class="val">${approvedCount}</span></div>
            <div class="card">In Sospeso<br/><span class="val">${pendingCount}</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Dipendente</th>
                <th>Tipo</th>
                <th>Inizio</th>
                <th>Fine</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRequests.map(r => `
                <tr>
                  <td>${r.tbpr_employees?.first_name} ${r.tbpr_employees?.last_name}</td>
                  <td>${r.request_type}</td>
                  <td>${r.start_date}</td>
                  <td>${r.end_date || '-'}</td>
                  <td>${r.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.print();
  };

  if (loading) return <div className="p-10 text-center">Caricamento statistiche...</div>;

  return (
    <div className="space-y-8">
      {/* HEADER E AZIONI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-todde" size={32} />
          <h2 className="text-3xl font-bold text-gray-800">Statistiche e Report</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* BARRA DI RICERCA */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cerca dipendente..." 
              className="pl-10 p-2 border rounded-xl shadow-sm w-full md:w-64 outline-none focus:border-todde transition text-sm"
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* SELEZIONE PERIODO */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <div className="px-2 text-gray-400"><Filter size={16}/></div>
            <select 
              className="bg-transparent text-sm font-bold text-gray-700 outline-none p-1 pr-4 cursor-pointer"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
            >
              <option value="all">Tutto il tempo</option>
              <option value="week">Ultimi 7 giorni</option>
              <option value="month">Questo mese</option>
              <option value="year">Quest'anno</option>
            </select>
          </div>

          <button onClick={exportToCSV} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 transition shadow-sm text-sm">
            <Download size={18} /> Excel
          </button>
          <button onClick={exportToPDF} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-black transition shadow-sm text-sm">
            <FileText size={18} /> PDF
          </button>
        </div>
      </div>

      {/* CARDS PRINCIPALI (Aggiornate in tempo reale dalla ricerca) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-2xl text-blue-600"><Users size={24} /></div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Dipendenti</p>
            <p className="text-2xl font-black text-gray-800">{employees.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="bg-yellow-100 p-3 rounded-2xl text-yellow-600"><Clock size={24} /></div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">In Sospeso</p>
            <p className="text-2xl font-black text-gray-800">{pendingCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-2xl text-green-600"><CheckCircle size={24} /></div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Approvate</p>
            <p className="text-2xl font-black text-gray-800">{approvedCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-2xl text-red-600"><AlertCircle size={24} /></div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Rifiutate</p>
            <p className="text-2xl font-black text-gray-800">{rejectedCount}</p>
          </div>
        </div>
      </div>

      {/* ANALISI PER TIPO (Sincronizzata con la ricerca) */}
      <div className="bg-white p-8 rounded-3xl shadow-md border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">Distribuzione Richieste</h3>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium bg-gray-50 px-3 py-1 rounded-full">
            <CalendarDays size={14} />
            Basato su inizio assenza
          </div>
        </div>
        <div className="space-y-6">
          {typeStats.map(stat => (
            <div key={stat.name} className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-600">{stat.name}</span>
                <span className="text-todde">{stat.total}</span>
              </div>
              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-todde h-full transition-all duration-1000" 
                  style={{ width: `${totalRequests > 0 ? (stat.total / totalRequests) * 100 : 0}%` }}
                ></div>
              </div>
              {stat.total > 0 && (
                <div className="flex gap-3 text-[10px] font-medium text-gray-400">
                  <span className="text-green-600">{stat.accepted} Accettate</span>
                  {stat.rejected > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-red-500">{stat.rejected} Rifiutate</span>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {totalRequests === 0 && (
          <div className="text-center py-10 text-gray-400 italic">
            {search ? `Nessuna richiesta trovata per "${search}"` : "Nessuna richiesta registrata nel periodo selezionato."}
          </div>
        )}
      </div>
    </div>
  );
}