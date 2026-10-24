"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Info, Search, Filter, CalendarDays, MapPin, UserCheck, AlertTriangle, UserX 
} from 'lucide-react';

export default function CalendarPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  
  // --- STATI PER I FILTRI ---
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('tutte');
  const [branchFilter, setBranchFilter] = useState('tutte'); // TB, MTE, MTC
  const [typeFilter, setTypeFilter] = useState('tutte');
  
  // DI DEFAULT ATTIVO SU TRUE: MOSTRA SUBITO SOLO GLI ASSENTI!
  const [onlyAbsent, setOnlyAbsent] = useState(true); 

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: empData } = await supabase
      .from('tbpr_employees')
      .select('*, tbpr_roles(role_name)');
    const { data: reqData } = await supabase
      .from('tbpr_requests')
      .select('*')
      .eq('status', 'accettata');
    
    if (empData) setEmployees(empData);
    if (reqData) setRequests(reqData);
    setLoading(false);
  }

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('it-IT', { month: 'long' });
  const year = currentDate.getFullYear();
  const today = new Date().getDate();
  const isCurrentMonth = new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === year;

  // Ruoli e tipi richiesta disponibili
  const availableRoles = useMemo(() => {
    const roles = employees.map(emp => emp.tbpr_roles?.role_name).filter(Boolean);
    return Array.from(new Set(roles));
  }, [employees]);

  const availableTypes = useMemo(() => {
    const types = requests.map(r => r.request_type).filter(Boolean);
    return Array.from(new Set(types));
  }, [requests]);

  // Richieste filtrate per tipo
  const requestsToDisplay = useMemo(() => {
    if (typeFilter === 'tutte') return requests;
    return requests.filter(r => r.request_type === typeFilter);
  }, [requests, typeFilter]);

  // Controllo assenza giornaliera
  const getStatusForDay = (empId: string, day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const req = requestsToDisplay.find(r => 
      r.employee_id === empId && 
      dateStr >= r.start_date && 
      dateStr <= (r.end_date || r.start_date)
    );
    return req ? { type: req.request_type, color: 'bg-todde' } : null;
  };

  // Controlla se il dipendente ha ALMENO un'assenza nel mese
  const hasAbsenceInMonth = (empId: string) => {
    const startOfMonth = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
    const endOfMonth = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    return requestsToDisplay.some(r => 
      r.employee_id === empId &&
      r.start_date <= endOfMonth &&
      (r.end_date || r.start_date) >= startOfMonth
    );
  };

  // Filtro dipendenti base (Ricerca + Ruolo + Sede)
  const baseFilteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      const matchesSearch = fullName.includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'tutte' || emp.tbpr_roles?.role_name === roleFilter;
      const matchesBranch = branchFilter === 'tutte' || emp.branch === branchFilter;
      return matchesSearch && matchesRole && matchesBranch;
    });
  }, [employees, searchQuery, roleFilter, branchFilter]);

  // Quanti dipendenti hanno assenze con i filtri attuali
  const absentEmployeesCount = useMemo(() => {
    return baseFilteredEmployees.filter(emp => hasAbsenceInMonth(emp.id)).length;
  }, [baseFilteredEmployees, requestsToDisplay, currentDate]);

  // Dipendenti a video: se onlyAbsent è true, mostra solo chi ha assenze
  const displayedEmployees = useMemo(() => {
    if (onlyAbsent || typeFilter !== 'tutte') {
      return baseFilteredEmployees.filter(emp => hasAbsenceInMonth(emp.id));
    }
    return baseFilteredEmployees;
  }, [baseFilteredEmployees, onlyAbsent, typeFilter, requestsToDisplay, currentDate]);

  // Conteggio assenze giorno per giorno
  const dailyAbsenceCounts = useMemo(() => {
    const counts: { [day: number]: number } = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const count = baseFilteredEmployees.filter(emp => {
        return requestsToDisplay.some(r => 
          r.employee_id === emp.id && 
          dateStr >= r.start_date && 
          dateStr <= (r.end_date || r.start_date)
        );
      }).length;
      counts[day] = count;
    }
    return counts;
  }, [daysInMonth, year, currentDate, baseFilteredEmployees, requestsToDisplay]);

  // Giorno più critico
  const criticalDay = useMemo(() => {
    let maxDay = 0;
    let maxCount = 0;
    Object.entries(dailyAbsenceCounts).forEach(([day, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxDay = Number(day);
      }
    });
    return { day: maxDay, count: maxCount };
  }, [dailyAbsenceCounts]);

  const absentTodayCount = isCurrentMonth ? (dailyAbsenceCounts[today] || 0) : 0;
  const inServiceTodayCount = Math.max(0, baseFilteredEmployees.length - absentTodayCount);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  if (loading) return <div className="p-10 text-center font-bold text-gray-500">Caricamento calendario...</div>;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-todde p-2 rounded-xl text-white">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 leading-none">Calendario Presenze</h2>
            <p className="text-xs text-gray-400 mt-1">Visualizzazione assenze approvate</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-gray-100 p-2 rounded-2xl">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm"><ChevronLeft size={20} /></button>
          <span className="text-lg font-extrabold capitalize text-gray-700 min-w-[160px] text-center">
            {monthName} <span className="text-todde">{year}</span>
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* 3 MINI-CARD STATISTICHE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">In Servizio Oggi</p>
            <p className="text-2xl font-extrabold text-gray-800">
              {isCurrentMonth ? `${inServiceTodayCount} / ${baseFilteredEmployees.length}` : `${baseFilteredEmployees.length} totali`}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <UserX size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Assenti Oggi</p>
            <p className="text-2xl font-extrabold text-gray-800">
              {isCurrentMonth ? `${absentTodayCount} dipendenti` : '—'}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-todde rounded-xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Giorno Più Critico</p>
            <p className="text-2xl font-extrabold text-gray-800">
              {criticalDay.count > 0 ? `${criticalDay.day} ${monthName} (${criticalDay.count} assenti)` : 'Nessuna assenza'}
            </p>
          </div>
        </div>
      </div>

      {/* BARRA FILTRI */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-3xl shadow-sm border border-gray-200">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cerca dipendente..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-todde transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filtro Sede */}
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

        {/* Filtro Ruolo */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <Filter size={16} className="text-gray-400" />
          <select 
            className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="tutte">Tutti i ruoli</option>
            {availableRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        {/* Filtro Tipo Richiesta */}
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

        {/* PULSANTE INTERRUTTORE DIRETTO E CHIARO */}
        <button
          type="button"
          onClick={() => setOnlyAbsent(!onlyAbsent)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
            onlyAbsent 
              ? 'bg-todde text-white border-todde shadow-sm' 
              : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
          }`}
          title={onlyAbsent ? "Clicca per mostrare tutti i dipendenti" : "Clicca per mostrare solo gli assenti"}
        >
          <span className={`w-2 h-2 rounded-full ${onlyAbsent ? 'bg-white animate-pulse' : 'bg-gray-400'}`}></span>
          {onlyAbsent ? `Solo con assenze (${absentEmployeesCount})` : `Tutti i dipendenti (${baseFilteredEmployees.length})`}
        </button>
      </div>

      {/* INFO BAR */}
      <div className="flex items-center gap-4 text-xs font-medium text-gray-500 px-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-todde rounded-full"></span> Assenza
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded-full"></span> Oggi
        </div>
        <div className="ml-auto flex items-center gap-1 text-gray-400 italic">
          <Info size={14} /> Scorri verso destra per vedere tutto il mese
        </div>
      </div>

      {/* TABELLA CALENDARIO */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              {/* RIGA INTESTAZIONE GIORNI */}
              <tr className="bg-gray-50">
                <th className="p-4 text-left text-xs font-bold text-gray-400 uppercase border-b sticky left-0 bg-gray-50 z-30 min-w-[260px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Dipendenti ({displayedEmployees.length})
                </th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                  <th 
                    key={day} 
                    className={`p-2 text-center text-xs font-bold border-b min-w-[45px] transition-colors ${isCurrentMonth && day === today ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                  >
                    {day}
                  </th>
                ))}
              </tr>

              {/* RIGA RIEPILOGO TOTALE ASSENTI */}
              <tr className="bg-gray-100/70 border-b-2 border-gray-300 font-bold text-xs">
                <td className="p-3 text-left sticky left-0 bg-gray-100 z-30 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>TOTALE ASSENTI</span>
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">Giorno</span>
                  </div>
                </td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const count = dailyAbsenceCounts[day] || 0;
                  const isHigh = count >= 5;
                  return (
                    <td 
                      key={`total-${day}`} 
                      className={`p-1 text-center font-bold text-xs ${
                        count === 0 
                          ? 'text-gray-400' 
                          : isHigh 
                            ? 'bg-rose-100 text-todde font-extrabold' 
                            : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {count > 0 ? count : '—'}
                    </td>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {displayedEmployees.length > 0 ? (
                displayedEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors border-b last:border-0">
                    <td className="p-4 text-sm font-bold text-gray-700 sticky left-0 bg-white z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="uppercase">{emp.first_name} {emp.last_name}</span>
                          {emp.branch && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-300">
                              {emp.branch}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-normal text-gray-400 uppercase">{emp.tbpr_roles?.role_name}</span>
                      </div>
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const status = getStatusForDay(emp.id, day);
                      const isToday = isCurrentMonth && day === today;
                      return (
                        <td key={day} className={`p-1 text-center ${isToday ? 'bg-blue-50/50' : ''}`}>
                          <div 
                            title={status ? `${status.type}` : 'Presente'}
                            className={`w-full h-8 rounded-lg transition-all cursor-help ${
                              status 
                                ? status.color + ' text-white text-[10px] flex items-center justify-center font-bold shadow-inner scale-95 hover:scale-100' 
                                : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            {status && status.type[0]}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={daysInMonth + 1} className="p-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CalendarDays size={32} className="text-gray-300" />
                      <p className="font-semibold text-gray-600">Nessuna assenza registrata per questo mese con i filtri selezionati.</p>
                      <button 
                        onClick={() => setOnlyAbsent(false)} 
                        className="text-xs text-todde font-bold hover:underline mt-1"
                      >
                        Mostra tutti i dipendenti presenti
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 12px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
          border: 3px solid #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #852136;
        }
      `}</style>
    </div>
  );
}