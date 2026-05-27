"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';

export default function CalendarPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: empData } = await supabase.from('tbpr_employees').select('*, tbpr_roles(role_name)');
    const { data: reqData } = await supabase.from('tbpr_requests').select('*').eq('status', 'accettata');
    
    if (empData) setEmployees(empData);
    if (reqData) setRequests(reqData);
    setLoading(false);
  }

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('it-IT', { month: 'long' });
  const year = currentDate.getFullYear();
  const today = new Date().getDate();
  const isCurrentMonth = new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === year;

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const getStatusForDay = (empId: string, day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const req = requests.find(r => 
      r.employee_id === empId && 
      dateStr >= r.start_date && 
      dateStr <= (r.end_date || r.start_date)
    );
    return req ? { type: req.request_type, color: 'bg-todde' } : null;
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

      {/* GRID CONTAINER */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-4 text-left text-xs font-bold text-gray-400 uppercase border-b sticky left-0 bg-gray-50 z-30 min-w-[250px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Dipendente
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
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors border-b last:border-0">
                  <td className="p-4 text-sm font-bold text-gray-700 sticky left-0 bg-white z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                    <div className="flex flex-col">
                      <span>{emp.first_name} {emp.last_name}</span>
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
                          className={`w-full h-8 rounded-lg transition-all cursor-help ${status ? status.color + ' text-white text-[10px] flex items-center justify-center font-bold shadow-inner scale-95 hover:scale-100' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          {status && status.type[0]}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
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