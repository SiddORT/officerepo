import { useState } from "react";

// ISO 3166-1 alpha-2 lookup by common country name variants.
// Keys are lowercased for case-insensitive matching.
const COUNTRY_NAME_TO_ISO = {
  // A
  "afghanistan": "AF",
  "albania": "AL",
  "algeria": "DZ",
  "andorra": "AD",
  "angola": "AO",
  "argentina": "AR",
  "armenia": "AM",
  "australia": "AU",
  "austria": "AT",
  "azerbaijan": "AZ",
  // B
  "bahrain": "BH",
  "bangladesh": "BD",
  "belarus": "BY",
  "belgium": "BE",
  "bolivia": "BO",
  "bosnia": "BA",
  "bosnia and herzegovina": "BA",
  "botswana": "BW",
  "brazil": "BR",
  "brasil": "BR",
  "brunei": "BN",
  "bulgaria": "BG",
  // C
  "cambodia": "KH",
  "cameroon": "CM",
  "canada": "CA",
  "chile": "CL",
  "china": "CN",
  "colombia": "CO",
  "costa rica": "CR",
  "croatia": "HR",
  "cuba": "CU",
  "cyprus": "CY",
  "czech republic": "CZ",
  "czechia": "CZ",
  // D
  "denmark": "DK",
  // E
  "ecuador": "EC",
  "egypt": "EG",
  "el salvador": "SV",
  "estonia": "EE",
  "ethiopia": "ET",
  // F
  "finland": "FI",
  "france": "FR",
  // G
  "georgia": "GE",
  "germany": "DE",
  "ghana": "GH",
  "greece": "GR",
  "guatemala": "GT",
  // H
  "honduras": "HN",
  "hong kong": "HK",
  "hungary": "HU",
  // I
  "iceland": "IS",
  "india": "IN",
  "indonesia": "ID",
  "iran": "IR",
  "iraq": "IQ",
  "ireland": "IE",
  "israel": "IL",
  "italy": "IT",
  // J
  "jamaica": "JM",
  "japan": "JP",
  "jordan": "JO",
  // K
  "kazakhstan": "KZ",
  "kenya": "KE",
  "kuwait": "KW",
  "kyrgyzstan": "KG",
  // L
  "latvia": "LV",
  "lebanon": "LB",
  "libya": "LY",
  "liechtenstein": "LI",
  "lithuania": "LT",
  "luxembourg": "LU",
  // M
  "macau": "MO",
  "macao": "MO",
  "malaysia": "MY",
  "maldives": "MV",
  "malta": "MT",
  "mexico": "MX",
  "moldova": "MD",
  "mongolia": "MN",
  "morocco": "MA",
  "mozambique": "MZ",
  "myanmar": "MM",
  "burma": "MM",
  // N
  "namibia": "NA",
  "nepal": "NP",
  "netherlands": "NL",
  "holland": "NL",
  "new zealand": "NZ",
  "nicaragua": "NI",
  "nigeria": "NG",
  "north korea": "KP",
  "norway": "NO",
  // O
  "oman": "OM",
  // P
  "pakistan": "PK",
  "panama": "PA",
  "paraguay": "PY",
  "peru": "PE",
  "philippines": "PH",
  "poland": "PL",
  "portugal": "PT",
  // Q
  "qatar": "QA",
  // R
  "romania": "RO",
  "russia": "RU",
  "russian federation": "RU",
  "rwanda": "RW",
  // S
  "saudi arabia": "SA",
  "senegal": "SN",
  "serbia": "RS",
  "singapore": "SG",
  "slovakia": "SK",
  "slovenia": "SI",
  "south africa": "ZA",
  "south korea": "KR",
  "republic of korea": "KR",
  "spain": "ES",
  "sri lanka": "LK",
  "sudan": "SD",
  "sweden": "SE",
  "switzerland": "CH",
  "syria": "SY",
  // T
  "taiwan": "TW",
  "tajikistan": "TJ",
  "tanzania": "TZ",
  "thailand": "TH",
  "tunisia": "TN",
  "turkey": "TR",
  "türkiye": "TR",
  "turkmenistan": "TM",
  // U
  "uganda": "UG",
  "ukraine": "UA",
  "united arab emirates": "AE",
  "uae": "AE",
  "united kingdom": "GB",
  "uk": "GB",
  "great britain": "GB",
  "britain": "GB",
  "england": "GB",
  "united states": "US",
  "united states of america": "US",
  "usa": "US",
  "us": "US",
  "uruguay": "UY",
  "uzbekistan": "UZ",
  // V
  "venezuela": "VE",
  "vietnam": "VN",
  "viet nam": "VN",
  // Y
  "yemen": "YE",
  // Z
  "zambia": "ZM",
  "zimbabwe": "ZW",
};

/**
 * Resolve a country string to an ISO 3166-1 alpha-2 code.
 * Accepts:
 *   - An already-valid 2-letter ISO code (returned as-is, uppercased)
 *   - A country name (looked up in COUNTRY_NAME_TO_ISO)
 * Falls back to "IN" when nothing matches.
 */
export function resolveCountryCode(countryStr) {
  if (!countryStr) return "IN";
  const trimmed = countryStr.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();
  return COUNTRY_NAME_TO_ISO[lower] || "IN";
}

const _cache = {};

export default function usePincodeLookup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);

  /**
   * Look up a postal code.
   * @param {string} postalCode  The postal / ZIP / PIN code to look up.
   * @param {string} [countryHint="IN"]  Country name OR ISO 2-letter code.
   *   Examples: "India", "IN", "United States", "US", "Germany", "DE"
   */
  const lookup = async (postalCode, countryHint = "IN") => {
    const code = (postalCode || "").trim();
    if (!code) return null;
    const iso = resolveCountryCode(countryHint);
    const key = `${iso}|${code}`;
    if (_cache[key] !== undefined) {
      const cached = _cache[key];
      setResult(cached);
      setError(cached ? null : "Not found");
      return cached;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.zippopotam.us/${encodeURIComponent(iso)}/${encodeURIComponent(code)}`;
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
