"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Calendar, User, Send, CheckCircle, XCircle, HelpCircle, Clock, LogOut } from 'lucide-react';

export default function PrivateArea() {
  const params = useParams();
  const router = useRouter();
  const employeeIdFromUrl = params?.id as string;

  const [step, setStep] = useState<'loading' | 'login' | 'dashboard'>('loading');
  const [pin, setPin] = useState('');
  const [employee, setEmployee] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [reqType, setReqType] = useState('FERIE');
  const [formData, setFormData] = useState({
    start_date: '', end_date: '', start_time: '', end_time: '', protocol_number: '', notes: ''
  });

  // --- GESTIONE SESSIONE AL CARICAMENTO ---
  useEffect(() => {
    const checkSession = async () => {
      const savedEmpId = localStorage.getItem('todde_emp_id');
      const savedLinkId = localStorage.getItem('todde_link_id');

      if (savedEmpId && savedLinkId === employeeIdFromUrl) {
        // Proviamo a recuperare i dati del dipendente per confermare la sessione
        const { data } = await supabase.from('tbpr_employees').select('*').eq('id', savedEmpId).single();
        if (data) {
          setEmployee(data);
          setStep('dashboard');
          fetchRequests(data.id);
          return;
        }
      }
      setStep('login');
    };
    checkSession();
  }, [employeeIdFromUrl]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeIdFromUrl) return alert("Link non valido");

    setLoading(true);
    const { data, error } = await supabase
      .from('tbpr_employees')
      .select('*')
      .eq('private_link_id', employeeIdFromUrl)
      .eq('pin', pin)
      .single();

    if (error || !data) {
      alert("PIN errato!");
    } else {
      // SALViamo la sessione
      localStorage.setItem('todde_emp_id', data.id);
      localStorage.setItem('todde_link_id', employeeIdFromUrl);
      
      setEmployee(data);
      setStep('dashboard');
      fetchRequests(data.id);
    }
    setLoading(false);
  }

  async function logout() {
    localStorage.removeItem('todde_emp_id');
    localStorage.removeItem('todde_link_id');
    setStep('login');
    setEmployee(null);
  }

  async function fetchRequests(empId: string) {
    const { data } = await supabase.from('tbpr_requests').select('*').eq('employee_id', empId).order('created_at', { ascending: false });
    if (data) setRequests(data);
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const cleanedData = {
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      protocol_number: formData.protocol_number || null,
      notes: formData.notes || null,
    };

    const { error } = await supabase.from('tbpr_requests').insert([{
      employee_id: employee.id,
      request_type: reqType,
      ...cleanedData
    }]);

    if (error) alert("Errore invio: " + error.message);
    else {
      alert("Richiesta inviata con successo!");
      setFormData({ start_date: '', end_date: '', start_time: '', end_time: '', protocol_number: '', notes: '' });
      fetchRequests(employee.id);
    }
    setLoading(false);
  }

  if (step === 'loading') return <div className="min-h-screen flex items-center justify-center bg-gray-100">Caricamento...</div>;

  if (step === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border-t-[12px] border-todde text-center">
          <div className="bg-todde w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg">
            <User size={40} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Todde Bus</h1>
          <p className="text-gray-500 mb-8">Inserisci il tuo PIN per accedere</p>
          <form onSubmit={handleLogin} className="space-y-6">
            <input 
              type="text" maxLength={6} required 
              className="w-full p-4 text-center text-4xl tracking-[0.5em] border-2 rounded-2xl focus:border-todde outline-none transition-all bg-gray-50"
              placeholder="000000"
              value={pin} onChange={e => setPin(e.target.value)}
            />
            <button disabled={loading} type="submit" className="w-full bg-todde text-white p-4 rounded-2xl font-bold text-xl hover:bg-todde-dark transition-all shadow-lg disabled:bg-gray-400">
              {loading ? 'Verifica...' : 'Accedi Ora'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10 font-sans">
      <header className="bg-todde text-white p-8 rounded-b-[40px] shadow-xl">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <p className="text-sm opacity-80 font-medium">Area Personale</p>
            <h2 className="text-3xl font-bold">{employee.first_name} {employee.last_name}</h2>
          </div>
          <button onClick={logout} className="bg-white/20 p-3 rounded-2xl hover:bg-white/30 transition-all" title="Esci">
            <LogOut size={24} />
          </button>
        </div>
      </header>

      <main className="p-4 space-y-8 max-w-2xl mx-auto mt-6">
        <div className="bg-white p-6 rounded-3xl shadow-md border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Send size={24} className="text-todde" /> Nuova Richiesta
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
            {['FERIE', 'PERMESSO', 'MALATTIA', 'CONGEDO', 'LUTTO'].map(type => (
              <button 
                key={type} 
                onClick={() => setReqType(type)}
                className={`p-3 text-xs font-bold rounded-xl border transition-all ${reqType === type ? 'bg-todde text-white border-todde shadow-md scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-todde'}`}
              >
                {type}
              </button>
            ))}
          </div>

          <form onSubmit={submitRequest} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Dal</label>
                <input type="date" required className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-all" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Al</label>
                <input type="date" className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-all" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
              </div>
            </div>

            {reqType === 'PERMESSO' && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Ora Inizio</label>
                  <input type="time" required className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-all" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Ora Fine</label>
                  <input type="time" required className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-all" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                </div>
              </div>
            )}

            {reqType === 'MALATTIA' && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Protocollo Certificato</label>
                <input type="text" required placeholder="Es. 12345/2024" className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-all" value={formData.protocol_number} onChange={e => setFormData({...formData, protocol_number: e.target.value})} />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Note Aggiuntive</label>
              <textarea className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-all" rows={3} placeholder="Scrivi qui eventuali dettagli..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
            </div>

            <button disabled={loading} type="submit" className="w-full bg-todde text-white p-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-todde-dark transition-all active:scale-95 disabled:bg-gray-400">
              {loading ? 'Invio in corso...' : 'Invia Richiesta'}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 px-2">
            <Calendar size={24} className="text-todde" /> Stato Richieste
          </h3>
          {requests.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl text-center text-gray-400 italic border border-dashed border-gray-300">
              Non hai ancora inviato richieste
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="bg-white p-5 rounded-2xl shadow-sm border-l-8 flex justify-between items-center transition-all hover:shadow-md" style={{ borderColor: req.status === 'accettata' ? '#22c55e' : req.status === 'rifiutata' ? '#ef4444' : '#f59e0b' }}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-800">{req.request_type}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${req.status === 'accettata' ? 'bg-green-100 text-green-600' : req.status === 'rifiutata' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        {req.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={12} /> {req.start_date} {req.end_date ? ` → ${req.end_date}` : ''}
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {req.status === 'accettata' ? <CheckCircle size={24} className="text-green-500" /> : req.status === 'rifiutata' ? <XCircle size={24} className="text-red-500" /> : <HelpCircle size={24} className="text-yellow-500" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}