"use client";

import type { CrmLead } from "../../lib/firebase/crmFirestore";

export const GREEN = "var(--brand-primary)";
export const RED = "var(--brand-accent)";

export function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function fmtDate(ts: { seconds: number } | null) {
  if (!ts?.seconds) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}

export function LeadSelect({
  leads,
  value,
  onChange,
  required,
}: {
  leads: CrmLead[];
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="profile-input"
      required={required}
    >
      <option value="">— Select lead —</option>
      {leads.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name} · {l.projectType || "General"}
        </option>
      ))}
    </select>
  );
}

export function openMailto(to: string, subject: string, body: string) {
  const q = new URLSearchParams({ subject, body });
  window.location.href = `mailto:${encodeURIComponent(to)}?${q.toString()}`;
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function printProposalHtml(
  title: string,
  companyName: string,
  leadName: string,
  amount: string,
  scope: string,
  validUntil: string
) {
  const html = `<!DOCTYPE html><html><head><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;padding:40px;max-width:720px;margin:0 auto}
h1{font-size:22px}.meta{color:#666;font-size:14px}table{margin-top:24px;width:100%}
.total{font-size:20px;font-weight:bold;margin-top:16px}</style></head><body>
<h1>${title}</h1>
<p class="meta">${companyName} · Prepared for ${leadName}</p>
<p class="meta">Valid until ${validUntil}</p>
<h2>Scope</h2>
<p>${scope.replace(/\n/g, "<br>")}</p>
<p class="total">Proposal amount: ${amount}</p>
<p style="margin-top:48px;color:#888;font-size:12px">Thank you for considering ${companyName}.</p>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.print();
}
