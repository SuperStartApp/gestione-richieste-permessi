"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Receipt, Search, Filter, Download, Edit3, Trash2, 
  Eye, Printer, CheckCircle, XCircle, Clock, Lock, 
  FileSpreadsheet, X, ExternalLink, Calendar, User, Copy, History, Plus, AlertCircle 
} from 'lucide-react';

const ADMIN_EXPENSE_PIN = "2026";

const CATEGORIES = [
  { id: 'meals', label: 'Pasti' },
  { id: 'parking', label: 'Parcheggi/ZTL' },
  { id: 'fuel', label: 'Carburante' },
  { id: 'adblue', label: 'AdBlue' },
  { id: 'toll', label: 'Pedaggi' },
  { id: 'repairs', label: 'Riparazioni' },
  { id: 'lodging', label: 'Pernotto' },
  { id: 'washing', label: 'Lavaggio' },
  { id: 'other', label: 'Varie' },
];

export default function AdminExpensesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tutte');

  // Modali
  const [viewingExpense, setViewingExpense] = useState<any>(null);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const savedAuth = localStorage.getItem('todde_expense_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      fetchData();
    }
  }, []);

  async function fetchData() {
    setLoading(true);
    // Scarichiamo sia le note spese che i dipendenti per abbinare le sedi
    const { data: empData } = await supabase.from('tbpr_employees').select('id, first_name, last_name, branch');
    const { data: expData } = await supabase.from('tbpr_expenses').select('*').order('created_at', { ascending: false });

    if (empData) setEmployees(empData);
    if (expData) setExpenses(expData);
    setLoading(false);
  }

  // Mappa di fallback per trovare la sede dall'anagrafica se mancante nella nota spesa
  const employeeBranchMap = useMemo(() => {
    const map: { [name: string]: string } = {};
    employees.forEach(emp => {
      if (emp.branch) {
        const full = `${emp.first_name} ${emp.last_name}`.trim().toLowerCase();
        map[full] = emp.branch;
      }
    });
    return map;
  }, [employees]);

  const getDriverBranch = (exp: any) => {
    if (exp.branch) return exp.branch;
    const cleanName = (exp.driver_name || '').trim().toLowerCase();
    return employeeBranchMap[cleanName] || null;
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ADMIN_EXPENSE_PIN) {
      localStorage.setItem('todde_expense_auth', 'true');
      setIsAuthenticated(true);
      fetchData();
    } else {
      alert("PIN errato! Riprova.");
      setPinInput('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('todde_expense_auth');
    setIsAuthenticated(false);
    setPinInput('');
  };

  const formatSimpleDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const p = dateStr.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dateStr;
  };

  // --- MODIFICA COMPLETA ---
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const getCatTotal = (cat: string) => (editingExpense.items || [])
        .filter((it: any) => it.category === cat)
        .reduce((sum: number, it: any) => sum + (parseFloat(it.amount) || 0), 0);

      const computedTotal = (editingExpense.items || []).reduce(
        (sum: number, it: any) => sum + (parseFloat(it.amount) || 0), 0
      );

      const updateData = {
        driver_name: editingExpense.driver_name,
        branch: editingExpense.branch || null,
        date_from: editingExpense.date_from,
        date_to: editingExpense.date_to,
        group_name: editingExpense.group_name || null,
        invoice_number: editingExpense.invoice_number || null,
        status: editingExpense.status || 'in attesa',
        outcome: editingExpense.outcome || null,
        admin_notes: editingExpense.admin_notes || null,
        total_amount: computedTotal > 0 ? computedTotal : (parseFloat(editingExpense.total_amount) || 0),
        reimbursed_amount: parseFloat(editingExpense.reimbursed_amount) || 0,
        items: editingExpense.items || [],

        meals_amount: getCatTotal('meals'),
        parking_amount: getCatTotal('parking'),
        fuel_amount: getCatTotal('fuel'),
        adblue_amount: getCatTotal('adblue'),
        toll_amount: getCatTotal('toll'),
        repairs_amount: getCatTotal('repairs'),
        lodging_amount: getCatTotal('lodging'),
        washing_amount: getCatTotal('washing'),
        other_amount: getCatTotal('other'),

        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('tbpr_expenses').update(updateData).eq('id', editingExpense.id);
      if (error) throw error;

      alert("Nota Spese aggiornata con successo!");
      setEditingExpense(null);
      fetchData();
    } catch (err: any) {
      alert("Errore salvataggio: " + err.message);
    }
  };

  // --- DUPLICA / CREA REVISIONE (COLLEGANDO L'ORIGINALE) ---
  const handleDuplicateRevision = async (exp: any) => {
    const parentIdDisplay = exp.legacy_id || exp.id.substring(0, 6);
    if (!confirm(`Vuoi creare una REVISIONE di questa nota spese?\nL'originale dell'autista #${parentIdDisplay} rimarrà archiviata e collegata.`)) return;

    try {
      // 1. La nota precedente diventa 'archiviata/non-latest'
      await supabase.from('tbpr_expenses').update({ is_latest: false }).eq('id', exp.id);

      // 2. Nuova revisione duplicata con parent_id
      const newRevision = {
        ...exp,
        id: undefined,
        parent_id: exp.id,
        is_latest: true,
        legacy_id: exp.legacy_id ? `${exp.legacy_id}-REV` : `${exp.id.substring(0, 6)}-REV`,
        admin_notes: exp.admin_notes ? `${exp.admin_notes} (Revisionata)` : 'Revisione creata dall\'amministrazione',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      delete newRevision.id;

      const { data, error } = await supabase.from('tbpr_expenses').insert([newRevision]).select().single();
      if (error) throw error;

      alert("Revisione creata con successo! Ora puoi modificarla.");
      await fetchData();
      setEditingExpense(data);
    } catch (err: any) {
      alert("Errore creazione revisione: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare definitivamente questa nota spese?")) return;
    const { error } = await supabase.from('tbpr_expenses').delete().eq('id', id);
    if (error) alert("Errore eliminazione: " + error.message);
    else fetchData();
  };

  // STAMPA PDF
  const handlePrintPDF = (exp: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const branch = getDriverBranch(exp);
    const parentExp = exp.parent_id ? expenses.find(e => e.id === exp.parent_id) : null;
    const parentRef = parentExp ? `#${parentExp.legacy_id || parentExp.id.substring(0, 6)}` : '';

    const itemsHtml = (exp.items && exp.items.length > 0)
      ? exp.items.map((it: any, idx: number) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${idx + 1}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-transform: uppercase;"><strong>${it.category}</strong> ${it.description ? `(${it.description})` : ''}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${it.payment} ${it.cardNumber ? `*${it.cardNumber}` : ''}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">€ ${parseFloat(it.amount).toFixed(2)}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="4" style="padding: 8px; text-align: center;">Voci aggregate memorizzate nei totali principali.</td></tr>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Nota Spese - ${exp.driver_name}</title>
          <style>
            body { font-family: -apple-system, sans-serif; padding: 30px; color: #222; }
            .header { border-bottom: 3px solid #852136; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; }
            .title { color: #852136; font-size: 24px; font-weight: bold; margin: 0; }
            .box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f3f4f6; text-align: left; padding: 10px 8px; font-size: 12px; text-transform: uppercase; }
            .total-row { font-size: 18px; font-weight: bold; text-align: right; padding-top: 10px; }
            .signature { margin-top: 35px; border-top: 1px solid #ddd; padding-top: 10px; width: 250px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">TODDE BUS SRL</h1>
              <p style="margin: 3px 0; font-size: 13px; color: #666;">Documento di Rendicontazione Spese Autisti</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-size: 13px;"><strong>Data:</strong> ${formatSimpleDate(exp.created_at?.split('T')[0])}</p>
              ${exp.invoice_number ? `<p style="margin: 2px 0; font-size: 13px;"><strong>Fattura N.:</strong> ${exp.invoice_number}</p>` : ''}
              ${parentRef ? `<p style="margin: 2px 0; font-size: 12px; color: #852136; font-weight: bold;">[Revisione di ${parentRef}]</p>` : ''}
            </div>
          </div>

          <div class="box">
            <p style="margin: 0 0 4px 0;"><strong>AUTISTA:</strong> <span style="text-transform: uppercase;">${exp.driver_name}</span> ${branch ? `(${branch})` : ''}</p>
            <p style="margin: 0 0 4px 0;"><strong>PERIODO:</strong> Dal ${formatSimpleDate(exp.date_from)} Al ${formatSimpleDate(exp.date_to)}</p>
            ${exp.group_name ? `<p style="margin: 0;"><strong>GRUPPO / CLIENTE:</strong> ${exp.group_name}</p>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Descrizione / Categoria</th>
                <th>Metodo Pagamento</th>
                <th style="text-align: right;">Importo</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div class="total-row">
            Totale Richiesto: € ${parseFloat(exp.total_amount).toFixed(2)}
          </div>
          ${exp.reimbursed_amount !== undefined && exp.reimbursed_amount !== null ? `
          <div class="total-row" style="color: #852136; font-size: 20px;">
            IMPORTO RIMBORSATO: € ${parseFloat(exp.reimbursed_amount).toFixed(2)}
          </div>` : ''}

          <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div class="box" style="width: 55%; margin: 0;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: bold;">STATO CONTABILITÀ:</p>
              <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Esito:</strong> ${exp.outcome || 'In attesa'}</p>
              ${exp.admin_notes ? `<p style="margin: 0; font-size: 12px; color: #555;"><strong>Note:</strong> ${exp.admin_notes}</p>` : ''}
            </div>

            <div class="signature">
              <p style="font-size: 12px; margin-bottom: 8px;">Firma Autista</p>
              ${exp.signature_url ? `<img src="${exp.signature_url}" style="max-height: 55px; max-width: 180px;" />` : '<i>(Firma acquisita)</i>'}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // --- ESPORTAZIONE EXCEL CON RIFERIMENTO CHIARO DEL DUPLICATO ---
  const handleExportCSV = () => {
    if (expenses.length === 0) return alert("Nessuna nota spese da esportare!");

    // Intestazioni chiare e comprensibili
    const headers = [
      "ID NOTA SPESE", 
      "TIPO VOCE", 
      "RIF. ID ORIGINALE", 
      "STATO VERSIONE",
      "Dal", "Al", "Autista", "Sede", "Gruppo", "Fattura N.",
      "Totale Richiesto €", "Importo Rimborsato €", "Stato", "Esito", "Note Amministrazione",
      "Pasti €", "Parcheggi €", "Carburante €", "AdBlue €", "Pedaggi €",
      "Riparazioni €", "Pernotto €", "Lavaggio €", "Varie €", "Data Registrazione"
    ];

    const rows = expenses.map(e => {
      const branch = getDriverBranch(e);
      const isRevision = !!e.parent_id;
      const parentExp = e.parent_id ? expenses.find(p => p.id === e.parent_id) : null;
      const parentRef = parentExp ? (parentExp.legacy_id || parentExp.id.substring(0, 8)) : (isRevision ? e.parent_id.substring(0, 8) : '—');
      const versionStatus = e.is_latest !== false ? 'DEFINITIVA (ATTIVA)' : 'ARCHIVIATA (SUPERATA)';

      return [
        `"${e.legacy_id || e.id.substring(0, 8)}"`,
        `"${isRevision ? 'REVISIONE' : 'ORIGINALE'}"`,
        `"${parentRef}"`,
        `"${versionStatus}"`,
        `"${e.date_from}"`,
        `"${e.date_to}"`,
        `"${e.driver_name}"`,
        `"${branch || ''}"`,
        `"${e.group_name || ''}"`,
        `"${e.invoice_number || ''}"`,
        e.total_amount || 0,
        e.reimbursed_amount ?? e.total_amount ?? 0,
        `"${e.status || ''}"`,
        `"${e.outcome || ''}"`,
        `"${(e.admin_notes || '').replace(/"/g, '""')}"`,
        e.meals_amount || 0,
        e.parking_amount || 0,
        e.fuel_amount || 0,
        e.adblue_amount || 0,
        e.toll_amount || 0,
        e.repairs_amount || 0,
        e.lodging_amount || 0,
        e.washing_amount || 0,
        e.other_amount || 0,
        `"${e.created_at?.split('T')[0]}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `note-spese-toddebus-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredExpenses = expenses.filter(exp => {
    const branch = getDriverBranch(exp);
    const matchesSearch = exp.driver_name.toLowerCase().includes(search.toLowerCase()) ||
      (exp.group_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (branch || '').toLowerCase().includes(search.toLowerCase()) ||
      (exp.legacy_id || '').includes(search);
    const matchesStatus = statusFilter === 'tutte' ? true : exp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border-t-8 border-todde text-center space-y-5">
          <div className="w-16 h-16 bg-rose-50 text-todde rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Lock size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800">Lavagna Spese</h2>
            <p className="text-xs text-gray-400 mt-1">Area Riservata Amministrazione</p>
          </div>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="Inserisci PIN (es. 2026)"
              required
              className="w-full p-3.5 text-center text-xl tracking-widest border border-gray-200 rounded-2xl bg-gray-50 focus:bg-white outline-none focus:border-todde font-bold"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
            />
            <button
              type="submit"
              className="w-full bg-todde text-white py-3.5 rounded-2xl font-bold shadow-md hover:opacity-95 transition"
            >
              Accedi alla Lavagna
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-todde p-3 rounded-2xl text-white shadow-md">
            <Receipt size={26} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 leading-none">Lavagna Note Spese</h2>
            <p className="text-xs text-gray-400 mt-1">Controllo scontrini, revisioni e rimborsi autisti</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-sm transition"
          >
            <FileSpreadsheet size={16} />
            <span>Esporta Excel per Commercialista</span>
          </button>

          <button
            onClick={handleLogout}
            className="text-xs font-bold text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-3.5 py-2.5 rounded-2xl transition"
          >
            Esci
          </button>
        </div>
      </div>

      {/* FILTRI */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-3xl shadow-sm border border-gray-200">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per autista, sede, gruppo o ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-todde"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 bg-gray-100 p-1 rounded-2xl">
          {[
            { id: 'tutte', label: 'Tutte' },
            { id: 'in attesa', label: 'In Attesa' },
            { id: 'Da rimborsare', label: 'Da Rimborsare' },
            { id: 'Rimborsato', label: 'Rimborsate' },
            { id: 'Nessun Rimborso', label: 'Nessun Rimborso' },
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === st.id ? 'bg-white text-todde shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA CARD NOTE SPESE */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-bold">Caricamento lavagna...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center text-gray-400 border border-dashed border-gray-300">
            Nessuna nota spese trovata con i filtri attuali.
          </div>
        ) : (
          filteredExpenses.map(exp => {
            const branch = getDriverBranch(exp);
            const isRevision = !!exp.parent_id;
            const parentExpense = exp.parent_id ? expenses.find(e => e.id === exp.parent_id) : null;
            const parentDisplayId = parentExpense ? (parentExpense.legacy_id || parentExpense.id.substring(0, 6)) : '';

            const hasReimbursedDiff = exp.reimbursed_amount !== undefined && 
              exp.reimbursed_amount !== null && 
              parseFloat(exp.reimbursed_amount) !== parseFloat(exp.total_amount);

            return (
              <div 
                key={exp.id} 
                className={`bg-white p-6 rounded-3xl shadow-sm border transition-all space-y-4 ${
                  isRevision ? 'border-amber-300 bg-amber-50/15' : 'border-gray-200'
                }`}
              >
                {/* RIGA 1: TESTATA CON BOLLINO SEDE E STATO REVISIONE */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg">
                      #{exp.legacy_id || exp.id.substring(0, 6)}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-gray-900 uppercase leading-none">
                          {exp.driver_name}
                        </h3>

                        {/* BOLLINO SEDE (TB, MTE, MTC) AUTOMATICO */}
                        {branch && (
                          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-300 shadow-sm">
                            {branch}
                          </span>
                        )}

                        {/* BADGE SE È UNA REVISIONE O ORIGINALE */}
                        {isRevision ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                            <History size={10} /> Revisione di #{parentDisplayId}
                          </span>
                        ) : (
                          exp.is_latest === false && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                              Originale Archiviato
                            </span>
                          )
                        )}
                      </div>
                      {exp.group_name && (
                        <p className="text-xs text-gray-500 font-medium mt-1">Servizio: {exp.group_name}</p>
                      )}
                    </div>
                  </div>

                  {/* IMPORTI: RICHIESTO VS DA RIMBORSARE */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Richiesto</span>
                      <span className={`text-base font-extrabold ${hasReimbursedDiff ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        € {parseFloat(exp.total_amount).toFixed(2)}
                      </span>
                    </div>

                    <div className="text-right bg-rose-50 px-3.5 py-1.5 rounded-2xl border border-todde/20">
                      <span className="text-[10px] font-bold text-todde uppercase block">Da Rimborsare</span>
                      <span className="text-xl font-black text-todde">
                        € {parseFloat(exp.reimbursed_amount ?? exp.total_amount).toFixed(2)}
                      </span>
                    </div>

                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase ${
                      exp.status === 'Rimborsato' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : exp.status === 'Da rimborsare' 
                          ? 'bg-blue-100 text-blue-700' 
                          : exp.status === 'Nessun Rimborso' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {exp.status || 'In attesa'}
                    </span>
                  </div>
                </div>

                {/* RIGA 2: DATE E NOTE */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600 bg-gray-50/70 p-3.5 rounded-2xl">
                  <div>
                    <span className="font-bold text-gray-400 uppercase block text-[10px]">Periodo</span>
                    <span className="font-semibold">{formatSimpleDate(exp.date_from)} → {formatSimpleDate(exp.date_to)}</span>
                  </div>

                  <div>
                    <span className="font-bold text-gray-400 uppercase block text-[10px]">Fattura N.</span>
                    <span className="font-semibold">{exp.invoice_number || '—'}</span>
                  </div>

                  <div>
                    <span className="font-bold text-gray-400 uppercase block text-[10px]">Esito & Note Ufficio</span>
                    <span className="font-semibold text-gray-800">
                      {exp.outcome ? `[${exp.outcome}] ` : ''}
                      {exp.admin_notes || 'Nessuna nota'}
                    </span>
                  </div>
                </div>

                {/* RIGA 3: AZIONI */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingExpense(exp)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
                    >
                      <Eye size={14} />
                      <span>Dettagli & Scontrini ({exp.items?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => handlePrintPDF(exp)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
                    >
                      <Printer size={14} />
                      <span>Stampa PDF</span>
                    </button>

                    {/* SE È UNA REVISIONE: TASTO PER APRIRE L'ORIGINALE DELL'AUTISTA */}
                    {parentExpense && (
                      <button
                        onClick={() => setViewingExpense(parentExpense)}
                        className="flex items-center gap-1 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition border border-amber-200"
                        title="Apri l'originale inviato dall'autista"
                      >
                        <History size={13} />
                        <span>Apri Originale Autista (#{parentDisplayId})</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* TASTO DUPLICA / CREA REVISIONE */}
                    <button
                      onClick={() => handleDuplicateRevision(exp)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition border border-purple-200"
                      title="Duplica e crea una revisione protetta"
                    >
                      <Copy size={14} />
                      <span>Duplica (Revisione)</span>
                    </button>

                    {/* MODIFICA COMPLETA */}
                    <button
                      onClick={() => setEditingExpense(JSON.parse(JSON.stringify(exp)))}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition"
                    >
                      <Edit3 size={14} />
                      <span>Modifica Completa</span>
                    </button>

                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition"
                      title="Elimina voce"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DETTAGLI CON SCONTRINI */}
      {viewingExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-gray-900 uppercase">{viewingExpense.driver_name}</h3>
                  {getDriverBranch(viewingExpense) && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border">
                      {getDriverBranch(viewingExpense)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {viewingExpense.parent_id ? '[Revisione Modificata]' : '[Originale inviato dall\'Autista]'} • Dal {formatSimpleDate(viewingExpense.date_from)} Al {formatSimpleDate(viewingExpense.date_to)}
                </p>
              </div>
              <button onClick={() => setViewingExpense(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {viewingExpense.items && viewingExpense.items.length > 0 ? (
                viewingExpense.items.map((it: any, i: number) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between font-bold text-sm">
                      <span className="uppercase text-todde font-extrabold">{it.category}</span>
                      <span className="text-base font-black">€ {parseFloat(it.amount).toFixed(2)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                      <span><strong>Pagamento:</strong> {it.payment} {it.cardNumber ? `(*${it.cardNumber})` : ''}</span>
                      {it.description && <span>• <strong>Note:</strong> {it.description}</span>}
                    </div>

                    {it.receipts && it.receipts.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200/60">
                        {it.receipts.map((rUrl: string, rIdx: number) => (
                          <div 
                            key={rIdx}
                            onClick={() => setPreviewImage(rUrl)}
                            className="cursor-pointer group relative border border-gray-300 rounded-xl overflow-hidden hover:scale-105 transition"
                          >
                            <img src={rUrl} alt="Scontrino" className="w-16 h-16 object-cover" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                              <ExternalLink size={14} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">Voci aggregate memorizzate nei totali principali.</p>
              )}
            </div>

            {viewingExpense.signature_url && (
              <div className="pt-3 border-t">
                <span className="text-xs font-bold text-gray-400 block mb-1">Firma dell'Autista:</span>
                <img src={viewingExpense.signature_url} alt="Firma" className="max-h-20 bg-gray-50 p-2 rounded-xl border" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL MODIFICA COMPLETA */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 border-t-8 border-todde">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-xl font-black text-gray-900">Modifica Completa Nota Spese</h3>
                <p className="text-xs text-gray-400">Modifica tutti i campi di viaggio, rimborsi e singole spese</p>
              </div>
              <button onClick={() => setEditingExpense(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-2xl border">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Autista</label>
                  <input
                    type="text"
                    required
                    value={editingExpense.driver_name}
                    onChange={e => setEditingExpense({ ...editingExpense, driver_name: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-todde"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Sede (TB, MTE, MTC)</label>
                  <select
                    value={editingExpense.branch || getDriverBranch(editingExpense) || ''}
                    onChange={e => setEditingExpense({ ...editingExpense, branch: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-todde"
                  >
                    <option value="">Nessuna sede</option>
                    <option value="TB">TB</option>
                    <option value="MTE">MTE</option>
                    <option value="MTC">MTC</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Dal</label>
                  <input
                    type="date"
                    required
                    value={editingExpense.date_from}
                    onChange={e => setEditingExpense({ ...editingExpense, date_from: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-todde"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Al</label>
                  <input
                    type="date"
                    required
                    value={editingExpense.date_to}
                    onChange={e => setEditingExpense({ ...editingExpense, date_to: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-todde"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-700 block mb-1">Gruppo / Servizio</label>
                  <input
                    type="text"
                    value={editingExpense.group_name || ''}
                    onChange={e => setEditingExpense({ ...editingExpense, group_name: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-todde"
                  />
                </div>
              </div>

              {/* LISTA VOCI EDITABILE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider">
                    Dettaglio Singole Spese
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newIt = {
                        id: `item-${Date.now()}`,
                        category: 'meals',
                        amount: 0,
                        payment: 'Contanti',
                        cardNumber: '',
                        description: '',
                        receipts: []
                      };
                      setEditingExpense({
                        ...editingExpense,
                        items: [...(editingExpense.items || []), newIt]
                      });
                    }}
                    className="text-xs text-todde font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus size={14} /> Aggiungi voce
                  </button>
                </div>

                {(editingExpense.items || []).map((it: any, idx: number) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-2xl border grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                    <div>
                      <select
                        value={it.category}
                        onChange={e => {
                          const updated = [...editingExpense.items];
                          updated[idx].category = e.target.value;
                          setEditingExpense({ ...editingExpense, items: updated });
                        }}
                        className="w-full p-2 bg-white border rounded-lg text-xs font-bold"
                      >
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <input
                        type="number"
                        step="0.01"
                        value={it.amount}
                        onChange={e => {
                          const updated = [...editingExpense.items];
                          updated[idx].amount = e.target.value;
                          setEditingExpense({ ...editingExpense, items: updated });
                        }}
                        className="w-full p-2 bg-white border rounded-lg text-xs font-black text-right"
                      />
                    </div>

                    <div>
                      <select
                        value={it.payment}
                        onChange={e => {
                          const updated = [...editingExpense.items];
                          updated[idx].payment = e.target.value;
                          setEditingExpense({ ...editingExpense, items: updated });
                        }}
                        className="w-full p-2 bg-white border rounded-lg text-xs"
                      >
                        <option value="Contanti">Contanti</option>
                        <option value="Carta aziendale">Carta aziendale</option>
                        <option value="Carta personale">Carta personale</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="Note..."
                        value={it.description || ''}
                        onChange={e => {
                          const updated = [...editingExpense.items];
                          updated[idx].description = e.target.value;
                          setEditingExpense({ ...editingExpense, items: updated });
                        }}
                        className="w-full p-2 bg-white border rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingExpense.items.filter((_: any, i: number) => i !== idx);
                          setEditingExpense({ ...editingExpense, items: updated });
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* CONTABILITÀ */}
              <div className="bg-rose-50/40 p-4 rounded-2xl border border-todde/20 space-y-3">
                <h4 className="text-xs font-black uppercase text-todde tracking-wider">
                  Campi Contabili & Rimborsi
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Fattura N.</label>
                    <input
                      type="text"
                      placeholder="Es. 1234/2026"
                      value={editingExpense.invoice_number || ''}
                      onChange={e => setEditingExpense({ ...editingExpense, invoice_number: e.target.value })}
                      className="w-full p-2.5 bg-white border rounded-xl text-sm font-semibold outline-none focus:border-todde"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-todde block mb-1">IMPORTO EFFETTIVO DA RIMBORSARE (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingExpense.reimbursed_amount ?? editingExpense.total_amount ?? ''}
                      onChange={e => setEditingExpense({ ...editingExpense, reimbursed_amount: e.target.value })}
                      className="w-full p-2.5 bg-white border-2 border-todde rounded-xl text-base font-black text-todde outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Stato Rimborso</label>
                    <select
                      value={editingExpense.status || 'in attesa'}
                      onChange={e => setEditingExpense({ ...editingExpense, status: e.target.value })}
                      className="w-full p-2.5 bg-white border rounded-xl text-sm font-bold outline-none focus:border-todde"
                    >
                      <option value="in attesa">In Attesa</option>
                      <option value="Da rimborsare">Da Rimborsare</option>
                      <option value="Rimborsato">Rimborsato</option>
                      <option value="Nessun Rimborso">Nessun Rimborso</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Esito</label>
                    <select
                      value={editingExpense.outcome || ''}
                      onChange={e => setEditingExpense({ ...editingExpense, outcome: e.target.value })}
                      className="w-full p-2.5 bg-white border rounded-xl text-sm font-semibold outline-none focus:border-todde"
                    >
                      <option value="">-- Seleziona Esito --</option>
                      <option value="OK">OK</option>
                      <option value="OK PARZIALE">OK PARZIALE</option>
                      <option value="CARTA AZIENDALE OK">CARTA AZIENDALE OK</option>
                      <option value="RIMBORSATO CONTANTI">RIMBORSATO CONTANTI</option>
                      <option value="NON AUTORIZZATA">NON AUTORIZZATA</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-700 block mb-1">Note Amministrazione</label>
                    <textarea
                      rows={2}
                      placeholder="Note interne..."
                      value={editingExpense.admin_notes || ''}
                      onChange={e => setEditingExpense({ ...editingExpense, admin_notes: e.target.value })}
                      className="w-full p-2.5 bg-white border rounded-xl text-sm outline-none focus:border-todde"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-todde text-white py-3.5 rounded-xl font-bold shadow hover:opacity-90 transition text-sm"
                >
                  Salva Modifiche Complete
                </button>
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-5 bg-gray-200 text-gray-700 py-3.5 rounded-xl font-bold text-sm"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP FOTO SCONTRINO */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 cursor-pointer"
        >
          <img src={previewImage} alt="Ingrandimento Scontrino" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}