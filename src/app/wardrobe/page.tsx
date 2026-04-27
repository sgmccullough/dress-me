"use client";

import { useEffect, useState } from "react";
import { ClothingItem, ClothingItemType, Activity } from "@/lib/types";

const CLOTHING_TYPES: { value: ClothingItemType; label: string }[] = [
  { value: "BASE_LAYER", label: "Base Layer" },
  { value: "MID_LAYER", label: "Mid Layer" },
  { value: "OUTER_LAYER", label: "Outer Layer" },
  { value: "BOTTOMS", label: "Bottoms" },
  { value: "ACCESSORIES", label: "Accessories" },
];

const ACTIVITIES: { value: Activity; label: string }[] = [
  { value: "running", label: "Running" },
  { value: "cycling", label: "Cycling" },
];

const TYPE_LABELS: Record<ClothingItemType, string> = {
  BASE_LAYER: "Base",
  MID_LAYER: "Mid",
  OUTER_LAYER: "Outer",
  BOTTOMS: "Bottoms",
  ACCESSORIES: "Accessories",
};

interface FormState {
  name: string;
  type: ClothingItemType;
  activities: Activity[];
  minTemp: string;
  maxTemp: string;
  isWindproof: boolean;
  isWaterproof: boolean;
  notes: string;
}

const defaultForm: FormState = {
  name: "",
  type: "BASE_LAYER",
  activities: ["cycling"],
  minTemp: "40",
  maxTemp: "70",
  isWindproof: false,
  isWaterproof: false,
  notes: "",
};

export default function WardrobePage() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadItems() {
    const res = await fetch("/api/wardrobe");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadItems(); }, []);

  function startAdd() {
    setForm(defaultForm);
    setEditingId(null);
    setShowForm(true);
    setError(null);
  }

  function startEdit(item: ClothingItem) {
    setForm({
      name: item.name,
      type: item.type,
      activities: item.activities,
      minTemp: String(item.minTemp),
      maxTemp: String(item.maxTemp),
      isWindproof: item.isWindproof,
      isWaterproof: item.isWaterproof,
      notes: item.notes ?? "",
    });
    setEditingId(item.id);
    setShowForm(true);
    setError(null);
  }

  function cancel() {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  function toggleActivity(activity: Activity) {
    setForm((f) => ({
      ...f,
      activities: f.activities.includes(activity)
        ? f.activities.filter((a) => a !== activity)
        : [...f.activities, activity],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.activities.length === 0) {
      setError("Select at least one activity");
      return;
    }

    setSaving(true);
    setError(null);

    const body = {
      name: form.name,
      type: form.type,
      activities: form.activities,
      minTemp: Number(form.minTemp),
      maxTemp: Number(form.maxTemp),
      isWindproof: form.isWindproof,
      isWaterproof: form.isWaterproof,
      notes: form.notes || null,
    };

    const url = editingId ? `/api/wardrobe/${editingId}` : "/api/wardrobe";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      setError("Failed to save item");
    } else {
      await loadItems();
      cancel();
    }

    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    const res = await fetch(`/api/wardrobe/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-sm mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">My Wardrobe</h1>
          {!showForm && (
            <button
              onClick={startAdd}
              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add item
            </button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4"
          >
            <h2 className="text-sm font-semibold text-gray-700">
              {editingId ? "Edit item" : "New item"}
            </h2>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Name</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Patagonia Nano Puff"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ClothingItemType }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CLOTHING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Activities</label>
              <div className="flex gap-3">
                {ACTIVITIES.map((a) => (
                  <label key={a.value} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.activities.includes(a.value)}
                      onChange={() => toggleActivity(a.value)}
                      className="rounded"
                    />
                    {a.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500">Min temp (°F)</label>
                <input
                  type="number"
                  value={form.minTemp}
                  onChange={(e) => setForm((f) => ({ ...f, minTemp: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500">Max temp (°F)</label>
                <input
                  type="number"
                  value={form.maxTemp}
                  onChange={(e) => setForm((f) => ({ ...f, maxTemp: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isWindproof}
                  onChange={(e) => setForm((f) => ({ ...f, isWindproof: e.target.checked }))}
                  className="rounded"
                />
                Windproof
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isWaterproof}
                  onChange={(e) => setForm((f) => ({ ...f, isWaterproof: e.target.checked }))}
                  className="rounded"
                />
                Waterproof
              </label>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : editingId ? "Save changes" : "Add to wardrobe"}
              </button>
              <button
                type="button"
                onClick={cancel}
                className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No items yet. Add your gear to get personalized recommendations.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.minTemp}–{item.maxTemp}°F &middot;{" "}
                      {item.activities.join(", ")}
                    </p>
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {TYPE_LABELS[item.type]}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {item.isWindproof && (
                    <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">Windproof</span>
                  )}
                  {item.isWaterproof && (
                    <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full">Waterproof</span>
                  )}
                </div>
                {item.notes && (
                  <p className="text-xs text-gray-400 italic">{item.notes}</p>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => startEdit(item)}
                    className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
