"use client";

import { useEffect, useState } from "react";
import { Copy, Mail, Plus, Trash2 } from "lucide-react";
import { DEFAULT_EMAIL_TEMPLATES, fillCrmTemplate } from "../../lib/crm";
import {
  addCrmEmailTemplate,
  deleteCrmEmailTemplate,
  subscribeToCrmEmailTemplates,
  subscribeToCrmLeads,
  type CrmEmailTemplate,
  type CrmLead,
} from "../../lib/firebase/crmFirestore";
import { Card, GREEN, LeadSelect, copyText, openMailto } from "./crmShared";

const empty = { name: "", subject: "", body: "" };

export default function TemplatesPanel({
  userName,
  companyName,
}: {
  userName: string | null;
  companyName: string;
}) {
  const [templates, setTemplates] = useState<CrmEmailTemplate[]>([]);
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [form, setForm] = useState(empty);
  const [useLeadId, setUseLeadId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const u1 = subscribeToCrmEmailTemplates(setTemplates);
    const u2 = subscribeToCrmLeads(setLeads);
    return () => {
      u1();
      u2();
    };
  }, []);

  const selected = templates.find((t) => t.id === selectedId);

  const lead = leads.find((l) => l.id === useLeadId);

  const vars = {
    name: lead?.name ?? "Customer",
    company: companyName,
    sender: userName ?? "Team",
    project: lead?.projectType ?? "your project",
    amount: lead?.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : "TBD",
    valid_until: "30 days",
  };

  const previewSubject = selected
    ? fillCrmTemplate(selected.subject, vars)
    : "";
  const previewBody = selected ? fillCrmTemplate(selected.body, vars) : "";

  const seedDefaults = async () => {
    for (const t of DEFAULT_EMAIL_TEMPLATES) {
      await addCrmEmailTemplate({
        ...t,
        createdBy: userName || "Staff",
      });
    }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await addCrmEmailTemplate({
      name: form.name.trim(),
      subject: form.subject.trim(),
      body: form.body.trim(),
      createdBy: userName || "Staff",
    });
    setForm(empty);
  };

  const sendEmail = () => {
    if (!lead?.email) return;
    openMailto(lead.email, previewSubject, previewBody);
  };

  const copy = async () => {
    const ok = await copyText(`${previewSubject}\n\n${previewBody}`);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {templates.length === 0 && (
        <Card>
          <p className="text-sm text-gray-600">No templates yet.</p>
          <button
            type="button"
            onClick={seedDefaults}
            className="mt-3 rounded-md px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: GREEN }}
          >
            Load starter templates
          </button>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 font-bold">
            <Plus className="h-4 w-4" /> New template
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            Placeholders: {"{{name}}"}, {"{{company}}"}, {"{{sender}}"}, {"{{project}}"},
            {" {{amount}}"}, {"{{valid_until}}"}
          </p>
          <form onSubmit={onCreate} className="mt-4 space-y-3">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Template name"
              className="profile-input"
              required
            />
            <input
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Email subject"
              className="profile-input"
            />
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={6}
              placeholder="Email body"
              className="profile-input resize-none font-mono text-sm"
            />
            <button
              type="submit"
              className="rounded-md px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: GREEN }}
            >
              Save template
            </button>
          </form>

          <ul className="mt-6 space-y-2">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`text-sm font-semibold ${selectedId === t.id ? "text-brand-primary" : ""}`}
                >
                  {t.name}
                </button>
                <button
                  type="button"
                  onClick={() => deleteCrmEmailTemplate(t.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="font-bold">Preview & send</h3>
          <div className="mt-4 space-y-3">
            <LeadSelect leads={leads} value={useLeadId} onChange={setUseLeadId} />
            {selected ? (
              <>
                <div className="rounded-lg bg-gray-50 p-4 text-sm">
                  <p className="font-semibold">{previewSubject}</p>
                  <pre className="mt-3 whitespace-pre-wrap font-sans text-gray-700">
                    {previewBody}
                  </pre>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copy}
                    className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-semibold"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  {lead?.email && (
                    <button
                      type="button"
                      onClick={sendEmail}
                      className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: GREEN }}
                    >
                      <Mail className="h-3.5 w-3.5" /> Open in email
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">Select a template to preview.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
