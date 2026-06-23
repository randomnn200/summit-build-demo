"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_ICONS,
  EXPENSE_DESCRIPTION_EXAMPLES,
  categoryColor,
  expenseDescription,
  isThisMonth,
  type ExpenseCategory,
} from "../lib/expenses";
import {
  addExpense,
  deleteExpense,
  subscribeToExpenses,
  type Expense,
  type Role,
} from "../lib/firebase/firebaseUtils";

const GREEN = "var(--brand-primary)";
const RED = "var(--brand-accent)";

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = {
  category: "Food" as ExpenseCategory,
  amount: "",
  date: todayIso(),
  description: "",
  jobOrProject: "",
  notes: "",
};

export default function ExpensesTab({
  userName,
  userEmail,
  role,
}: {
  userName: string | null;
  userEmail: string | null;
  role: Role;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<"all" | "this-month">(
    "this-month"
  );
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = subscribeToExpenses((list) => {
      setExpenses(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (filterCategory !== "all" && e.category !== filterCategory) {
        return false;
      }
      if (filterMonth === "this-month" && !isThisMonth(e.date)) return false;
      if (!q) return true;
      return (
        expenseDescription(e).toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.jobOrProject?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        e.submittedBy.toLowerCase().includes(q)
      );
    });
  }, [expenses, search, filterCategory, filterMonth]);

  const monthTotal = useMemo(
    () =>
      expenses
        .filter((e) => isThisMonth(e.date))
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const categoryTotals = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    for (const e of expenses.filter((x) => isThisMonth(x.date))) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const filteredTotal = filtered.reduce((sum, e) => sum + e.amount, 0);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!form.date) {
      setError("Date is required.");
      return;
    }
    const description = form.description.trim();
    if (description.length < 8) {
      setError(
        "Write a short description so the expense is clear — e.g. “$50 on gas for Truck 1”."
      );
      return;
    }
    setSaving(true);
    try {
      await addExpense({
        category: form.category,
        amount,
        date: form.date,
        description,
        jobOrProject: form.jobOrProject.trim() || undefined,
        notes: form.notes.trim() || undefined,
        submittedBy: userName || userEmail || "Staff",
        submittedByEmail: userEmail,
      });
      setForm({ ...emptyForm, date: todayIso() });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not save expense. Check Firestore rules for the expenses collection."
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteExpense(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {pendingDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => !deleting && setPendingDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="brand-bar" />
            <div className="p-6">
              <h3 className="text-lg font-bold">Delete expense?</h3>
              <p className="mt-2 text-sm text-gray-600">
                Remove {fmtMoney(pendingDelete.amount)} —{" "}
                {expenseDescription(pendingDelete) || pendingDelete.category}?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  disabled={deleting}
                  className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="rounded-md px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: RED }}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm border-l-4 border-l-brand-primary">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            This month
          </p>
          <p className="mt-2 text-3xl font-black">{fmtMoney(monthTotal)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {expenses.filter((e) => isThisMonth(e.date)).length} expenses logged
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm border-l-4 border-l-brand-accent sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            By category (this month)
          </p>
          {categoryTotals.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No expenses yet.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {categoryTotals.map(([cat, total]) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700"
                >
                  <span>{EXPENSE_CATEGORY_ICONS[cat]}</span>
                  {cat}: {fmtMoney(total)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-gray-900">Log expense</h2>
          <p className="mt-1 text-sm text-gray-500">
            Record job costs, fuel, meals, and other business spending.
          </p>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Category</span>
              <select
                value={form.category}
                onChange={(e) =>
                  set("category", e.target.value as ExpenseCategory)
                }
                className="profile-input mt-1.5"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {EXPENSE_CATEGORY_ICONS[cat]} {cat}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Amount</span>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  placeholder="0.00"
                  className="profile-input mt-1.5"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Date</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                  className="profile-input mt-1.5"
                  required
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                What was this expense? *
              </span>
              <p className="mt-0.5 text-xs text-gray-500">
                Write it in plain language so anyone can understand the
                transaction.
              </p>
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder={EXPENSE_DESCRIPTION_EXAMPLES[form.category]}
                className="profile-input mt-1.5"
                required
                minLength={8}
              />
            </label>
            <input
              value={form.jobOrProject}
              onChange={(e) => set("jobOrProject", e.target.value)}
              placeholder="Job / project # (optional)"
              className="profile-input"
            />
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Notes (optional)"
              className="profile-input resize-none"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={saving || form.description.trim().length < 8}
              className="flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              <Plus className="h-4 w-4" />
              {saving ? "Saving…" : "Add expense"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-black text-gray-900">Expenses</h2>
            <span className="text-sm font-semibold text-gray-500">
              {fmtMoney(filteredTotal)} shown
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search descriptions, job, notes…"
                className="profile-input pl-9"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="profile-input sm:w-44"
            >
              <option value="all">All categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={filterMonth}
              onChange={(e) =>
                setFilterMonth(e.target.value as "all" | "this-month")
              }
              className="profile-input sm:w-36"
            >
              <option value="this-month">This month</option>
              <option value="all">All time</option>
            </select>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-gray-500">Loading expenses…</p>
          ) : filtered.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">
              {expenses.length === 0
                ? "No expenses logged yet. Add fuel, meals, materials, and more."
                : "No expenses match your filters."}
            </p>
          ) : (
            <ul className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto">
              {filtered.map((exp) => (
                <li
                  key={exp.id}
                  className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
                    style={{
                      backgroundColor: `${categoryColor(exp.category)}18`,
                    }}
                  >
                    {EXPENSE_CATEGORY_ICONS[exp.category]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {expenseDescription(exp)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {exp.category} ·{" "}
                          {new Date(`${exp.date}T12:00:00`).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric", year: "numeric" }
                          )}{" "}
                          · {exp.submittedBy}
                        </p>
                      </div>
                      <p className="text-lg font-black text-gray-900">
                        {fmtMoney(exp.amount)}
                      </p>
                    </div>
                    {exp.jobOrProject && (
                      <p className="mt-1 text-xs text-gray-500">
                        Job: {exp.jobOrProject}
                      </p>
                    )}
                    {exp.notes && (
                      <p className="mt-1 text-xs text-gray-400">{exp.notes}</p>
                    )}
                  </div>
                  {role === "owner" && (
                    <button
                      type="button"
                      onClick={() => setPendingDelete(exp)}
                      className="shrink-0 rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
