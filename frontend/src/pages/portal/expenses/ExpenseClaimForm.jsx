import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { portalExpenseApi } from "../../../services/apiClient";
import { DeleteIconBtn } from "../../../components/ui/ActionIcons";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";

export default function ExpenseClaimForm({ editMode = false }) {
  const { subdomain, claimId } = useParams();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(editMode);
  const [error, setError]           = useState("");

  const EMPTY_ITEM = { category_id: "", expense_date: "", amount: "", tax_amount: "0", notes: "", currency: "INR" };
  const [form, setForm] = useState({
    title: "", employee_id: "", category_id: "", expense_date: "", amount: "", currency: "INR",
    description: "", project: "", cost_center: "", client_ref: "",
  });
  const [items, setItems] = useState([]);
  const [multiLine, setMultiLine] = useState(false);

  useEffect(() => {
    portalExpenseApi.listCategories(subdomain, false)
      .then(r => setCategories(r.data?.data || r.data || []));

    if (editMode && claimId) {
      portalExpenseApi.getClaim(subdomain, claimId)
        .then(r => {
          const c = r.data?.data || r.data;
          setForm({
            title: c.title || "", employee_id: c.employee_id || "",
            category_id: c.category_id || "", expense_date: c.expense_date ? c.expense_date.slice(0,10) : "",
            amount: c.amount || "", currency: c.currency || "INR",
            description: c.description || "", project: c.project || "",
            cost_center: c.cost_center || "", client_ref: c.client_ref || "",
          });
          if (c.items?.length) {
            setMultiLine(true);
            setItems(c.items.map(i => ({
              category_id: i.category_id || "", expense_date: i.expense_date?.slice(0,10) || "",
              amount: i.amount || "", tax_amount: i.tax_amount || "0", notes: i.notes || "", currency: i.currency || "INR",
            })));
          }
        })
        .catch(() => navigate(`/portal/${subdomain}/hrms/expenses/claims`))
        .finally(() => setLoading(false));
    }
  }, [subdomain, claimId, editMode]);

  const f = (key, label, type = "text", opts = {}) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...opts} />
    </div>
  );

  const [confirmRemoveIdx, setConfirmRemoveIdx] = useState(null);
  const addItem = () => setItems(p => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (i) => { setItems(p => p.filter((_, idx) => idx !== i)); setConfirmRemoveIdx(null); };
  const setItem = (i, k, v) => setItems(p => p.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const totalFromItems = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    const body = {
      ...form,
      amount: multiLine ? totalFromItems : (parseFloat(form.amount) || 0),
      category_id: form.category_id || null,
      expense_date: form.expense_date || null,
      items: multiLine ? items.map(i => ({
        ...i,
        amount: parseFloat(i.amount) || 0,
        tax_amount: parseFloat(i.tax_amount) || 0,
        expense_date: new Date(i.expense_date).toISOString(),
        category_id: i.category_id || null,
      })) : [],
    };
    if (!multiLine) delete body.items;
    try {
      if (editMode) {
        await portalExpenseApi.updateClaim(subdomain, claimId, body);
        navigate(`/portal/${subdomain}/hrms/expenses/claims/${claimId}`);
      } else {
        const r = await portalExpenseApi.createClaim(subdomain, body);
        const created = r.data?.data || r.data;
        navigate(`/portal/${subdomain}/hrms/expenses/claims/${created.id}`);
      }
    } catch (e) {
      setError(e.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-400">Loading…</div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{editMode ? "Edit Expense Claim" : "New Expense Claim"}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {editMode ? "Update the claim details below" : "Fill in the details for your expense claim"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Basic Information</h2>
          {f("title", "Title *", "text", { required: true, placeholder: "e.g. Business travel — Mumbai visit" })}
          {f("employee_id", "Employee ID *", "text", { required: true, placeholder: "Employee UUID" })}
          <div className="grid grid-cols-2 gap-3">
            {f("currency", "Currency", "text", { placeholder: "INR" })}
          </div>
          {f("description", "Description")}
          <div className="grid grid-cols-3 gap-3">
            {f("project", "Project")}
            {f("cost_center", "Cost Center")}
            {f("client_ref", "Client Ref")}
          </div>
        </div>

        {/* Multi-line toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={multiLine} onChange={e => { setMultiLine(e.target.checked); if (e.target.checked && !items.length) setItems([{ ...EMPTY_ITEM }]); }} />
              <div className={`w-9 h-5 rounded-full transition-colors ${multiLine ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`} />
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${multiLine ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Multi-line claim</span>
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400">Add multiple expense items to a single claim</span>
        </div>

        {/* Single-line expense */}
        {!multiLine && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Expense Details</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
              <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select category…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {f("expense_date", "Expense Date", "date")}
              {f("amount", "Amount (₹) *", "number", { required: !multiLine, min: 0.01, step: "0.01", placeholder: "0.00" })}
            </div>
          </div>
        )}

        {/* Multi-line items */}
        {multiLine && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Expense Items</h2>
              {totalFromItems > 0 && (
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">Total: ₹{totalFromItems.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              )}
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Item {idx + 1}</span>
                  {items.length > 1 && (
                    <DeleteIconBtn onClick={() => setConfirmRemoveIdx(idx)} title="Remove item" />
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Category</label>
                    <select value={item.category_id} onChange={e => setItem(idx, "category_id", e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">Select…</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Date *</label>
                    <input type="date" value={item.expense_date} onChange={e => setItem(idx, "expense_date", e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Amount (₹) *</label>
                    <input type="number" min="0.01" step="0.01" value={item.amount} onChange={e => setItem(idx, "amount", e.target.value)} placeholder="0.00"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tax (₹)</label>
                    <input type="number" min="0" step="0.01" value={item.tax_amount} onChange={e => setItem(idx, "tax_amount", e.target.value)} placeholder="0.00"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                    <input type="text" value={item.notes} onChange={e => setItem(idx, "notes", e.target.value)} placeholder="Optional notes…"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem}
              className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              + Add Item
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving || !form.title || !form.employee_id}
            className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
            {saving ? "Saving…" : editMode ? "Update Claim" : "Create Claim"}
          </button>
        </div>
      </form>
      <ConfirmDialog
        open={confirmRemoveIdx !== null}
        title="Remove Item"
        message="Remove this expense item?"
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={() => removeItem(confirmRemoveIdx)}
        onCancel={() => setConfirmRemoveIdx(null)}
      />
    </div>
  );
}
