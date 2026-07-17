"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Plus, Search, Trash2, X } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_ICONS,
  EXPENSE_DESCRIPTION_EXAMPLES,
  categoryColor,
  expenseDescription,
  isThisMonth,
  type ExpenseCategory,
} from "../lib/expenses";
import { todayIso } from "../lib/dates";
import {
  addExpense,
  deleteExpense,
  subscribeToExpenses,
  type Expense,
  type Role,
} from "../lib/firebase/firebaseUtils";
import DateInput from "./DateInput";
import MoneyInput from "./MoneyInput";
import { parseMoneyInput } from "../lib/formatMoneyInput";
import { SearchableSelect } from "./ops/opsShared";

const GREEN = "var(--brand-primary)";
const RED = "var(--brand-accent)";

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

const emptyForm = {
  category: "Food" as ExpenseCategory,
  amount: "",
  date: todayIso(),
  description: "",
  jobOrProject: "",
  notes: "",
};

type ExpenseFilters = {
  category: string;
  minAmount: string;
  maxAmount: string;
  dateFrom: string;
  dateTo: string;
  submittedBy: string;
};

const defaultFilters: ExpenseFilters = {
  category: "all",
  minAmount: "",
  maxAmount: "",
  dateFrom: "",
  dateTo: "",
  submittedBy: "all",
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
  const [filters, setFilters] = useState<ExpenseFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = subscribeToExpenses((list) => {
      setExpenses(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [filtersOpen]);

  const submitters = useMemo(() => {
    const names = new Set<string>();
    for (const e of expenses) {
      if (e.submittedBy?.trim()) names.add(e.submittedBy.trim());
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [expenses]);

  const setFilter = <K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category !== "all") count++;
    if (filters.minAmount || filters.maxAmount) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.submittedBy !== "all") count++;
    return count;
  }, [filters]);

  const clearFilters = () => setFilters(defaultFilters);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minAmount = filters.minAmount ? parseMoneyInput(filters.minAmount) : null;
    const maxAmount = filters.maxAmount ? parseMoneyInput(filters.maxAmount) : null;

    return expenses.filter((e) => {
      if (filters.category !== "all" && e.category !== filters.category) {
        return false;
      }
      if (minAmount !== null && !Number.isNaN(minAmount) && e.amount < minAmount) {
        return false;
      }
      if (maxAmount !== null && !Number.isNaN(maxAmount) && e.amount > maxAmount) {
        return false;
      }
      if (filters.dateFrom && e.date < filters.dateFrom) return false;
      if (filters.dateTo && e.date > filters.dateTo) return false;
      if (filters.submittedBy !== "all" && e.submittedBy !== filters.submittedBy) {
        return false;
      }
      if (!q) return true;
      return (
        expenseDescription(e).toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.jobOrProject?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        e.submittedBy.toLowerCase().includes(q)
      );
    });
  }, [expenses, search, filters]);

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
    const amount = parseMoneyInput(form.amount);
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
                <div className="mt-1.5">
                  <MoneyInput
                    hideLabel
                    value={form.amount}
                    onChange={(amount) => set("amount", amount)}
                    className="profile-input money-input"
                    required
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Date</span>
                <div className="mt-1.5">
                  <DateInput
                    hideLabel
                    value={form.date}
                    onChange={(date) => set("date", date)}
                    required
                  />
                </div>
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

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search descriptions, job, notes…"
                className="profile-input pl-9"
              />
            </div>
            <div ref={filtersRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  activeFilterCount > 0
                    ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {filtersOpen && (
                <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-xl sm:w-80">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-gray-900">Filter expenses</h3>
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      aria-label="Close filters"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Category
                      </span>
                      <div className="mt-1">
                        <SearchableSelect
                          options={[
                            { value: "all", label: "All categories" },
                            ...EXPENSE_CATEGORIES.map((cat) => ({
                              value: cat,
                              label: `${EXPENSE_CATEGORY_ICONS[cat]} ${cat}`,
                              searchText: cat,
                            })),
                          ]}
                          value={filters.category}
                          onChange={(v) => setFilter("category", v)}
                          placeholder="All categories"
                          searchPlaceholder="Search categories…"
                        />
                      </div>
                    </label>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Price range
                      </span>
                      <div className="mt-1 grid grid-cols-2 gap-2">
                        <MoneyInput
                          hideLabel
                          value={filters.minAmount}
                          onChange={(v) => setFilter("minAmount", v)}
                          placeholder="Min $"
                          className="profile-input money-input"
                        />
                        <MoneyInput
                          hideLabel
                          value={filters.maxAmount}
                          onChange={(v) => setFilter("maxAmount", v)}
                          placeholder="Max $"
                          className="profile-input money-input"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Date range
                      </span>
                      <div className="mt-1 grid grid-cols-2 gap-2">
                        <DateInput
                          hideLabel
                          value={filters.dateFrom}
                          onChange={(v) => setFilter("dateFrom", v)}
                          aria-label="From date"
                        />
                        <DateInput
                          hideLabel
                          value={filters.dateTo}
                          onChange={(v) => setFilter("dateTo", v)}
                          aria-label="To date"
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-gray-400">
                        Use one date for a single day, or both for a range.
                      </p>
                    </div>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Logged by
                      </span>
                      <div className="mt-1">
                        <SearchableSelect
                          options={[
                            { value: "all", label: "Everyone" },
                            ...submitters.map((name) => ({
                              value: name,
                              label: name,
                            })),
                          ]}
                          value={filters.submittedBy}
                          onChange={(v) => setFilter("submittedBy", v)}
                          placeholder="Everyone"
                          searchPlaceholder="Search by name…"
                        />
                      </div>
                    </label>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={clearFilters}
                      disabled={activeFilterCount === 0}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40"
                    >
                      Clear all
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: GREEN }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
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
