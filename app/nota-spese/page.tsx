"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Bus, Calendar, Camera, CheckCircle2, Trash2, 
  Loader2, ArrowRight, PenTool, RefreshCw, Plus, 
  Search, User, Receipt, X 
} from 'lucide-react';

interface ExpenseItem {
  id: string;
  category: string;
  amount: string;
  payment: string;
  cardNumber: string;
  description: string;
  receipts: string[];
}

const CATEGORIES = [
  { id: 'meals', label: 'Pasti 🍝' },
  { id: 'parking', label: 'Parcheggi / ZTL 🅿️' },
  { id: 'fuel', label: 'Carburante ⛽' },
  { id: 'adblue', label: 'AdBlue 💧' },
  { id: 'toll', label: 'Pedaggi Autostradali 🛣️' },
  { id: 'repairs', label: 'Riparazioni 🔧' },
  { id: 'lodging', label: 'Pernotto 🏨' },
  { id: 'washing', label: 'Lavaggio Mezzo 🚿' },
  { id: 'other', label: 'Altre Spese Varie 📦' },
];

export default function DriverExpensePage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // Dati Autista
  const [driverSearch, setDriverSearch] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [isManualDriver, setIsManualDriver] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Date e Servizio
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [groupName, setGroupName] = useState('');

  // Lista dinamica spese
  const [items, setItems] = useState<ExpenseItem[]>([
    {
      id: 'item-1',
      category: 'meals',
      amount: '',
      payment: 'Contanti',
      cardNumber: '',
      description: '',
      receipts: []
    }
  ]);

  // Canvas Firma Touch
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasSigned, setHasSigned] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    async function fetchDrivers() {
      const { data } = await supabase.from('tbpr_employees').select('id, first_name, last_name, branch').order('last_name');
      if (data) setEmployees(data);
    }
    fetchDrivers();
  }, []);

  const suggestions = driverSearch.trim().length >= 2 
    ? employees.filter(emp => {
        const full = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        return full.includes(driverSearch.toLowerCase());
      })
    : [];

  const handleSelectDriver = (emp: any) => {
    setSelectedDriver(`${emp.first_name} ${emp.last_name}`);
    setSelectedBranch(emp.branch || null);
    setDriverSearch('');
    setShowSuggestions(false);
    setIsManualDriver(false);
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        category: 'meals',
        amount: '',
        payment: 'Contanti',
        cardNumber: '',
        description: '',
        receipts: []
      }
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      alert("Devi mantenere almeno una voce di spesa!");
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ExpenseItem, value: any) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  };

  // UPLOAD SCONTRINO (SENZA RADDOPPIO!)
  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingIndex(index);
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error } = await supabase.storage.from('expense-receipts').upload(filePath, file);

      if (error) {
        alert("Errore upload file: " + error.message);
      } else {
        const { data: publicUrlData } = supabase.storage.from('expense-receipts').getPublicUrl(filePath);
        if (publicUrlData) newUrls.push(publicUrlData.publicUrl);
      }
    }

    // Aggiornamento immutabile e pulito anti-duplicati
    setItems(prev => prev.map((it, i) => {
      if (i === index) {
        const merged = Array.from(new Set([...it.receipts, ...newUrls]));
        return { ...it, receipts: merged };
      }
      return it;
    }));

    e.target.value = '';
    setUploadingIndex(null);
  };

  const totalAmount = items.reduce((acc, curr) => {
    const val = parseFloat(curr.amount.replace(',', '.')) || 0;
    return acc + val;
  }, 0);

  // Canvas Touch
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  }, [submitted]);

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDriver) {
      alert("Identificati inserendo il tuo nome e cognome!");
      return;
    }

    if (totalAmount <= 0) {
      alert("Inserisci almeno un importo valido di spesa!");
      return;
    }

    if (!hasSigned) {
      alert("Firma con il dito nell'apposito riquadro prima di inviare!");
      return;
    }

    setSubmitting(true);

    try {
      const canvas = canvasRef.current;
      let signatureUrl = '';
      if (canvas) {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const sigPath = `signatures/sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.png`;
          const { error: sigError } = await supabase.storage.from('expense-receipts').upload(sigPath, blob);
          if (!sigError) {
            const { data } = supabase.storage.from('expense-receipts').getPublicUrl(sigPath);
            signatureUrl = data.publicUrl;
          }
        }
      }

      const getCatTotal = (cat: string) => items
        .filter(it => it.category === cat)
        .reduce((sum, it) => sum + (parseFloat(it.amount.replace(',', '.')) || 0), 0);

      const getCatReceipts = (cat: string) => Array.from(new Set(
        items.filter(it => it.category === cat).flatMap(it => it.receipts)
      ));

      const payload = {
        driver_name: selectedDriver,
        branch: selectedBranch,
        date_from: dateFrom,
        date_to: dateTo,
        group_name: groupName || null,
        total_amount: totalAmount,
        reimbursed_amount: totalAmount, // Di default coincide col totale, poi modificabile dall'amministrazione
        signature_url: signatureUrl || null,
        status: 'in attesa',
        is_latest: true,

        items: items.map(it => ({
          ...it,
          amount: parseFloat(it.amount.replace(',', '.')) || 0
        })),

        meals_amount: getCatTotal('meals'),
        meals_receipts: getCatReceipts('meals'),

        parking_amount: getCatTotal('parking'),
        parking_receipts: getCatReceipts('parking'),

        fuel_amount: getCatTotal('fuel'),
        fuel_receipts: getCatReceipts('fuel'),

        adblue_amount: getCatTotal('adblue'),
        adblue_receipts: getCatReceipts('adblue'),

        toll_amount: getCatTotal('toll'),
        toll_receipts: getCatReceipts('toll'),

        repairs_amount: getCatTotal('repairs'),
        repairs_receipts: getCatReceipts('repairs'),

        lodging_amount: getCatTotal('lodging'),
        lodging_receipts: getCatReceipts('lodging'),

        washing_amount: getCatTotal('washing'),
        washing_receipts: getCatReceipts('washing'),

        other_amount: getCatTotal('other'),
        other_receipts: getCatReceipts('other'),
      };

      const { error } = await supabase.from('tbpr_expenses').insert([payload]);
      if (error) throw error;

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      alert("Errore invio nota spese: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setHasSigned(false);
    setSelectedDriver('');
    setSelectedBranch(null);
    setDriverSearch('');
    setGroupName('');
    setItems([
      {
        id: 'item-1',
        category: 'meals',
        amount: '',
        payment: 'Contanti',
        cardNumber: '',
        description: '',
        receipts: []
      }
    ]);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border-t-8 border-emerald-500 space-y-5">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={46} />
          </div>
          <h2 className="text-2xl font-black text-gray-800">Nota Spese Trasmessa!</h2>
          <p className="text-sm text-gray-600">
            Grazie <strong>{selectedDriver}</strong>, la nota spese e gli scontrini allegati sono stati recapitati all'amministrazione.
          </p>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-bold text-gray-700">
            Totale Trasmesso: <span className="text-todde text-2xl font-black ml-1">€ {totalAmount.toFixed(2)}</span>
          </div>
          <button
            onClick={resetForm}
            className="w-full bg-todde text-white py-3.5 rounded-2xl font-bold shadow-md hover:opacity-95 transition"
          >
            Compila un'altra nota spese
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100/70 pb-20 font-sans">
      <header className="bg-gradient-to-r from-[#6e192a] via-[#852136] to-[#5b1423] text-white p-6 rounded-b-[36px] shadow-lg sticky top-0 z-40">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2.5 rounded-2xl border border-white/10 shadow-inner">
              <Bus size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider uppercase">TODDE BUS</h1>
              <p className="text-xs text-rose-200">Nuova Nota Spese Autista</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-rose-200 block">Totale</span>
            <span className="text-xl font-black text-white">€ {totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6 mt-2">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* IDENTIFICAZIONE AUTISTA */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 space-y-4">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <User size={16} className="text-todde" /> 1. Chi sei? (Autista)
            </h2>

            {selectedDriver ? (
              <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-todde/30 rounded-2xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Autista Selezionato</span>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-todde uppercase">{selectedDriver}</span>
                    {selectedBranch && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-gray-700 border border-gray-300">
                        {selectedBranch}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedDriver(''); setDriverSearch(''); setSelectedBranch(null); }}
                  className="text-xs font-bold text-gray-500 hover:text-red-600 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm"
                >
                  Cambia
                </button>
              </div>
            ) : isManualDriver ? (
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="Scrivi il tuo Nome e Cognome per intero..."
                  value={driverSearch}
                  onChange={e => setDriverSearch(e.target.value)}
                  className="w-full p-3.5 border border-gray-200 rounded-2xl bg-gray-50 focus:bg-white text-sm font-bold outline-none focus:border-todde"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { if (driverSearch.trim()) setSelectedDriver(driverSearch.trim()); }}
                    className="flex-1 bg-todde text-white py-2 rounded-xl text-xs font-bold"
                  >
                    Conferma Nome
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsManualDriver(false); setDriverSearch(''); }}
                    className="px-3 bg-gray-200 text-gray-700 py-2 rounded-xl text-xs font-bold"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Inizia a digitare il tuo cognome o nome..."
                    value={driverSearch}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={e => {
                      setDriverSearch(e.target.value);
                      setShowSuggestions(true);
                    }}
                    className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-2xl bg-gray-50 focus:bg-white text-sm font-medium outline-none focus:border-todde transition"
                  />
                </div>

                {showSuggestions && driverSearch.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 z-30 max-h-56 overflow-y-auto divide-y divide-gray-100">
                    {suggestions.length > 0 ? (
                      suggestions.map(emp => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => handleSelectDriver(emp)}
                          className="w-full p-3 text-left hover:bg-rose-50 text-sm font-bold text-gray-800 transition flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="uppercase">{emp.first_name} {emp.last_name}</span>
                            {emp.branch && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border">
                                {emp.branch}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-todde font-semibold">Seleziona</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-gray-500">
                        Nessun dipendente trovato per "{driverSearch}".
                        <button
                          type="button"
                          onClick={() => setIsManualDriver(true)}
                          className="block mx-auto mt-2 text-todde font-bold underline"
                        >
                          Scrivi il nome a mano libera
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* DATE */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Dal *</label>
                <input
                  type="date"
                  required
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium outline-none focus:border-todde"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Al *</label>
                <input
                  type="date"
                  required
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium outline-none focus:border-todde"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Gruppo / Servizio (Opzionale)</label>
              <input
                type="text"
                placeholder="Es. Juvenia, Marymount, Linea 5..."
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm outline-none focus:border-todde"
              />
            </div>
          </div>

          {/* ELENCO SPESE */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Receipt size={18} className="text-todde" /> 2. Ricevute & Scontrini ({items.length})
              </h2>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 bg-todde text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow hover:opacity-90 active:scale-95 transition"
              >
                <Plus size={14} /> Aggiungi spesa
              </button>
            </div>

            {items.map((item, index) => (
              <div key={item.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-extrabold uppercase text-gray-400">
                    Spesa #{index + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
                    >
                      <Trash2 size={13} /> Elimina voce
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Categoria *</label>
                  <select
                    value={item.category}
                    onChange={e => updateItem(index, 'category', e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:border-todde"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Importo (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={item.amount}
                      onChange={e => updateItem(index, 'amount', e.target.value)}
                      className="w-full p-3 bg-white border border-gray-200 rounded-xl text-base font-black text-gray-900 outline-none focus:border-todde"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Pagamento</label>
                    <select
                      value={item.payment}
                      onChange={e => updateItem(index, 'payment', e.target.value)}
                      className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-todde"
                    >
                      <option value="Contanti">Contanti</option>
                      <option value="Carta aziendale">Carta aziendale</option>
                      <option value="Carta personale">Carta personale</option>
                    </select>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Note o dettagli (es. Pranzo a Modena, Lavaggio esterno...)"
                    value={item.description}
                    onChange={e => updateItem(index, 'description', e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-todde"
                  />
                </div>

                {item.payment !== 'Contanti' && (
                  <input
                    type="text"
                    placeholder="Ultime 4 cifre carta (opzionale)"
                    value={item.cardNumber}
                    onChange={e => updateItem(index, 'cardNumber', e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-todde"
                  />
                )}

                <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer flex items-center gap-2 px-3.5 py-2 bg-rose-50 border border-todde/30 rounded-xl text-xs font-bold text-todde hover:bg-rose-100 transition shadow-sm">
                    <Camera size={16} />
                    <span>{uploadingIndex === index ? 'Caricamento foto...' : 'Fotografa Scontrino'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      className="hidden"
                      disabled={uploadingIndex === index}
                      onChange={e => handleFileUpload(index, e)}
                    />
                  </label>

                  {item.receipts.map((url, rIdx) => (
                    <div key={rIdx} className="relative group">
                      <img src={url} alt="Scontrino" className="w-10 h-10 object-cover rounded-xl border border-gray-300 shadow-sm" />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = item.receipts.filter((_, i) => i !== rIdx);
                          updateItem(index, 'receipts', updated);
                        }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
              className="w-full py-3.5 bg-white border-2 border-dashed border-gray-300 hover:border-todde text-gray-700 hover:text-todde rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition"
            >
              <Plus size={18} />
              <span>Aggiungi un'altra spesa / scontrino</span>
            </button>
          </div>

          {/* FIRMA TOUCH */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <PenTool size={16} className="text-todde" /> 3. La tua Firma con il Dito *
              </h2>
              <button
                type="button"
                onClick={clearSignature}
                className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
              >
                <RefreshCw size={12} /> Pulisci
              </button>
            </div>
            <p className="text-xs text-gray-400">Firma dentro al riquadro con il dito sullo schermo:</p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-2xl overflow-hidden bg-gray-50 touch-none">
              <canvas
                ref={canvasRef}
                width={360}
                height={160}
                className="w-full h-40 cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            {hasSigned && (
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={12} /> Firma apposta con successo
              </p>
            )}
          </div>

          {/* BARRA INVIA */}
          <div className="bg-white p-4 rounded-3xl shadow-xl border border-gray-200 flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Totale Complessivo</span>
              <span className="text-2xl font-black text-todde">€ {totalAmount.toFixed(2)}</span>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-todde text-white py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Invio in corso...</span>
                </>
              ) : (
                <>
                  <span>Invia Nota Spese</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}