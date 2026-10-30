"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BusFront, LockKeyhole, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DipendentiPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(pin)) {
      setError("Inserisci il PIN di 6 cifre ricevuto dall'azienda.");
      return;
    }

    setLoading(true);
    try {
      // ACCESSO DI PROVA: da sostituire con verifica server-side prima
      // di usare dati reali (RLS, sessioni e limite ai tentativi).
      const { data, error: queryError } = await supabase
        .from("tbpr_employees")
        .select("id, private_link_id")
        .eq("pin", pin)
        .limit(2);

      if (queryError) throw queryError;
      if (!data || data.length === 0) {
        setError("PIN non riconosciuto. Controlla le cifre e riprova.");
        return;
      }
      if (data.length !== 1 || !data[0].private_link_id) {
        setError("Accesso non disponibile. Contatta la direzione.");
        return;
      }

      const employee = data[0];
      // Compatibilità temporanea con l'attuale pagina /private/[id].
      // Questi valori NON sono una sessione autenticata sicura.
      localStorage.setItem("todde_emp_id", String(employee.id));
      localStorage.setItem("todde_link_id", String(employee.private_link_id));
      localStorage.setItem("todde_preferred_link", String(employee.private_link_id));
      // Passaggio temporaneo del PIN solo alla pagina privata nella stessa scheda.
      sessionStorage.setItem("todde_pin_handoff", JSON.stringify({ link: String(employee.private_link_id), pin }));

      router.replace(`/private/${encodeURIComponent(String(employee.private_link_id))}`);
    } catch (err) {
      console.error("Errore accesso dipendenti:", err);
      setError("Impossibile verificare il PIN. Riprova tra poco.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f7f3f4] via-white to-[#f0e5e8] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md overflow-hidden rounded-[30px] bg-white shadow-2xl border border-[#e9dfe2]">
        <div className="bg-gradient-to-r from-[#6e192a] to-[#8c2940] px-8 pt-10 pb-9 text-center text-white">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 border border-white/20 shadow-lg">
            <BusFront size={42} strokeWidth={1.8} />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Todde Bus</h1>
          <p className="mt-2 text-sm font-medium text-rose-100">Area riservata ai dipendenti</p>
        </div>

        <div className="px-7 py-9 sm:px-9">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8edf0] text-[#6e192a]">
              <LockKeyhole size={24} />
            </div>
            <h2 className="text-xl font-extrabold text-gray-800">Accedi con il tuo PIN</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Inserisci il codice personale di 6 cifre fornito dall'azienda.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="employee-pin" className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-500">
                PIN personale
              </label>
              <input
                id="employee-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="off"
                maxLength={6}
                required
                disabled={loading}
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value.replace(/\D/g, "").slice(0, 6));
                  if (error) setError("");
                }}
                placeholder="••••••"
                aria-describedby={error ? "pin-error" : undefined}
                aria-invalid={Boolean(error)}
                className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-4 text-center text-3xl font-bold tracking-[0.35em] text-gray-800 outline-none transition focus:border-[#6e192a] focus:bg-white disabled:opacity-60"
              />
            </div>

            {error && (
              <p id="pin-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || pin.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6e192a] px-5 py-4 text-lg font-extrabold text-white shadow-lg transition hover:bg-[#561120] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <><Loader2 size={21} className="animate-spin" /> Verifica in corso...</> : "Entra nella mia area"}
            </button>
          </form>

          <div className="mt-8 flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-500">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#6e192a]" />
            <span>Il PIN è personale. Non condividerlo. Se lo hai dimenticato, contatta la direzione.</span>
          </div>
        </div>
      </div>
    </main>
  );
}
