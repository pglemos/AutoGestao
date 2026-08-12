import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import FeedbackPage from "./FeedbackPage";
import PDIPage from "./PDIPage";

const TABS = [
  { key: "feedback", label: "Feedback" },
  { key: "pdi", label: "PDI" },
];

export default function Desenvolvimento() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => (searchParams.get("tab") === "pdi" ? "pdi" : "feedback"));

  // Rotas como /pdi (vendedor) e /feedbacks redirecionam pra cá com ?tab=pdi
  // ou ?tab=feedback — sem isso, a página sempre abria em "feedback" e
  // ignorava silenciosamente o destino pedido.
  useEffect(() => {
    const paramTab = searchParams.get("tab");
    if (paramTab === "pdi" || paramTab === "feedback") setTab(paramTab);
  }, [searchParams]);

  return (
<div className="w-full min-w-0 bg-surface-alt">
<SellerPageHeader icon={BookOpen} title={tab === "feedback" ? "FEEDBACK" : "PDI"} actions={(
<div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
{TABS.map(t => (
<button
key={t.key}
onClick={() => setTab(t.key)}
className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
tab === t.key
? "bg-white text-blue-700 shadow-sm"
: "text-slate-500 hover:text-slate-700"
}`}
>
{t.label}
</button>
))}
</div>
)} />

<div className="pt-4">
        {tab === "feedback" && <FeedbackPage hideHeader />}
        {tab === "pdi" && <PDIPage hideHeader />}
      </div>
    </div>
  );
}
