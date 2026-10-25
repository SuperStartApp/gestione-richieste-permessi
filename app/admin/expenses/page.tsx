"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Receipt, Search, Filter, Download, Edit3, Trash2, 
  Eye, Printer, CheckCircle, XCircle, Clock, Lock, 
  FileSpreadsheet, X, ExternalLink, Calendar, User, Copy, 
  History, Plus, BarChart3, TrendingUp, DollarSign, MapPin, ChevronDown 
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

const MONTH_NAMES = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu", 
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic"
];

export default function AdminExpensesPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtri
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tutte');
  const [branchFilter, setBranchFilter] = useState('tutte');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showChart, setShowChart] = useState(true);

  // Modali
  const [viewingExpense, setViewingExpense] = useState<any>(null);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('todde_expense_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      fetchData();
    }
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: empData } = await supabase.from('tbpr_employees').select('id, first_name, last_name, branch');
    const { data: expData } = await supabase.from('tbpr_expenses').select('*').order('created_at', { ascending: false });

    if (empData) setEmployees(empData);
    if (expData) setExpenses(expData);
    setLoading(false);
  }

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
      sessionStorage.setItem('todde_expense_auth', 'true');
      setIsAuthenticated(true);
      fetchData();
    } else {
      alert("PIN errato! Riprova.");
      setPinInput('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('todde_expense_auth');
    setIsAuthenticated(false);
    setPinInput('');
    router.push('/');
  };

  const formatSimpleDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const p = dateStr.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dateStr;
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const branch = getDriverBranch(exp);
      const matchesSearch = exp.driver_name.toLowerCase().includes(search.toLowerCase()) ||
        (exp.group_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (branch || '').toLowerCase().includes(search.toLowerCase()) ||
        (exp.legacy_id || '').includes(search);
      const matchesStatus = statusFilter === 'tutte' ? true : exp.status === statusFilter;
      const matchesBranch = branchFilter === 'tutte' ? true : branch === branchFilter;
      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [expenses, search, statusFilter, branchFilter, employeeBranchMap]);

  const pendingCount = useMemo(() => {
    return expenses.filter(e => (e.status || 'in attesa') === 'in attesa').length;
  }, [expenses]);

  const kpis = useMemo(() => {
    const active = filteredExpenses.filter(e => e.is_latest !== false);

    const totalRequested = active.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
    const totalReimbursed = active
      .filter(e => e.status === 'Rimborsato' || e.status === 'Da rimborsare')
      .reduce((acc, curr) => acc + (parseFloat(curr.reimbursed_amount ?? curr.total_amount) || 0), 0);

    const pendingTotal = active
      .filter(e => (e.status || 'in attesa') === 'in attesa')
      .reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);

    return {
      count: active.length,
      totalRequested,
      totalReimbursed,
      pendingTotal,
      pendingCount: active.filter(e => (e.status || 'in attesa') === 'in attesa').length,
    };
  }, [filteredExpenses]);

  // --- GRAFICO MENSILE CON ENTRAMBI GLI IMPORTI (RICHIESTO E RIMBORSATO) ---
  const monthlyStats = useMemo(() => {
    const monthlyData: { [month: number]: { requested: number; reimbursed: number; count: number } } = {};
    for (let m = 0; m < 12; m++) {
      monthlyData[m] = { requested: 0, reimbursed: 0, count: 0 };
    }

    filteredExpenses.forEach(exp => {
      if (exp.is_latest === false) return;
      const d = new Date(exp.date_from || exp.created_at);
      if (d.getFullYear() === selectedYear) {
        const m = d.getMonth();
        const reqAmt = parseFloat(exp.total_amount) || 0;
        const reimbAmt = exp.reimbursed_amount !== undefined && exp.reimbursed_amount !== null
          ? parseFloat(exp.reimbursed_amount)
          : (exp.status === 'Rimborsato' || exp.status === 'Da rimborsare' ? reqAmt : 0);

        monthlyData[m].requested += reqAmt;
        monthlyData[m].reimbursed += reimbAmt;
        monthlyData[m].count += 1;
      }
    });

    const maxVal = Math.max(
      ...Object.values(monthlyData).map(v => Math.max(v.requested, v.reimbursed)),
      50
    );

    return { monthlyData, maxVal };
  }, [filteredExpenses, selectedYear]);

  const availableYears = useMemo(() => {
    const years = expenses.map(e => new Date(e.date_from || e.created_at).getFullYear()).filter(Boolean);
    const set = Array.from(new Set(years)).sort((a, b) => b - a);
    return set.length > 0 ? set : [new Date().getFullYear()];
  }, [expenses]);

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

  const handleDuplicateRevision = async (exp: any) => {
    const parentIdDisplay = exp.legacy_id || exp.id.substring(0, 6);
    if (!confirm(`Vuoi creare una REVISIONE di questa nota spese?\nL'originale dell'autista #${parentIdDisplay} rimarrà archiviata.`)) return;

    try {
      await supabase.from('tbpr_expenses').update({ is_latest: false }).eq('id', exp.id);

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

      alert("Revisione creata con successo!");
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
              <p style="margin: 3px 0; font-size: 13px; color: #666;">Documento Nota Spese</p>
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

  const handleExportCSV = () => {
    const exportable = filteredExpenses.filter(e => e.is_latest !== false);

    if (exportable.length === 0) return alert("Nessuna nota spese da esportare con i filtri attuali!");

    const headers = [
      "ID NOTA SPESE", "TIPO VOCE", "RIF. ID ORIGINALE", "STATO VERSIONE",
      "Dal", "Al", "Autista", "Sede", "Gruppo", "Fattura N.",
      "Totale Richiesto €", "Importo Rimborsato €", "Stato", "Esito", "Note Amministrazione",
      "Pasti €", "Parcheggi €", "Carburante €", "AdBlue €", "Pedaggi €",
      "Riparazioni €", "Pernotto €", "Lavaggio €", "Varie €", "Data Registrazione"
    ];

    const rows = exportable.map(e => {
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
      {/* HEADER LAVAGNA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-todde p-3 rounded-2xl text-white shadow-md">
            <Receipt size={26} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 leading-none">Lavagna Note Spese</h2>
            <p className="text-xs text-gray-400 mt-1">Controllo scontrini, revisioni e analisi rimborsi</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowChart(!showChart)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition border ${
              showChart ? 'bg-todde text-white border-todde shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
            }`}
          >
            <BarChart3 size={16} />
            <span>{showChart ? 'Nascondi Grafico' : 'Mostra Grafico Spese'}</span>
          </button>

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
            Chiudi Sessione (Esci)
          </button>
        </div>
      </div>

      {/* 4 MINI-CARD KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-gray-100 text-gray-700 rounded-2xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Totale Richiesto</p>
            <p className="text-2xl font-black text-gray-800">€ {kpis.totalRequested.toFixed(2)}</p>
            <span className="text-[11px] text-gray-400">su {kpis.count} note spese</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Totale Rimborsato</p>
            <p className="text-2xl font-black text-emerald-600">€ {kpis.totalReimbursed.toFixed(2)}</p>
            <span className="text-[11px] text-emerald-700 font-semibold">importo approvato</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-todde rounded-2xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">In Attesa di Liquidazione</p>
            <p className="text-2xl font-black text-todde">€ {kpis.pendingTotal.toFixed(2)}</p>
            <span className="text-[11px] text-todde font-bold">{kpis.pendingCount} da verificare</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Pratiche Gestite</p>
            <p className="text-2xl font-black text-blue-600">{kpis.count}</p>
            <span className="text-[11px] text-gray-400">filtro attuale</span>
          </div>
        </div>
      </div>

      {/* GRAFICO A DOPPIA BARRA MENSILE A CONFRONTO */}
      {showChart && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-todde" />
                <h3 className="text-base font-extrabold text-gray-800">
                  Andamento Mensile Spese & Rimborsi
                </h3>
              </div>

              {/* LEGENDA COLORI */}
              <div className="flex items-center gap-3 text-xs font-bold pl-2 border-l border-gray-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-todde"></span>
                  <span className="text-gray-600">Richiesto</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-gray-600">Rimborsato</span>
                </div>
              </div>
            </div>

            {/* SELETTORE ANNO */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">Anno:</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-gray-100 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 outline-none cursor-pointer"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          </div>

          {/* BARRE DEL GRAFICO (DOPPIE: RICHIESTO + RIMBORSATO) */}
          <div className="pt-4">
            <div className="grid grid-cols-12 gap-1 sm:gap-2 items-end h-44 border-b border-gray-200 pb-2">
              {MONTH_NAMES.map((mName, idx) => {
                const stat = monthlyStats.monthlyData[idx];
                
                // Percentuali di altezza con minimo del 5% per renderle visibili
                const reqPercent = stat.requested > 0 
                  ? Math.max(6, Math.min(100, Math.round((stat.requested / monthlyStats.maxVal) * 100))) 
                  : 0;

                const reimbPercent = stat.reimbursed > 0 
                  ? Math.max(6, Math.min(100, Math.round((stat.reimbursed / monthlyStats.maxVal) * 100))) 
                  : 0;

                return (
                  <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group relative">
                    {/* TOOLTIP INTERATTIVO SU HOVER */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-gray-900 text-white text-[11px] py-2 px-3 rounded-xl shadow-2xl z-30 whitespace-nowrap pointer-events-none">
                      <span className="font-bold text-amber-300">{mName} {selectedYear}</span>
                      <span className="text-rose-200">🍷 Spesa Richiesta: € {stat.requested.toFixed(2)}</span>
                      <span className="text-emerald-300">🟢 Da Rimborsare: € {stat.reimbursed.toFixed(2)}</span>
                      <span className="text-gray-400 text-[10px] mt-0.5">({stat.count} note spese)</span>
                    </div>

                    {/* COPPIA DI BARRE AFFIANCATE */}
                    <div className="w-full bg-gray-50 rounded-t-xl overflow-hidden h-36 flex items-end justify-center gap-1 p-0.5">
                      {/* BARRA 1: RICHIESTO (BORDEAUX TODDE) */}
                      <div className="w-1/2 flex items-end h-full">
                        <div
                          style={{ height: `${reqPercent}%` }}
                          className={`w-full rounded-t-md transition-all duration-500 ${
                            stat.requested > 0 
                              ? 'bg-todde group-hover:opacity-90' 
                              : 'bg-transparent'
                          }`}
                        />
                      </div>

                      {/* BARRA 2: RIMBORSATO (VERDE) */}
                      <div className="w-1/2 flex items-end h-full">
                        <div
                          style={{ height: `${reimbPercent}%` }}
                          className={`w-full rounded-t-md transition-all duration-500 ${
                            stat.reimbursed > 0 
                              ? 'bg-emerald-500 group-hover:opacity-90' 
                              : 'bg-transparent'
                          }`}
                        />
                      </div>
                    </div>

                    {/* NOME MESE */}
                    <span className="text-[10px] sm:text-xs font-bold text-gray-500">
                      {mName}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center pt-2 text-[11px] text-gray-400">
              <span>Scala massima grafico: € {monthlyStats.maxVal.toFixed(2)}</span>
              <span className="italic">Passa con il mouse sopra le barre per i dettagli</span>
            </div>
          </div>
        </div>
      )}

      {/* FILTRI DI RICERCA, SEDE E STATO */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-3xl shadow-sm border border-gray-200">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per autista, gruppo o ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-todde"
          />
        </div>

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2">
          <MapPin size={16} className="text-gray-400" />
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer"
          >
            <option value="tutte">Tutte le Sedi</option>
            <option value="TB">Sede TB</option>
            <option value="MTE">Sede MTE</option>
            <option value="MTC">Sede MTC</option>
          </select>
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === st.id ? 'bg-white text-todde shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>{st.label}</span>
              {st.id === 'in attesa' && pendingCount > 0 && (
                <span className="flex items-center justify-center bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full shadow-sm font-black">
                  {pendingCount}
                </span>
              )}
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
            Nessuna nota spese trovata con i filtri impostati.
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

                        {branch && (
                          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-300 shadow-sm">
                            {branch}
                          </span>
                        )}

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

                  {/* IMPORTI */}
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
                    <button
                      onClick={() => handleDuplicateRevision(exp)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition border border-purple-200"
                      title="Duplica e crea una revisione protetta"
                    >
                      <Copy size={14} />
                      <span>Duplica (Revisione)</span>
                    </button>

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