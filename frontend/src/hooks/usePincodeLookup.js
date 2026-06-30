import { useState } from "react";

const _cache = {};

export default function usePincodeLookup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);

  const lookup = async (postalCode, countryHint = "IN") => {
    const code = (postalCode || "").trim();
    if (!code) return null;
    const key = `${countryHint}|${code}`;
    if (_cache[key] !== undefined) {
      const cached = _cache[key];
      setResult(cached);
      setError(cached ? null : "Not found");
      return cached;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.zippopotam.us/${encodeURIComponent(countryHint)}/${encodeURIComponent(code)}`;
      const res = await fetch(url);
      if (!res.ok) {
        _cache[key] = null;
        setResult(null);
        setError("Postal code not found");
        return null;
      }
      const data = await res.json();
      const place = data.places?.[0];
      if (!place) {
        _cache[key] = null;
        setResult(null);
        setError("No location data");
        return null;
      }
      const found = {
        country:  data["country"] || "",
        state:    place["state"] || "",
        city:     place["place name"] || "",
        district: "",
      };
      _cache[key] = found;
      setResult(found);
      return found;
    } catch {
      _cache[key] = null;
      setResult(null);
      setError("Lookup failed");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { lookup, loading, result, error };
}
