import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";

export default function AssetCategories() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();

  const [categories, setCategories] = useState([]);
  const [subCats, setSubCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError("");
      try {
        const [metaRes, subRes] = await Promise.all([
          portalAssetApi.metaOptions(subdomain, token),
          portalAssetApi.listSubCategories(subdomain, token, { page_size: 500 }),
        ]);
        setCategories(metaRes.data?.data?.categories || []);
        setSubCats(subRes.data?.data?.data || []);
      } catch {
        setError("Failed to load categories.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [subdomain, token]);

  const subCatsByCategory = subCats.reduce((acc, sc) => {
    if (!acc[sc.category_id]) acc[sc.category_id] = [];
    acc[sc.category_id].push(sc);
    return acc;
  }, {});

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <AssetLayout title="Asset Categories">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>Asset Categories</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>
            {categories.length} categories · {subCats.length} sub-categories
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "#f87171" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
      ) : categories.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
          <div style={{ fontSize: 14, color: "var(--c-muted)" }}>No asset categories configured yet.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {categories.map(cat => {
            const subs = subCatsByCategory[cat.id] || [];
            const isOpen = expanded[cat.id] !== false;
            return (
              <div key={cat.id} style={{
                background: "var(--c-surface)", border: "1px solid var(--c-border)",
                borderRadius: 10, overflow: "hidden",
              }}>
                {/* Category header */}
                <button
                  onClick={() => toggle(cat.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 16px", background: "none", border: "none",
                    cursor: "pointer", textAlign: "left",
                    borderBottom: isOpen && subs.length > 0 ? "1px solid var(--c-border)" : "none",
                  }}
                >
                  <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{cat.icon || "📦"}</span>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {cat.category_name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1 }}>
                      {subs.length} sub-categor{subs.length === 1 ? "y" : "ies"}
                    </div>
                  </div>
                  <span style={{
                    fontFamily: "monospace", fontSize: 10, padding: "2px 5px",
                    borderRadius: 4, background: "var(--c-surface2)",
                    color: "var(--c-muted)", border: "1px solid var(--c-border)", flexShrink: 0,
                  }}>{cat.category_code}</span>
                  {subs.length > 0 && (
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      style={{ color: "var(--c-muted)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>

                {/* Sub-categories */}
                {isOpen && subs.length > 0 && (
                  <div style={{ padding: "8px 12px 10px" }}>
                    {subs.map(sc => (
                      <div key={sc.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "6px 8px", borderRadius: 6, marginBottom: 2,
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface2)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <span style={{ fontSize: 12, color: "var(--c-text)" }}>{sc.sub_category_name}</span>
                        <span style={{ fontFamily: "monospace", fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
                          {sc.sub_category_code}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AssetLayout>
  );
}
