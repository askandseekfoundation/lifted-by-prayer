import React, { useState, useEffect, useCallback } from "react";

/* ─── Supabase lightweight client ─── */
const SUPABASE_URL = "https://fdphbzxkqqihigqhpynw.supabase.co";
const SUPABASE_KEY =
  "sb_publishable_4Vq6vik7S51luaVJkN3ASg_T8LN7bL6";

const supabase = {
  from(table) {
    const base = `${SUPABASE_URL}/rest/v1/${table}`;
    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
    return {
      async select(columns = "*", order = { column: "created_at", ascending: false }) {
        const url = `${base}?select=${columns}&order=${order.column}.${order.ascending ? "asc" : "desc"}`;
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      },
      async insert(row) {
        const res = await fetch(base, {
          method: "POST",
          headers,
          body: JSON.stringify(row),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      },
      async update(id, updates) {
        const url = `${base}?id=eq.${id}`;
        const res = await fetch(url, {
          method: "PATCH",
          headers,
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      },
    };
  },
};

/* ─── Style constants ─── */
const CREAM = "#FFF8F0";
const PINK = "#F4A7BB";
const PINK_LIGHT = "#FCEEF2";
const PINK_DARK = "#E8899F";
const TEXT_DARK = "#3D2B2B";
const TEXT_MED = "#6B5252";
const TEXT_LIGHT = "#9B8585";
const WHITE = "#FFFFFF";
const SHADOW = "0 2px 12px rgba(244,167,187,0.15)";

/* ─── Categories ─── */
const CATEGORIES = [
  "Health & Healing",
  "Family & Relationships",
  "Finances & Provision",
  "Guidance & Direction",
  "Gratitude & Praise",
  "Grief & Loss",
  "Spiritual Growth",
  "Other",
];

/* ─── Icons (inline SVG) ─── */
const HeartIcon = ({ filled, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? PINK : "none"} stroke={PINK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const PrayerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" opacity="0.2" fill={PINK_LIGHT}/>
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round" />
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/* ─── Main App ─── */
export default function App() {
  const [tab, setTab] = useState("wall");
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* Fetch prayers */
  const fetchPrayers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await supabase.from("prayers").select();
      setPrayers(data || []);
      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Unable to load prayers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrayers();
  }, [fetchPrayers]);

  /* Pray for someone */
  const handlePray = async (id, currentCount) => {
    const storageKey = `prayed_${id}`;
    if (localStorage.getItem(storageKey)) return;

    const newCount = (currentCount || 0) + 1;
    setPrayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, pray_count: newCount } : p))
    );
    localStorage.setItem(storageKey, "true");

    try {
      await supabase.from("prayers").update(id, { pray_count: newCount });
    } catch (err) {
      console.error("Pray update error:", err);
    }
  };

  /* Submit prayer */
  const handleSubmit = async (formData) => {
    try {
      const displayName = formData.anonymous ? "Anonymous" : formData.name;
      await supabase.from("prayers").insert({
        name: displayName,
        anonymous: formData.anonymous,
        request: formData.request,
        category: formData.category,
        pray_count: 0,
      });

      // Send email notification (don't block the UI if it fails)
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: displayName,
          category: formData.category,
          request: formData.request,
        }),
      }).catch((err) => console.error("Email notification error:", err));

      await fetchPrayers();
      setTab("wall");
      return { success: true };
    } catch (err) {
      console.error("Submit error:", err);
      return { success: false, error: "Unable to submit prayer. Please try again." };
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: CREAM, fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      {/* Header */}
      <header style={{
        background: `linear-gradient(135deg, ${WHITE} 0%, ${PINK_LIGHT} 100%)`,
        padding: "32px 20px 20px",
        textAlign: "center",
        borderBottom: `2px solid ${PINK}`,
      }}>
        <div style={{ fontSize: "13px", letterSpacing: "3px", color: PINK_DARK, marginBottom: "6px", fontFamily: "'Georgia', serif" }}>
          ✦ A MINISTRY OF ASK & SEEK FOUNDATION ✦
        </div>
        <h1 style={{
          fontSize: "clamp(28px, 6vw, 42px)",
          color: TEXT_DARK,
          margin: "0 0 4px",
          fontWeight: "400",
          fontFamily: "'Georgia', serif",
          letterSpacing: "1px",
        }}>
          Lifted by Prayer
        </h1>
        <p style={{ color: TEXT_MED, fontSize: "15px", margin: 0, fontStyle: "italic" }}>
          "Ask, and it shall be given you; seek, and ye shall find." — Matthew 7:7
        </p>
      </header>

      {/* Tab Navigation */}
      <nav style={{
        display: "flex",
        justifyContent: "center",
        gap: "4px",
        padding: "12px 16px",
        backgroundColor: WHITE,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        {[
          { key: "wall", label: "🙏 Prayer Wall" },
          { key: "submit", label: "✍️ Submit Request" },
          { key: "give", label: "💝 Give / Donate" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: "25px",
              fontSize: "14px",
              fontFamily: "'Georgia', serif",
              cursor: "pointer",
              transition: "all 0.25s ease",
              backgroundColor: tab === key ? PINK : "transparent",
              color: tab === key ? WHITE : TEXT_MED,
              fontWeight: tab === key ? "bold" : "normal",
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "24px 16px 80px" }}>
        {tab === "wall" && (
          <PrayerWall
            prayers={prayers}
            loading={loading}
            error={error}
            onPray={handlePray}
            onRefresh={fetchPrayers}
          />
        )}
        {tab === "submit" && <SubmitForm onSubmit={handleSubmit} />}
        {tab === "give" && <GiveDonate />}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: "center",
        padding: "28px 20px",
        borderTop: `2px solid ${PINK_LIGHT}`,
        backgroundColor: WHITE,
      }}>
        <div style={{
          fontSize: "12px",
          letterSpacing: "2.5px",
          color: TEXT_LIGHT,
          fontFamily: "'Georgia', serif",
          fontWeight: "bold",
        }}>
          LIFTED BY PRAYER · A MINISTRY OF ASK & SEEK FOUNDATION
        </div>
        <div style={{ fontSize: "11px", color: TEXT_LIGHT, marginTop: "8px" }}>
          A 501(c)(3) nonprofit organization · EIN 42-2057592
        </div>
        <div style={{ fontSize: "11px", color: TEXT_LIGHT, marginTop: "4px" }}>
          info@askandseekfoundation.org
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════
   Prayer Wall Tab
   ═══════════════════════════════════════ */
function PrayerWall({ prayers, loading, error, onPray, onRefresh }) {
  const [filter, setFilter] = useState("All");

  const filtered = filter === "All" ? prayers : prayers.filter((p) => p.category === filter);

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <h2 style={{ color: TEXT_DARK, fontWeight: "400", fontSize: "24px", margin: "0 0 6px", fontFamily: "'Georgia', serif" }}>
          Community Prayer Wall
        </h2>
        <p style={{ color: TEXT_MED, fontSize: "14px", margin: 0 }}>
          {prayers.length} prayer{prayers.length !== 1 ? "s" : ""} lifted up
        </p>
      </div>

      {/* Category Filter */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
        justifyContent: "center",
        marginBottom: "20px",
      }}>
        {["All", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: `1px solid ${filter === cat ? PINK : "#E8D8D8"}`,
              backgroundColor: filter === cat ? PINK_LIGHT : WHITE,
              color: filter === cat ? PINK_DARK : TEXT_LIGHT,
              fontSize: "12px",
              cursor: "pointer",
              fontFamily: "'Georgia', serif",
              transition: "all 0.2s ease",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "40px", color: TEXT_LIGHT }}>
          <div style={{ fontSize: "28px", marginBottom: "12px", animation: "pulse 1.5s infinite" }}>🙏</div>
          <p>Loading prayers...</p>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </div>
      )}

      {error && (
        <div style={{
          textAlign: "center",
          padding: "24px",
          backgroundColor: "#FFF0F0",
          borderRadius: "12px",
          color: "#C44",
          margin: "16px 0",
        }}>
          <p>{error}</p>
          <button
            onClick={onRefresh}
            style={{
              marginTop: "8px",
              padding: "8px 20px",
              backgroundColor: PINK,
              color: WHITE,
              border: "none",
              borderRadius: "20px",
              cursor: "pointer",
              fontFamily: "'Georgia', serif",
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: TEXT_LIGHT }}>
          <p style={{ fontSize: "16px" }}>No prayers in this category yet.</p>
          <p style={{ fontSize: "14px" }}>Be the first to submit a request! 🩷</p>
        </div>
      )}

      {/* Prayer Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {filtered.map((prayer) => (
          <PrayerCard key={prayer.id} prayer={prayer} onPray={onPray} />
        ))}
      </div>
    </div>
  );
}

/* ─── Single Prayer Card ─── */
function PrayerCard({ prayer, onPray }) {
  const hasPrayed = localStorage.getItem(`prayed_${prayer.id}`);
  const timeAgo = getTimeAgo(prayer.created_at);

  return (
    <div style={{
      backgroundColor: WHITE,
      borderRadius: "16px",
      padding: "20px 24px",
      boxShadow: SHADOW,
      border: `1px solid ${PINK_LIGHT}`,
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div>
          <span style={{ fontWeight: "bold", color: TEXT_DARK, fontSize: "15px" }}>
            {prayer.anonymous ? "Anonymous" : prayer.name || "Anonymous"}
          </span>
          <span style={{ color: TEXT_LIGHT, fontSize: "12px", marginLeft: "10px" }}>{timeAgo}</span>
        </div>
        {prayer.category && (
          <span style={{
            fontSize: "11px",
            padding: "3px 10px",
            borderRadius: "12px",
            backgroundColor: PINK_LIGHT,
            color: PINK_DARK,
            fontFamily: "'Georgia', serif",
            whiteSpace: "nowrap",
          }}>
            {prayer.category}
          </span>
        )}
      </div>

      {/* Prayer text */}
      <p style={{
        color: TEXT_MED,
        fontSize: "15px",
        lineHeight: "1.7",
        margin: "0 0 14px",
        fontFamily: "'Georgia', serif",
      }}>
        {prayer.request}
      </p>

      {/* Pray button */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={() => !hasPrayed && onPray(prayer.id, prayer.pray_count)}
          disabled={!!hasPrayed}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 16px",
            borderRadius: "20px",
            border: `1px solid ${PINK}`,
            backgroundColor: hasPrayed ? PINK_LIGHT : WHITE,
            color: PINK_DARK,
            cursor: hasPrayed ? "default" : "pointer",
            fontSize: "13px",
            fontFamily: "'Georgia', serif",
            transition: "all 0.2s ease",
            opacity: hasPrayed ? 0.8 : 1,
          }}
        >
          <HeartIcon filled={!!hasPrayed} size={16} />
          {hasPrayed ? "Prayed" : "Pray"}
        </button>
        <span style={{ fontSize: "13px", color: TEXT_LIGHT }}>
          {prayer.pray_count || 0} {(prayer.pray_count || 0) === 1 ? "prayer" : "prayers"}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Submit Request Tab
   ═══════════════════════════════════════ */
function SubmitForm({ onSubmit }) {
  const [name, setName] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [request, setRequest] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async () => {
    if (!request.trim()) {
      setMessage({ type: "error", text: "Please enter your prayer request." });
      return;
    }
    if (!category) {
      setMessage({ type: "error", text: "Please select a category." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const result = await onSubmit({ name, anonymous, request, category });

    if (result.success) {
      setName("");
      setAnonymous(false);
      setRequest("");
      setCategory("");
      setMessage({ type: "success", text: "Your prayer has been lifted up! 🙏🩷" });
    } else {
      setMessage({ type: "error", text: result.error });
    }
    setSubmitting(false);
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: `1px solid #E0D0D0`,
    fontSize: "15px",
    fontFamily: "'Georgia', serif",
    backgroundColor: WHITE,
    color: TEXT_DARK,
    outline: "none",
    transition: "border-color 0.2s ease",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontSize: "14px",
    color: TEXT_DARK,
    fontWeight: "bold",
    fontFamily: "'Georgia', serif",
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <h2 style={{ color: TEXT_DARK, fontWeight: "400", fontSize: "24px", margin: "0 0 6px", fontFamily: "'Georgia', serif" }}>
          Submit a Prayer Request
        </h2>
        <p style={{ color: TEXT_MED, fontSize: "14px", margin: 0, fontStyle: "italic" }}>
          Share your heart. Our community will pray with you.
        </p>
      </div>

      <div style={{
        backgroundColor: WHITE,
        borderRadius: "16px",
        padding: "28px",
        boxShadow: SHADOW,
        border: `1px solid ${PINK_LIGHT}`,
      }}>
        {/* Name */}
        <div style={{ marginBottom: "18px" }}>
          <label style={labelStyle}>Your Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={anonymous}
            style={{ ...inputStyle, opacity: anonymous ? 0.5 : 1 }}
          />
        </div>

        {/* Anonymous */}
        <div style={{ marginBottom: "18px", display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="checkbox"
            id="anon"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: PINK }}
          />
          <label htmlFor="anon" style={{ fontSize: "14px", color: TEXT_MED, cursor: "pointer", fontFamily: "'Georgia', serif" }}>
            Submit anonymously
          </label>
        </div>

        {/* Category */}
        <div style={{ marginBottom: "18px" }}>
          <label style={labelStyle}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
          >
            <option value="">Select a category...</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Prayer Request */}
        <div style={{ marginBottom: "22px" }}>
          <label style={labelStyle}>Prayer Request</label>
          <textarea
            placeholder="Share your prayer request here..."
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={5}
            style={{ ...inputStyle, resize: "vertical", lineHeight: "1.6" }}
          />
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "16px",
            fontSize: "14px",
            fontFamily: "'Georgia', serif",
            backgroundColor: message.type === "success" ? "#F0FFF4" : "#FFF0F0",
            color: message.type === "success" ? "#2D8A4E" : "#C44",
            border: `1px solid ${message.type === "success" ? "#C6F6D5" : "#FED7D7"}`,
          }}>
            {message.text}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: submitting ? TEXT_LIGHT : PINK,
            color: WHITE,
            fontSize: "16px",
            fontWeight: "bold",
            fontFamily: "'Georgia', serif",
            cursor: submitting ? "not-allowed" : "pointer",
            transition: "all 0.25s ease",
            letterSpacing: "0.5px",
          }}
        >
          {submitting ? "Submitting..." : "🙏 Lift This Prayer Up"}
        </button>
      </div>

      <p style={{ textAlign: "center", fontSize: "12px", color: TEXT_LIGHT, marginTop: "16px", fontStyle: "italic" }}>
        All prayer requests are treated with love and confidentiality.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════
   Give / Donate Tab
   ═══════════════════════════════════════ */
function GiveDonate() {
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <h2 style={{ color: TEXT_DARK, fontWeight: "400", fontSize: "24px", margin: "0 0 6px", fontFamily: "'Georgia', serif" }}>
          Give & Support
        </h2>
        <p style={{ color: TEXT_MED, fontSize: "14px", margin: 0, fontStyle: "italic" }}>
          "Each of you should give what you have decided in your heart to give." — 2 Corinthians 9:7
        </p>
      </div>

      <div style={{
        backgroundColor: WHITE,
        borderRadius: "16px",
        padding: "32px 28px",
        boxShadow: SHADOW,
        border: `1px solid ${PINK_LIGHT}`,
        textAlign: "center",
      }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>💝</div>
        <h3 style={{ color: TEXT_DARK, fontWeight: "400", fontSize: "20px", margin: "0 0 12px", fontFamily: "'Georgia', serif" }}>
          Your Generosity Makes a Difference
        </h3>
        <p style={{ color: TEXT_MED, fontSize: "15px", lineHeight: "1.7", margin: "0 0 24px", fontFamily: "'Georgia', serif" }}>
          Your donations help us maintain this platform, support our prayer community,
          and expand our ministry's outreach. Every gift — no matter the size — is a
          blessing that keeps this mission alive.
        </p>

        <div style={{
          backgroundColor: PINK_LIGHT,
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
        }}>
          <p style={{ color: PINK_DARK, fontSize: "14px", fontFamily: "'Georgia', serif", margin: 0, fontWeight: "bold" }}>
            🔜 Online Donations Coming Soon
          </p>
          <p style={{ color: TEXT_MED, fontSize: "13px", fontFamily: "'Georgia', serif", margin: "8px 0 0" }}>
            We're setting up secure payment processing. In the meantime, please reach out
            to us directly for donation inquiries.
          </p>
        </div>

        <div style={{
          padding: "16px",
          borderRadius: "12px",
          border: `1px dashed ${PINK}`,
          backgroundColor: CREAM,
        }}>
          <p style={{ color: TEXT_DARK, fontSize: "14px", margin: "0 0 4px", fontFamily: "'Georgia', serif", fontWeight: "bold" }}>
            Contact Us to Give
          </p>
          <a
            href="mailto:info@askandseekfoundation.org"
            style={{ color: PINK_DARK, fontSize: "14px", fontFamily: "'Georgia', serif" }}
          >
            info@askandseekfoundation.org
          </a>
        </div>

        <p style={{ color: TEXT_LIGHT, fontSize: "12px", marginTop: "20px", fontFamily: "'Georgia', serif" }}>
          Ask & Seek Foundation is a registered 501(c)(3) nonprofit.
          <br />
          EIN: 42-2057592 · All donations are tax-deductible.
        </p>
      </div>
    </div>
  );
}

/* ─── Helper: relative time ─── */
function getTimeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return then.toLocaleDateString();
}
