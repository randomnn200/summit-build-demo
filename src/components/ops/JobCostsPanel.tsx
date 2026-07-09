"use client";

import { useEffect, useMemo, useState } from "react";
import { DollarSign, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  changeOrderTotal,
  jobHealthLabel,
} from "../../lib/constructionOps";
import {
  addJobCostEntry,
  deleteJobCostEntry,
  saveJobBudget,
  subscribeToJobBudgets,
  subscribeToJobCostEntries,
  subscribeToChangeOrders,
  type ChangeOrder,
  type JobBudget,
  type JobCostEntry,
} from "../../lib/firebase/constructionOpsFirestore";
import {
  subscribeToExpenses,
  subscribeToPurchaseOrders,
  type Expense,
  type Job,
  type PurchaseOrder,
} from "../../lib/firebase/firebaseUtils";
import { poTotal } from "../../lib/inventory";
import { todayIso } from "../../lib/dates";
import { moneyInputFromNumber, parseMoneyInput } from "../../lib/formatMoneyInput";
import DateInput from "../DateInput";
import MoneyInput from "../MoneyInput";
import { Card, GREEN, RED, fmtMoney, JobSelect, SearchableSelect } from "./opsShared";

export default function JobCostsPanel({
  jobs,
  userName,
  userEmail,
}: {
  jobs: Job[];
  userName: string | null;
  userEmail: string | null;
}) {
  const [selectedJob, setSelectedJob] = useState("");
  const [budgets, setBudgets] = useState<Record<string, JobBudget>>({});
  const [entries, setEntries] = useState<JobCostEntry[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [budgetForm, setBudgetForm] = useState({
    budgetLabor: "",
    budgetMaterials: "",
    budgetEquipment: "",
    budgetOther: "",
    notes: "",
  });
  const [entryForm, setEntryForm] = useState({
    category: "labor" as (typeof COST_CATEGORIES)[number],
    amount: "",
    description: "",
    date: todayIso(),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u1 = subscribeToJobBudgets(setBudgets);
    const u2 = subscribeToJobCostEntries(setEntries);
    const u3 = subscribeToChangeOrders(setChangeOrders);
    const u4 = subscribeToExpenses(setExpenses);
    const u5 = subscribeToPurchaseOrders(setPos);
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
    };
  }, []);

  const job = jobs.find((j) => j.jobId === selectedJob);
  const budget = selectedJob ? budgets[selectedJob] : undefined;

  useEffect(() => {
    if (budget) {
      setBudgetForm({
        budgetLabor: moneyInputFromNumber(budget.budgetLabor ?? 0),
        budgetMaterials: moneyInputFromNumber(budget.budgetMaterials ?? 0),
        budgetEquipment: moneyInputFromNumber(budget.budgetEquipment ?? 0),
        budgetOther: moneyInputFromNumber(budget.budgetOther ?? 0),
        notes: budget.notes ?? "",
      });
    } else {
      setBudgetForm({
        budgetLabor: "",
        budgetMaterials: "",
        budgetEquipment: "",
        budgetOther: "",
        notes: "",
      });
    }
  }, [selectedJob, budget]);

  const actuals = useMemo(() => {
    if (!selectedJob || !job) {
      return {
        labor: 0,
        materials: 0,
        equipment: 0,
        subcontractor: 0,
        other: 0,
        total: 0,
        changeOrderTotal_: 0,
      };
    }
    const title = job.title.toLowerCase();
    const jobEntries = entries.filter((e) => e.jobId === selectedJob);
    const jobCos = changeOrders.filter(
      (co) => co.jobId === selectedJob && co.status === "approved"
    );
    const jobExpenses = expenses.filter(
      (e) =>
        e.jobOrProject?.includes(selectedJob) ||
        e.jobOrProject?.toLowerCase().includes(title)
    );
    const jobPos = pos.filter(
      (p) =>
        p.notes?.includes(selectedJob) ||
        p.poNumber.toLowerCase().includes(title)
    );

    const labor =
      jobEntries.filter((e) => e.category === "labor").reduce((s, e) => s + e.amount, 0) +
      jobExpenses.filter((e) => e.category === "Subcontractors").reduce((s, e) => s + e.amount, 0) * 0;
    const materials =
      jobEntries.filter((e) => e.category === "materials").reduce((s, e) => s + e.amount, 0) +
      jobExpenses
        .filter((e) => e.category === "Materials & Supplies")
        .reduce((s, e) => s + e.amount, 0) +
      jobPos.reduce((s, p) => s + poTotal(p.lines), 0);
    const equipment =
      jobEntries.filter((e) => e.category === "equipment").reduce((s, e) => s + e.amount, 0) +
      jobExpenses
        .filter((e) => ["Vehicle", "Tools", "Gas"].includes(e.category))
        .reduce((s, e) => s + e.amount, 0);
    const subcontractor =
      jobEntries.filter((e) => e.category === "subcontractor").reduce((s, e) => s + e.amount, 0) +
      jobExpenses
        .filter((e) => e.category === "Subcontractors")
        .reduce((s, e) => s + e.amount, 0);
    const changeOrderTotal_ = jobCos.reduce((s, co) => s + changeOrderTotal(co), 0);
    const other =
      jobEntries.filter((e) => e.category === "other").reduce((s, e) => s + e.amount, 0) +
      jobExpenses
        .filter(
          (e) =>
            !["Materials & Supplies", "Subcontractors", "Vehicle", "Tools", "Gas"].includes(
              e.category
            )
        )
        .reduce((s, e) => s + e.amount, 0) +
      changeOrderTotal_;

    const total = labor + materials + equipment + subcontractor + other;
    return { labor, materials, equipment, subcontractor, other, total, changeOrderTotal_ };
  }, [selectedJob, job, entries, changeOrders, expenses, pos]);

  const budgetTotal =
    parseMoneyInput(budgetForm.budgetLabor) +
    parseMoneyInput(budgetForm.budgetMaterials) +
    parseMoneyInput(budgetForm.budgetEquipment) +
    parseMoneyInput(budgetForm.budgetOther);

  const profit = budgetTotal - actuals.total;
  const health = jobHealthLabel(budgetTotal, actuals.total);

  const saveBudget = async () => {
    if (!selectedJob) return;
    setSaving(true);
    try {
      await saveJobBudget(selectedJob, {
        budgetLabor: parseMoneyInput(budgetForm.budgetLabor),
        budgetMaterials: parseMoneyInput(budgetForm.budgetMaterials),
        budgetEquipment: parseMoneyInput(budgetForm.budgetEquipment),
        budgetOther: parseMoneyInput(budgetForm.budgetOther),
        notes: budgetForm.notes.trim(),
        updatedBy: userName || userEmail || "Staff",
      });
    } finally {
      setSaving(false);
    }
  };

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !job || !parseMoneyInput(entryForm.amount)) return;
    await addJobCostEntry({
      jobId: selectedJob,
      jobTitle: job.title,
      category: entryForm.category,
      amount: parseMoneyInput(entryForm.amount),
      description: entryForm.description.trim(),
      date: entryForm.date,
      enteredBy: userName || userEmail || "Staff",
      enteredByEmail: userEmail,
    });
    setEntryForm((f) => ({ ...f, amount: "", description: "" }));
  };

  const healthColor =
    health === "healthy" ? GREEN : health === "watch" ? "#f59e0b" : RED;

  return (
    <div className="space-y-6">
      <Card>
        <label className="text-sm font-medium text-gray-700">Select job</label>
        <div className="mt-1 max-w-md">
          <JobSelect jobs={jobs} value={selectedJob} onChange={setSelectedJob} />
        </div>
      </Card>

      {!selectedJob ? (
        <p className="text-sm text-gray-500">
          Pick a job to track budget vs. actual spending and project health.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-xs font-semibold uppercase text-gray-400">Budget</p>
              <p className="mt-1 text-2xl font-black">{fmtMoney(budgetTotal)}</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase text-gray-400">Actual</p>
              <p className="mt-1 text-2xl font-black">{fmtMoney(actuals.total)}</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase text-gray-400">
                Est. profit
              </p>
              <p
                className="mt-1 flex items-center gap-1 text-2xl font-black"
                style={{ color: profit >= 0 ? GREEN : RED }}
              >
                {profit >= 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                {fmtMoney(profit)}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase text-gray-400">Health</p>
              <p
                className="mt-1 text-lg font-black capitalize"
                style={{ color: healthColor }}
              >
                {health.replace("_", " ")}
              </p>
              <p className="text-xs text-gray-500">
                {budgetTotal > 0
                  ? `${Math.round((actuals.total / budgetTotal) * 100)}% of budget used`
                  : "Set a budget below"}
              </p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="flex items-center gap-2 font-bold">
                <DollarSign className="h-4 w-4" /> Budget
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {(
                  [
                    ["budgetLabor", "Labor"],
                    ["budgetMaterials", "Materials"],
                    ["budgetEquipment", "Equipment"],
                    ["budgetOther", "Other"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block text-sm">
                    <span className="text-gray-600">{label}</span>
                    <MoneyInput
                      hideLabel
                      value={budgetForm[key]}
                      onChange={(v) =>
                        setBudgetForm((f) => ({ ...f, [key]: v }))
                      }
                      className="profile-input money-input mt-1"
                    />
                  </label>
                ))}
              </div>
              <textarea
                value={budgetForm.notes}
                onChange={(e) =>
                  setBudgetForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
                placeholder="Budget notes"
                className="profile-input mt-3 resize-none"
              />
              <button
                type="button"
                onClick={saveBudget}
                disabled={saving}
                className="mt-3 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: GREEN }}
              >
                Save budget
              </button>
            </Card>

            <Card>
              <h3 className="font-bold">Actual breakdown</h3>
              <ul className="mt-4 space-y-2 text-sm">
                {(
                  [
                    ["labor", actuals.labor],
                    ["materials", actuals.materials],
                    ["equipment", actuals.equipment],
                    ["subcontractor", actuals.subcontractor],
                    ["other", actuals.other],
                  ] as const
                ).map(([cat, amt]) => (
                  <li key={cat} className="flex justify-between">
                    <span className="capitalize text-gray-600">
                      {COST_CATEGORY_LABELS[cat]}
                    </span>
                    <span className="font-semibold">{fmtMoney(amt)}</span>
                  </li>
                ))}
                {actuals.changeOrderTotal_ > 0 && (
                  <li className="flex justify-between text-xs text-gray-500">
                    <span>Includes approved change orders</span>
                    <span>{fmtMoney(actuals.changeOrderTotal_)}</span>
                  </li>
                )}
              </ul>

              <form onSubmit={addEntry} className="mt-6 space-y-2 border-t pt-4">
                <p className="text-xs font-semibold uppercase text-gray-400">
                  Log cost manually
                </p>
                <SearchableSelect
                  options={COST_CATEGORIES.map((c) => ({
                    value: c,
                    label: COST_CATEGORY_LABELS[c],
                  }))}
                  value={entryForm.category}
                  onChange={(category) =>
                    setEntryForm((f) => ({
                      ...f,
                      category: category as typeof entryForm.category,
                    }))
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <MoneyInput
                    hideLabel
                    value={entryForm.amount}
                    onChange={(amount) =>
                      setEntryForm((f) => ({ ...f, amount }))
                    }
                    placeholder="Amount"
                    className="profile-input money-input"
                    required
                  />
                  <DateInput
                    hideLabel
                    value={entryForm.date}
                    onChange={(date) =>
                      setEntryForm((f) => ({ ...f, date }))
                    }
                  />
                </div>
                <input
                  value={entryForm.description}
                  onChange={(e) =>
                    setEntryForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Description"
                  className="profile-input"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: GREEN }}
                >
                  <Plus className="h-3 w-3" /> Add entry
                </button>
              </form>
            </Card>
          </div>

          <Card>
            <h3 className="font-bold">Cost entries</h3>
            <ul className="mt-3 space-y-2">
              {entries
                .filter((e) => e.jobId === selectedJob)
                .map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span>
                      {COST_CATEGORY_LABELS[e.category]} · {e.description || "—"} ·{" "}
                      {e.date}
                    </span>
                    <span className="flex items-center gap-2">
                      <strong>{fmtMoney(e.amount)}</strong>
                      <button
                        type="button"
                        onClick={() => deleteJobCostEntry(e.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
