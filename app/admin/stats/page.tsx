"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, Download, FileText, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function StatsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: reqData } = await supabase.from('tbpr_requests').select('*, tbpr_employees(first_name, last_name)');
    const { data: empData } = await supabase.from('tbpr_employees').select('*');
    
    if (reqData) setRequests(reqData);
    if (empData) setEmployees(empData);
    setLoading(false);
  }

  // --- CALCOLI STATISTICHE ---
  const totalRequests = requests.length;
  const approvedCount = requests.filter(r => r.status === 'accettata').length;
  const pendingCount = requests.filter(r => r.status === 'in sospeso').length;
  const rejectedCount = requests.filter(r => r.status === 'rifiutata').length;

  // Conteggio per tipo di richiesta
  const types = ['FERIE', 'PERMESSO', 'MALATTIA', 'CONGEDO', 'LUTTO'];
  const typeStats = types.map(type => ({
    name: type,
    count: requests.filter(r => r.request_type === type).length
  }));

  // --- ESPORTAZIONE EXCEL (CSV) ---
  const exportToCSV = () => {
    if (requests.length === 0) return alert("Nessun dato da esportare");

    const headers = "Dipendente,Tipo,Inizio,Fine,Stato,Note\n";
    const rows = requests.map(r => 
      `"${r.tbpr_employees?.first_name} ${r.tbpr_employees?.last_name}","${r.request_type}","${r.start_date}","${r.end_date || ''}","${r.status}","${r.notes || ''}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `report_todde_bus_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- REPORT PDF GLOBALE ---
  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
      <html>
        <head>
          <title>Report Globale - Todde Bus</title>
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
          <div class="header"><h1>TODDE BUS - Report Generale Assenze</h1></div>
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
              ${requests.map(r => `
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-todde" size={32} />
          <h2 className="text-3xl font-bold text-gray-800">Statistiche e Report</h2>
        </div>
        
        <div className="flex gap-3">
          <button onClick={exportToCSV} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 transition shadow-sm">
            <Download size={18} /> Excel (.csv)
          </button>
          <button onClick={exportToPDF} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-black transition shadow-sm">
            <FileText size={18} /> Report PDF
          </button>
        </div>
      </div>

      {/* CARDS PRINCIPALI */}
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

      {/* ANALISI PER TIPO */}
      <div className="bg-white p-8 rounded-3xl shadow-md border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Distribuzione Richieste</h3>
        <div className="space-y-6">
          {typeStats.map(stat => (
            <div key={stat.name} className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-600">{stat.name}</span>
                <span className="text-todde">{stat.count}</span>
              </div>
              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-todde h-full transition-all duration-1000" 
                  style={{ width: `${totalRequests > 0 ? (stat.count / totalRequests) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}