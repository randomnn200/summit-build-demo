"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  FolderOpen,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { buildClientDirectory } from "../lib/clientDirectory";
import {
  LABOR_TIER_OPTIONS,
  QUOTE_PROJECT_TYPES,
  computeQuoteEstimate,
  emptyQuoteForm,
  parseQuoteForm,
  projectTypeDefaults,
  type LaborTierId,
  type QuoteProjectType,
} from "../lib/quoteEstimator";
import {
  addSavedQuote,
  deleteSavedQuote,
  getAllUsers,
  subscribeToAllTickets,
  subscribeToSavedQuotes,
  type SavedQuote,
} from "../lib/firebase/firebaseUtils";

const GREEN = "var(--brand-primary)";
const RED = "var(--brand-accent)";

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtDate(ts: { seconds: number } | null) {
  if (!ts?.seconds) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {hint && (
        <span className="mt-0.5 block text-xs text-gray-500">{hint}</span>
      )}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default function QuoteHelperTab({
  userName,
  userEmail,
}: {
  userName: string | null;
  userEmail: string | null;
}) {
  const [form, setForm] = useState(emptyQuoteForm);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [clientUid, setClientUid] = useState("");
  const [clients, setClients] = useState<
    ReturnType<typeof buildClientDirectory>
  >([]);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SavedQuote | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [quoteFilter, setQuoteFilter] = useState<"all" | "client">("client");

  useEffect(() => {
    let mounted = true;
    let unsubTickets: (() => void) | undefined;
    getAllUsers()
      .then((users) => {
        if (!mounted) return;
        unsubTickets = subscribeToAllTickets((tickets) => {
          setClients(buildClientDirectory(users, tickets));
        });
      })
      .catch((e) => console.error(e));
    const unsubQuotes = subscribeToSavedQuotes(setSavedQuotes);
    return () => {
      mounted = false;
      unsubTickets?.();
      unsubQuotes();
    };
  }, []);

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const applyProjectDefaults = (type: QuoteProjectType) => {
    const defaults = projectTypeDefaults(type);
    setForm((f) => ({
      ...f,
      projectType: type,
      ...(defaults.crewSize != null
        ? { crewSize: String(defaults.crewSize) }
        : {}),
      ...(defaults.daysOnSite != null
        ? { daysOnSite: String(defaults.daysOnSite) }
        : {}),
      ...(defaults.materialsCost != null
        ? { materialsCost: String(defaults.materialsCost) }
        : {}),
      ...(defaults.permitFees != null
        ? { permitFees: String(defaults.permitFees) }
        : {}),
      ...(defaults.dumpsterDisposal != null
        ? { dumpsterDisposal: String(defaults.dumpsterDisposal) }
        : {}),
      ...(defaults.subcontractorCost != null
        ? { subcontractorCost: String(defaults.subcontractorCost) }
        : {}),
      ...(defaults.equipmentRental != null
        ? { equipmentRental: String(defaults.equipmentRental) }
        : {}),
    }));
  };

  const setLaborTier = (tierId: LaborTierId) => {
    const tier = LABOR_TIER_OPTIONS.find((t) => t.id === tierId);
    setForm((f) => ({
      ...f,
      laborTier: tierId,
      loadedLaborRate:
        tierId === "custom" ? f.loadedLaborRate : String(tier?.rate ?? 52),
    }));
  };

  const onClientChange = (uid: string) => {
    setClientUid(uid);
    if (!uid || uid === "__manual__") return;
    const client = clients.find((c) => c.uid === uid);
    if (client) {
      setForm((f) => ({ ...f, customerName: client.name }));
    }
  };

  const input = useMemo(() => parseQuoteForm(form), [form]);
  const result = useMemo(() => computeQuoteEstimate(input), [input]);

  const reset = () => {
    setForm(emptyQuoteForm());
    setClientUid("");
    setSaveError("");
    setSaveOk(false);
  };

  const loadQuote = (quote: SavedQuote) => {
    setForm({ ...emptyQuoteForm(), ...quote.form });
    setClientUid(quote.clientUid ?? "__manual__");
    setSaveOk(false);
    setSaveError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resolveClientForSave = () => {
    if (clientUid && clientUid !== "__manual__") {
      const client = clients.find((c) => c.uid === clientUid);
      if (client) {
        return {
          clientUid: client.uid,
          clientName: client.name,
          clientEmail: client.email,
        };
      }
    }
    const name = form.customerName.trim();
    if (!name) return null;
    return {
      clientUid: null as string | null,
      clientName: name,
      clientEmail: null as string | null,
    };
  };

  const saveQuote = async () => {
    setSaveError("");
    setSaveOk(false);
    const client = resolveClientForSave();
    if (!client) {
      setSaveError("Select a client from the list or enter a customer name.");
      return;
    }
    if (!form.projectName.trim() && !form.projectType) {
      setSaveError("Add a project name or type before saving.");
      return;
    }
    setSaving(true);
    try {
      await addSavedQuote({
        ...client,
        form: { ...form },
        result: {
          suggestedTotal: result.suggestedTotal,
          lowRange: result.lowRange,
          highRange: result.highRange,
          profitAmount: result.profitAmount,
          profitMarginPercent: result.profitMarginPercent,
          laborHours: result.laborHours,
        },
        savedBy: userName || userEmail || "Staff",
        savedByEmail: userEmail,
      });
      setSaveOk(true);
    } catch (e) {
      console.error(e);
      setSaveError("Could not save quote. Check Firestore rules and try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteSavedQuote(pendingDelete.id);
      setPendingDelete(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const visibleQuotes = useMemo(() => {
    if (quoteFilter === "all") return savedQuotes;
    if (clientUid && clientUid !== "__manual__") {
      return savedQuotes.filter((q) => q.clientUid === clientUid);
    }
    const name = form.customerName.trim().toLowerCase();
    if (!name) return savedQuotes;
    return savedQuotes.filter(
      (q) =>
        q.clientName.toLowerCase() === name ||
        (q.clientUid && q.clientUid === clientUid)
    );
  }, [savedQuotes, quoteFilter, clientUid, form.customerName]);

  const clientQuoteCount = (uid: string) =>
    savedQuotes.filter((q) => q.clientUid === uid).length;

  return (
    <div className="space-y-6">
      {pendingDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => !deleting && setPendingDelete(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="brand-bar" />
            <div className="p-6">
              <h3 className="text-lg font-bold">Delete saved quote?</h3>
              <p className="mt-2 text-sm text-gray-600">
                Remove the quote for{" "}
                <strong>{pendingDelete.form.projectName || pendingDelete.form.projectType}</strong>{" "}
                ({fmtMoney(pendingDelete.result.suggestedTotal)})? This can&apos;t be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setPendingDelete(null)}
                  disabled={deleting}
                  className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: RED }}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-gray-900">
              <Calculator className="h-5 w-5 text-brand-primary" />
              Quick quote helper
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Enter what the customer told you and get a rough estimate. Save
              quotes to a client&apos;s file so you can find them later in{" "}
              <strong>Clients</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Section title="Save to client file">
            <Field
              label="Client"
              hint="Pick someone from your client list — saved quotes appear on their file in the Clients tab"
            >
              <select
                value={clientUid}
                onChange={(e) => onClientChange(e.target.value)}
                className="profile-input"
              >
                <option value="">— Select client —</option>
                {clients.map((c) => (
                  <option key={c.uid} value={c.uid}>
                    {c.name}
                    {c.email ? ` (${c.email})` : ""}
                    {clientQuoteCount(c.uid) > 0
                      ? ` · ${clientQuoteCount(c.uid)} saved`
                      : ""}
                  </option>
                ))}
                <option value="__manual__">Other — type name below</option>
              </select>
            </Field>
            {(clientUid === "__manual__" || !clientUid) && (
              <Field label="Customer name">
                <input
                  value={form.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                  placeholder="Maria Gonzalez"
                  className="profile-input"
                />
              </Field>
            )}
            {clientUid && clientUid !== "__manual__" && (
              <p className="text-xs text-gray-500">
                Saving to{" "}
                <strong>{clients.find((c) => c.uid === clientUid)?.name}</strong>
                &apos;s file.
              </p>
            )}
          </Section>

          <Section title="Customer & project">
            <div className="grid gap-3 sm:grid-cols-2">
              {clientUid && clientUid !== "__manual__" && (
                <Field label="Customer name">
                  <input
                    value={form.customerName}
                    onChange={(e) => set("customerName", e.target.value)}
                    className="profile-input"
                  />
                </Field>
              )}
              <Field label="Project name">
                <input
                  value={form.projectName}
                  onChange={(e) => set("projectName", e.target.value)}
                  placeholder="Kitchen remodel — Oak St"
                  className="profile-input"
                />
              </Field>
            </div>
            <Field label="Project type">
              <select
                value={form.projectType}
                onChange={(e) =>
                  applyProjectDefaults(e.target.value as QuoteProjectType)
                }
                className="profile-input"
              >
                {QUOTE_PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Scope notes from customer">
              <textarea
                value={form.scopeNotes}
                onChange={(e) => set("scopeNotes", e.target.value)}
                rows={3}
                placeholder="e.g. Replace cabinets, quartz counters, new flooring, update lighting…"
                className="profile-input resize-none"
              />
            </Field>
          </Section>

          <Section title="Labor">
            <Field label="Labor tier" hint="Loaded rate = what each hour actually costs the company">
              <select
                value={form.laborTier}
                onChange={(e) => setLaborTier(e.target.value as LaborTierId)}
                className="profile-input"
              >
                {LABOR_TIER_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} — ${t.rate}/hr
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                {
                  LABOR_TIER_OPTIONS.find((t) => t.id === form.laborTier)
                    ?.hint
                }
              </p>
            </Field>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Crew size">
                <input
                  type="number"
                  min={1}
                  value={form.crewSize}
                  onChange={(e) => set("crewSize", e.target.value)}
                  className="profile-input"
                />
              </Field>
              <Field label="Days on site">
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={form.daysOnSite}
                  onChange={(e) => set("daysOnSite", e.target.value)}
                  className="profile-input"
                />
              </Field>
              <Field label="Hours / day">
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={form.hoursPerDay}
                  onChange={(e) => set("hoursPerDay", e.target.value)}
                  className="profile-input"
                />
              </Field>
              <Field label="Loaded $/hr">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.loadedLaborRate}
                  onChange={(e) => {
                    set("loadedLaborRate", e.target.value);
                    set("laborTier", "custom");
                  }}
                  disabled={form.laborTier !== "custom"}
                  className="profile-input disabled:bg-gray-100"
                />
              </Field>
            </div>
            <p className="text-xs text-gray-500">
              {result.laborHours} total crew-hours → labor cost{" "}
              {fmtMoney(result.laborCost)}
            </p>
          </Section>

          <Section title="Materials, subs & job costs">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Materials cost (your estimate)">
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={form.materialsCost}
                  onChange={(e) => set("materialsCost", e.target.value)}
                  className="profile-input"
                />
              </Field>
              <Field label="Materials markup %" hint="Typical 15–25%">
                <input
                  type="number"
                  min={0}
                  value={form.materialsMarkupPercent}
                  onChange={(e) =>
                    set("materialsMarkupPercent", e.target.value)
                  }
                  className="profile-input"
                />
              </Field>
              <Field label="Subcontractor quotes">
                <input
                  type="number"
                  min={0}
                  value={form.subcontractorCost}
                  onChange={(e) => set("subcontractorCost", e.target.value)}
                  className="profile-input"
                />
              </Field>
              <Field label="Sub markup %" hint="Typical 10–15%">
                <input
                  type="number"
                  min={0}
                  value={form.subcontractorMarkupPercent}
                  onChange={(e) =>
                    set("subcontractorMarkupPercent", e.target.value)
                  }
                  className="profile-input"
                />
              </Field>
              <Field label="Permits & fees">
                <input
                  type="number"
                  min={0}
                  value={form.permitFees}
                  onChange={(e) => set("permitFees", e.target.value)}
                  className="profile-input"
                />
              </Field>
              <Field label="Equipment rental">
                <input
                  type="number"
                  min={0}
                  value={form.equipmentRental}
                  onChange={(e) => set("equipmentRental", e.target.value)}
                  className="profile-input"
                />
              </Field>
              <Field label="Travel miles">
                <input
                  type="number"
                  min={0}
                  value={form.travelMiles}
                  onChange={(e) => set("travelMiles", e.target.value)}
                  className="profile-input"
                />
              </Field>
              <Field label="$/mile">
                <input
                  type="number"
                  min={0}
                  step={0.05}
                  value={form.travelRatePerMile}
                  onChange={(e) => set("travelRatePerMile", e.target.value)}
                  className="profile-input"
                />
              </Field>
              <Field label="Dumpster / disposal">
                <input
                  type="number"
                  min={0}
                  value={form.dumpsterDisposal}
                  onChange={(e) => set("dumpsterDisposal", e.target.value)}
                  className="profile-input"
                />
              </Field>
            </div>
          </Section>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-sm font-semibold text-brand-primary hover:underline"
          >
            {showAdvanced ? "Hide" : "Show"} margin & overhead settings
          </button>

          {showAdvanced && (
            <Section title="Overhead, contingency & profit">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label="Overhead %"
                  hint="Office, GL, vehicles, admin — typical 10–15%"
                >
                  <input
                    type="number"
                    min={0}
                    value={form.overheadPercent}
                    onChange={(e) => set("overheadPercent", e.target.value)}
                    className="profile-input"
                  />
                </Field>
                <Field
                  label="Contingency %"
                  hint="Unknowns & changes — typical 8–12%"
                >
                  <input
                    type="number"
                    min={0}
                    value={form.contingencyPercent}
                    onChange={(e) => set("contingencyPercent", e.target.value)}
                    className="profile-input"
                  />
                </Field>
                <Field
                  label="Profit %"
                  hint="Target margin — typical 12–18%"
                >
                  <input
                    type="number"
                    min={0}
                    value={form.profitPercent}
                    onChange={(e) => set("profitPercent", e.target.value)}
                    className="profile-input"
                  />
                </Field>
              </div>
            </Section>
          )}

          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-900">Saved quotes</p>
                <p className="text-xs text-gray-500">
                  Load a previous estimate or review what&apos;s on file
                </p>
              </div>
              <select
                value={quoteFilter}
                onChange={(e) =>
                  setQuoteFilter(e.target.value as "all" | "client")
                }
                className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold"
              >
                <option value="client">This client</option>
                <option value="all">All clients</option>
              </select>
            </div>
            {visibleQuotes.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No saved quotes yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {visibleQuotes.map((q) => (
                  <li
                    key={q.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {q.form.projectName || q.form.projectType}
                      </p>
                      <p className="text-xs text-gray-500">
                        {q.clientName} · {fmtMoney(q.result.suggestedTotal)} ·{" "}
                        {fmtDate(q.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => loadQuote(q)}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold"
                        style={{ borderColor: GREEN, color: GREEN }}
                      >
                        <FolderOpen className="h-3 w-3" />
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(q)}
                        className="rounded-md border border-gray-200 p-1 text-gray-400 hover:text-red-600"
                        aria-label="Delete quote"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start space-y-4">
          <div className="rounded-2xl border border-brand-primary/20 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Rough estimate
            </p>
            <p className="mt-2 text-4xl font-black text-brand-primary">
              {fmtMoney(result.suggestedTotal)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Range {fmtMoney(result.lowRange)} – {fmtMoney(result.highRange)}
            </p>
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Ballpark only — finalize after site visit, plans, and supplier
              quotes. Not a binding contract price.
            </p>

            <button
              type="button"
              onClick={saveQuote}
              disabled={saving}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save to client file"}
            </button>
            {saveError && (
              <p className="mt-2 text-xs font-semibold text-red-600">{saveError}</p>
            )}
            {saveOk && (
              <p className="mt-2 text-xs font-semibold text-emerald-700">
                Quote saved — view it on the client&apos;s file in Clients.
              </p>
            )}

            <ul className="mt-6 space-y-3 border-t border-gray-100 pt-4 text-sm">
              {result.lines.map((line) => (
                <li key={line.label} className="flex justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-800">{line.label}</p>
                    {line.detail && (
                      <p className="text-[11px] text-gray-400">{line.detail}</p>
                    )}
                  </div>
                  <span className="shrink-0 font-semibold text-gray-900">
                    {fmtMoney(line.amount)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Profit on this quote</span>
                <span className="font-semibold text-emerald-700">
                  {fmtMoney(result.profitAmount)} (
                  {result.profitMarginPercent.toFixed(1)}% of total)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Effective rate to client (incl. markup)</span>
                <span className="font-semibold text-gray-700">
                  {fmtMoney(result.effectiveHourlyToClient)}/crew-hr
                </span>
              </div>
              <div className="flex justify-between">
                <span>Your loaded labor cost</span>
                <span className="font-semibold text-gray-700">
                  {fmtMoney(input.loadedLaborRate)}/hr
                </span>
              </div>
            </div>

            {(form.customerName || form.projectName) && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                <p className="font-semibold text-gray-800">Summary to share</p>
                <p className="mt-1">
                  {form.customerName && `${form.customerName} — `}
                  {form.projectName || form.projectType}: based on what you
                  described, a rough ballpark is{" "}
                  <strong>{fmtMoney(result.lowRange)}</strong> to{" "}
                  <strong>{fmtMoney(result.highRange)}</strong>. We&apos;ll
                  confirm after a walkthrough and detailed estimate.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
