"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2, Wrench } from "lucide-react";
import { CHECKOUT_STATUSES } from "../../lib/constructionOps";
import {
  addToolCheckout,
  deleteToolCheckout,
  subscribeToToolCheckouts,
  updateToolCheckout,
  type ToolCheckout,
} from "../../lib/firebase/constructionOpsFirestore";
import {
  subscribeToInventoryItems,
  type InventoryItem,
  type Job,
} from "../../lib/firebase/firebaseUtils";
import DateInput from "../DateInput";
import { Card, GREEN, RED, fmtDate, JobSelect, SearchableSelect } from "./opsShared";

const empty = {
  toolName: "",
  inventoryItemId: "",
  checkedOutTo: "",
  dueDate: "",
  conditionOut: "Good",
  jobId: "",
  notes: "",
};

export default function ToolCheckoutPanel({
  jobs,
  userName,
  userEmail,
}: {
  jobs: Job[];
  userName: string | null;
  userEmail: string | null;
}) {
  const [checkouts, setCheckouts] = useState<ToolCheckout[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState(empty);
  const [filter, setFilter] = useState<"out" | "all">("out");

  useEffect(() => {
    const u1 = subscribeToToolCheckouts(setCheckouts);
    const u2 = subscribeToInventoryItems(setInventory);
    return () => {
      u1();
      u2();
    };
  }, []);

  const tools = useMemo(
    () => inventory.filter((i) => i.category === "Tools"),
    [inventory]
  );

  const outNow = useMemo(
    () => checkouts.filter((c) => c.status === "out" || c.status === "overdue"),
    [checkouts]
  );

  const overdue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return outNow.filter((c) => c.dueDate && c.dueDate < today);
  }, [outNow]);

  const displayed =
    filter === "out"
      ? checkouts.filter((c) => c.status === "out" || c.status === "overdue")
      : checkouts;

  const onCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.toolName.trim() || !form.checkedOutTo.trim() || !form.dueDate) return;
    const inv = tools.find((t) => t.id === form.inventoryItemId);
    const job = jobs.find((j) => j.jobId === form.jobId);
    await addToolCheckout({
      toolName: form.toolName.trim(),
      toolSku: inv?.sku ?? "",
      inventoryItemId: form.inventoryItemId || null,
      checkedOutTo: form.checkedOutTo.trim(),
      checkedOutEmail: userEmail ?? "",
      dueDate: form.dueDate,
      status: "out",
      conditionOut: form.conditionOut.trim(),
      conditionIn: "",
      maintenanceNotes: "",
      jobId: form.jobId || null,
      jobTitle: job?.title ?? "",
      notes: form.notes.trim(),
    });
    setForm(empty);
  };

  const returnTool = (c: ToolCheckout) => {
    updateToolCheckout(c.id, {
      status: "returned",
      returnedAt: Date.now(),
      conditionIn: "Returned OK",
    });
  };

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <Card>
          <h3 className="font-bold text-red-700">
            Overdue returns ({overdue.length})
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {overdue.map((c) => (
              <li key={c.id}>
                {c.toolName} — {c.checkedOutTo} (due {c.dueDate})
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 font-bold">
            <Plus className="h-4 w-4" /> Check out tool
          </h3>
          <form onSubmit={onCheckout} className="mt-4 space-y-3">
            <SearchableSelect
              options={[
                { value: "", label: "— From inventory (optional) —" },
                ...tools.map((t) => ({
                  value: t.id,
                  label: t.name,
                  meta: `${t.quantity} ${t.unit} @ ${t.location}`,
                  searchText: `${t.name} ${t.location} ${t.unit}`,
                })),
              ]}
              value={form.inventoryItemId}
              onChange={(id) => {
                const inv = tools.find((t) => t.id === id);
                setForm((f) => ({
                  ...f,
                  inventoryItemId: id,
                  toolName: inv?.name ?? f.toolName,
                }));
              }}
              placeholder="— From inventory (optional) —"
              searchPlaceholder="Search tools…"
            />
            <input
              value={form.toolName}
              onChange={(e) => setForm((f) => ({ ...f, toolName: e.target.value }))}
              placeholder="Tool name"
              className="profile-input"
              required
            />
            <input
              value={form.checkedOutTo}
              onChange={(e) =>
                setForm((f) => ({ ...f, checkedOutTo: e.target.value }))
              }
              placeholder="Checked out to (employee name)"
              className="profile-input"
              required
            />
            <DateInput
              label="Due date"
              value={form.dueDate}
              onChange={(dueDate) => setForm((f) => ({ ...f, dueDate }))}
              required
            />
            <JobSelect
              jobs={jobs}
              value={form.jobId}
              onChange={(id) => setForm((f) => ({ ...f, jobId: id }))}
            />
            <input
              value={form.conditionOut}
              onChange={(e) =>
                setForm((f) => ({ ...f, conditionOut: e.target.value }))
              }
              placeholder="Condition out"
              className="profile-input"
            />
            <button
              type="submit"
              className="rounded-md px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: GREEN }}
            >
              Check out
            </button>
          </form>
          <p className="mt-3 text-xs text-gray-400">
            Optional: print QR labels on tools for faster check-in later.
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-bold">
              <Wrench className="h-4 w-4" /> Checkout log ({outNow.length} out)
            </h3>
            <SearchableSelect
              compact
              buttonClassName=""
              options={[
                { value: "out", label: "Out now" },
                { value: "all", label: "All history" },
              ]}
              value={filter}
              onChange={(v) => setFilter(v as typeof filter)}
              searchPlaceholder="Search…"
              className="w-auto"
            />
          </div>
          {displayed.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No checkouts to show.</p>
          ) : (
            <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto">
              {displayed.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-gray-100 p-3 text-sm"
                >
                  <p className="font-semibold">{c.toolName}</p>
                  <p className="text-xs text-gray-500">
                    {c.checkedOutTo} · Due {c.dueDate}
                    {c.jobId ? ` · Job #${c.jobId}` : ""}
                  </p>
                  <p className="text-xs capitalize text-gray-400">
                    {c.status} · Out {fmtDate(c.checkedOutAt)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {c.status === "out" && (
                      <button
                        type="button"
                        onClick={() => returnTool(c)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-white"
                        style={{ backgroundColor: GREEN }}
                      >
                        <RotateCcw className="h-3 w-3" /> Return
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        updateToolCheckout(c.id, { status: "maintenance" })
                      }
                      className="rounded border px-2 py-1 text-xs font-semibold text-gray-600"
                    >
                      Maintenance
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteToolCheckout(c.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
