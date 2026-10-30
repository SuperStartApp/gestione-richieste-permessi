
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bus, Mail, Loader2 } from "lucide-react";

export default function AvvioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedLink =
        localStorage.getItem("todde_preferred_link") ||
        localStorage.getItem("todde_link_id");

      if (savedLink) {
        router.replace(
          `/private/${encodeURIComponent(savedLink)}`
        );
        return;
      }
    } catch (error) {
      console.error("Errore lettura collegamento:", error);
    }

    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#6e192a] text-white flex flex-col items-center justify-center gap-4">
        <Bus size={48} />
        <Loader2 size={24} className="animate-spin" />
        <p className="text-sm">Apertura area personale...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6e192a] to-[#3d0d19] flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md text-center space-y-5">

        <div className="w-16 h-16 bg-rose-50 text-[#6e192a] rounded-2xl flex items-center justify-center mx-auto">
          <Bus size={34} />
        </div>

        <h1 className="text-2xl font-black text-gray-800">
          TODDE BUS
        </h1>

        <h2 className="text-lg font-bold text-[#6e192a]">
          Benvenuto!
        </h2>

        <p className="text-sm text-gray-600 leading-relaxed">
          Per accedere alla tua area personale,
          apri il collegamento ricevuto via email
          dall'azienda.
        </p>

        <div className="flex justify-center text-[#6e192a]">
          <Mail size={28} />
        </div>

        <p className="text-xs text-gray-400">
          Dopo il primo accesso, potrai utilizzare
          direttamente l'icona Todde Bus.
        </p>
      </div>
    </div>
  );
}
