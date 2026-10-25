"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, Trash2, Copy, MessageCircle, Edit3, PlusCircle, Search, Mail, Loader2 } from 'lucide-react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Form Dipendente
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    role_id: '',
    branch: ''
  });

  // Form Nuova Categoria
  const [newRoleName, setNewRoleName] = useState('');

  useEffect(() => {
    fetchRoles();
    fetchEmployees();
  }, []);

  async function fetchRoles() {
    const { data } = await supabase.from('tbpr_roles').select('*').order('role_name');
    if (data) setRoles(data);
  }

  async function fetchEmployees() {
    setLoading(true);
    const { data } = await supabase
      .from('tbpr_employees')
      .select('*, tbpr_roles(role_name)')
      .order('created_at', { ascending: false });
    if (data) setEmployees(data);
    setLoading(false);
  }

  // --- RICERCA ---
  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const phone = (emp.phone || '').toLowerCase();
    const email = (emp.email || '').toLowerCase();
    const branch = (emp.branch || '').toLowerCase();
    const query = search.toLowerCase();
    return fullName.includes(query) || phone.includes(query) || email.includes(query) || branch.includes(query);
  });

  // --- GESTIONE CATEGORIE ---
  async function addRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoleName) return;
    const { error } = await supabase.from('tbpr_roles').insert([{ role_name: newRoleName }]);
    if (error) alert("Errore: " + error.message);
    else {
      setNewRoleName('');
      fetchRoles();
    }
  }

  // --- GESTIONE DIPENDENTI ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingId) {
      const { error } = await supabase.from('tbpr_employees').update(formData).eq('id', editingId);
      if (error) alert("Errore modifica: " + error.message);
      else {
        alert("Dipendente aggiornato!");
        setEditingId(null);
      }
    } else {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      const privateLinkId = Math.random().toString(36).substring(2, 12);
      const { error } = await supabase.from('tbpr_employees').insert([{ ...formData, pin, private_link_id: privateLinkId }]);
      if (error) alert("Errore inserimento: " + error.message);
      else alert("Dipendente inserito!");
    }

    setFormData({ first_name: '', last_name: '', phone: '', email: '', role_id: '', branch: '' });
    fetchEmployees();
  }

  function startEdit(emp: any) {
    setEditingId(emp.id);
    setFormData({
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      phone: emp.phone || '',
      email: emp.email || '',
      role_id: emp.role_id || '',
      branch: emp.branch || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteEmployee(id: string) {
    if (confirm("Eliminare definitivamente questo dipendente?")) {
      await supabase.from('tbpr_employees').delete().eq('id', id);
      fetchEmployees();
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Link copiato!");
  };

  const sendWhatsApp = (emp: any) => {
    const link = `${window.location.origin}/private/${emp.private_link_id}`;
    const message = `Ciao ${emp.first_name}, ecco il tuo accesso all'area privata Todde Bus:%0A%0ALink: ${link}%0APIN: ${emp.pin}`;
    window.open(`https://wa.me/${emp.phone}?text=${message}`, '_blank');
  };

  // --- INVIO EMAIL CREDENZIALI (ARUBA + LOG SU SUPABASE) ---
  const sendEmailCredentials = async (emp: any) => {
    if (!emp.email) {
      alert("Questo dipendente non ha ancora un'email registrata. Clicca sulla matita ✏️ per aggiungerla!");
      return;
    }

    if (!confirm(`Inviare le credenziali di accesso via email a ${emp.first_name} (${emp.email})?`)) return;

    setSendingEmailId(emp.id);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'credentials',
          employeeId: emp.id,
          recipientEmail: emp.email,
          firstName: emp.first_name,
          pin: emp.pin,
          privateLinkId: emp.private_link_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore durante l'invio");

      alert(`✅ Email inviata con successo a ${emp.email}!\nUna copia è stata recapitata a gestione.permessi@mtexplore.it`);
    } catch (err: any) {
      alert("❌ Errore durante l'invio: " + err.message);
    } finally {
      setSendingEmailId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="text-todde" size={32} />
        <h2 className="text-3xl font-bold text-gray-800">Gestione Personale</h2>
      </div>

      {/* SEZIONE NUOVA CATEGORIA */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-4">
        <span className="text-sm font-bold text-gray-500 uppercase">Nuova Categoria:</span>
        <form onSubmit={addRole} className="flex gap-2">
          <input 
            type="text" 
            placeholder="Es. Autista" 
            className="p-2 border rounded-md text-sm w-48" 
            value={newRoleName} 
            onChange={e => setNewRoleName(e.target.value)} 
          />
          <button type="submit" className="bg-gray-800 text-white p-2 rounded-md hover:bg-black transition">
            <PlusCircle size={18} />
          </button>
        </form>
      </div>

      {/* FORM DIPENDENTE (CON EMAIL E SEDE) */}
      <form onSubmit={handleSubmit} className={`p-6 rounded-xl shadow-md grid grid-cols-1 md:grid-cols-6 gap-3 border-t-4 transition ${editingId ? 'border-blue-500 bg-blue-50' : 'border-todde bg-white'}`}>
        <div className="md:col-span-6">
          <h3 className="font-bold text-lg mb-2">{editingId ? '📝 Modifica Dipendente' : '👤 Nuovo Dipendente'}</h3>
        </div>
        <input 
          type="text" 
          placeholder="Nome" 
          required 
          className="p-2 border rounded-md bg-white text-sm" 
          value={formData.first_name} 
          onChange={e => setFormData({...formData, first_name: e.target.value})} 
        />
        <input 
          type="text" 
          placeholder="Cognome" 
          required 
          className="p-2 border rounded-md bg-white text-sm" 
          value={formData.last_name} 
          onChange={e => setFormData({...formData, last_name: e.target.value})} 
        />
        <input 
          type="text" 
          placeholder="Telefono (es. 39...)" 
          className="p-2 border rounded-md bg-white text-sm" 
          value={formData.phone} 
          onChange={e => setFormData({...formData, phone: e.target.value})} 
        />
        <input 
          type="email" 
          placeholder="Email dipendente" 
          className="p-2 border rounded-md bg-white text-sm" 
          value={formData.email} 
          onChange={e => setFormData({...formData, email: e.target.value})} 
        />
        <select 
          required 
          className="p-2 border rounded-md bg-white text-sm" 
          value={formData.role_id} 
          onChange={e => setFormData({...formData, role_id: e.target.value})}
        >
          <option value="">Seleziona Ruolo</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
        </select>
        <select 
          required 
          className="p-2 border rounded-md bg-white text-sm font-medium" 
          value={formData.branch} 
          onChange={e => setFormData({...formData, branch: e.target.value})}
        >
          <option value="">Seleziona Sede</option>
          <option value="TB">TB</option>
          <option value="MTE">MTE</option>
          <option value="MTC">MTC</option>
        </select>

        <div className="md:col-span-6 flex gap-2 mt-2">
          <button type="submit" className={`${editingId ? 'bg-blue-600' : 'bg-todde'} text-white px-6 py-2 rounded-md font-bold hover:opacity-90 transition text-sm`}>
            {editingId ? 'Salva Modifiche' : 'Aggiungi Dipendente'}
          </button>
          {editingId && (
            <button 
              type="button" 
              onClick={() => {
                setEditingId(null); 
                setFormData({ first_name: '', last_name: '', phone: '', email: '', role_id: '', branch: '' });
              }} 
              className="bg-gray-400 text-white px-6 py-2 rounded-md font-bold hover:bg-gray-500 transition text-sm"
            >
              Annulla
            </button>
          )}
        </div>
      </form>

      {/* BARRA DI RICERCA */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Cerca per nome, email, telefono o sede..." 
          className="w-full pl-10 p-3 border rounded-xl shadow-sm outline-none focus:border-todde transition bg-white"
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      {/* TABELLA */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-bold">
              <tr>
                <th className="p-4">Dipendente</th>
                <th className="p-4">Ruolo</th>
                <th className="p-4">PIN</th>
                <th className="p-4 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="p-4 text-center">Caricamento...</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-gray-400 italic">Nessun dipendente trovato.</td></tr>
              ) : filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50 transition">
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 uppercase">
                        {emp.first_name} {emp.last_name}
                      </span>
                      {emp.branch && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-300">
                          {emp.branch}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 space-x-2 mt-0.5">
                      {emp.phone && <span>{emp.phone}</span>}
                      {emp.email && <span className="text-gray-600 font-medium">• {emp.email}</span>}
                    </div>
                  </td>
                  <td className="p-4"><span className="px-2 py-1 bg-gray-200 rounded-full text-xs font-medium text-gray-700">{emp.tbpr_roles?.role_name}</span></td>
                  <td className="p-4 font-mono font-bold text-todde">{emp.pin}</td>
                  <td className="p-4 flex justify-center gap-2">
                    <button onClick={() => startEdit(emp)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-md transition" title="Modifica"><Edit3 size={18} /></button>
                    <button onClick={() => copyToClipboard(`${window.location.origin}/private/${emp.private_link_id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition" title="Copia Link"><Copy size={18} /></button>
                    <button onClick={() => sendWhatsApp(emp)} className="p-2 text-green-600 hover:bg-green-50 rounded-md transition" title="Invia WhatsApp"><MessageCircle size={18} /></button>
                    
                    {/* BOTTONE INVIA EMAIL */}
                    <button 
                      onClick={() => sendEmailCredentials(emp)} 
                      disabled={sendingEmailId === emp.id}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-md transition disabled:opacity-40" 
                      title={emp.email ? "Invia credenziali via Email" : "Inserisci un'email con la matita ✏️"}
                    >
                      {sendingEmailId === emp.id ? (
                        <Loader2 size={18} className="animate-spin text-purple-600" />
                      ) : (
                        <Mail size={18} />
                      )}
                    </button>

                    <button onClick={() => deleteEmployee(emp.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-md transition" title="Elimina"><Trash2 size={18} /></button>
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