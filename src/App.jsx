import { useState, useEffect } from "react";

const initialPrayers = [
  { id: 1, name: "Maria T.", anonymous: false, request: "Please pray for my mother's recovery from surgery. She goes in next week and we're all a bit scared.", category: "Health", prayCount: 24, timestamp: "2 hours ago", comments: [{ id: 1, name: "Grace L.", text: "Praying for a smooth surgery and full recovery 🙏", timestamp: "1 hour ago" }] },
  { id: 2, name: "Anonymous", anonymous: true, request: "Struggling with anxiety and feeling lost. Asking for peace and clarity in my life right now.", category: "Peace", prayCount: 41, timestamp: "4 hours ago", comments: [{ id: 1, name: "David R.", text: "You are not alone. Lifting you up right now.", timestamp: "3 hours ago" }] },
  { id: 3, name: "David R.", anonymous: false, request: "Praying for my marriage. We're going through a difficult season and need God's guidance.", category: "Family", prayCount: 18, timestamp: "Yesterday", comments: [] },
  { id: 4, name: "Anonymous", anonymous: true, request: "Job loss has been hard on my family. Trusting God for provision and new doors to open.", category: "Provision", prayCount: 57, timestamp: "Yesterday", comments: [{ id: 1, name: "Maria T.", text: "God will make a way. Standing in agreement with you 💛", timestamp: "Yesterday" }] },
  { id: 5, name: "Grace L.", anonymous: false, request: "My son is going through a tough time in school. Please lift him up.", category: "Family", prayCount: 33, timestamp: "2 days ago", comments: [] },
];

const categories = ["Health", "Family", "Peace", "Provision", "Guidance", "Gratitude", "Other"];
const DONATION_AMOUNTS = [1, 5, 10, 25];

const PINK = "#f4b8c8";
const PINK_DARK = "#e8899f";
const PINK_LIGHT = "#fdf0f4";
const CREAM = "#f7f5f0";
const DARK = "#2c2416";
const GOLD = "#b4a07a";
const MUTED = "#8a7d6a";

const categoryColors = {
  Health: "#7fb3a0", Family: "#c49ac4", Peace: "#7f9eb3", Provision: "#b3a07f",
  Guidance: "#e8899f", Gratitude: "#7fb37f", Other: "#a3a3a3"
};

export default function PrayerApp() {
  const [tab, setTab] = useState("wall");
  const [prayers, setPrayers] = useState(initialPrayers);
  const [prayedFor, setPrayedFor] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [commentNames, setCommentNames] = useState({});
  const [form, setForm] = useState({ name: "", anonymous: false, request: "", category: "Health" });
  const [submitted, setSubmitted] = useState(false);
  const [donationAmount, setDonationAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState("");
  const [donationNote, setDonationNote] = useState("");
  const [donationSubmitted, setDonationSubmitted] = useState(false);
  const [filterCategory, setFilterCategory] = useState("All");
  const [totalPrayers, setTotalPrayers] = useState(0);

  useEffect(() => {
    setTotalPrayers(prayers.reduce((sum, p) => sum + p.prayCount, 0));
  }, [prayers]);

  const handlePray = (id) => {
    if (prayedFor[id]) return;
    setPrayers(prev => prev.map(p => p.id === id ? { ...p, prayCount: p.prayCount + 1 } : p));
    setPrayedFor(prev => ({ ...prev, [id]: true }));
  };

  const toggleComments = (id) => setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }));

  const handleAddComment = (prayerId) => {
    const text = (commentInputs[prayerId] || "").trim();
    const name = (commentNames[prayerId] || "").trim() || "Anonymous";
    if (!text) return;
    const newComment = { id: Date.now(), name, text, timestamp: "Just now" };
    setPrayers(prev => prev.map(p => p.id === prayerId ? { ...p, comments: [...p.comments, newComment] } : p));
    setCommentInputs(prev => ({ ...prev, [prayerId]: "" }));
    setCommentNames(prev => ({ ...prev, [prayerId]: "" }));
  };

  const handleSubmitPrayer = () => {
    if (!form.request.trim()) return;
    setPrayers(prev => [{
      id: Date.now(),
      name: form.anonymous ? "Anonymous" : (form.name.trim() || "Anonymous"),
      anonymous: form.anonymous,
      request: form.request,
      category: form.category,
      prayCount: 0,
      timestamp: "Just now",
      comments: []
    }, ...prev]);
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setForm({ name: "", anonymous: false, request: "", category: "Health" }); setTab("wall"); }, 2500);
  };

  const handleDonate = () => {
    setDonationSubmitted(true);
    setTimeout(() => setDonationSubmitted(false), 3000);
  };

  const filtered = filterCategory === "All" ? prayers : prayers.filter(p => p.category === filterCategory);

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `radial-gradient(ellipse at 15% 10%, rgba(244,184,200,0.18) 0%, transparent 50%),
          radial-gradient(ellipse at 85% 90%, rgba(244,184,200,0.12) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(180,160,120,0.07) 0%, transparent 40%)`
      }} />
      <header style={{
        position: "relative", zIndex: 1, textAlign: "center", padding: "48px 24px 32px",
        borderBottom: "1px solid rgba(244,184,200,0.3)",
        background: "linear-gradient(180deg, #fff 0%, #fdf8fb 50%, #f7f5f0 100%)"
      }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: PINK_DARK, textTransform: "uppercase", marginBottom: "12px", fontFamily: "sans-serif" }}>A PLACE OF PEACE</div>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: "400", color: DARK, margin: "0 0 8px", letterSpacing: "-0.5px" }}>Lifted by Prayer</h1>
        <div style={{ width: "48px", height: "2px", background: `linear-gradient(90deg, ${PINK}, ${GOLD})`, margin: "16px auto 20px" }} />
        <p style={{ color: MUTED, fontSize: "15px", margin: "0 0 28px", fontStyle: "italic" }}>Carry each other's burdens, and in this way you will fulfill the law of Christ.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: "40px", flexWrap: "wrap" }}>
          {[{ label: "Prayers Lifted", value: totalPrayers.toLocaleString() }, { label: "Requests Shared", value: prayers.length }, { label: "Community Members", value: "1,248" }].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "600", color: DARK }}>{s.value}</div>
              <div style={{ fontSize: "11px", letterSpacing: "2px", color: GOLD, textTransform: "uppercase", fontFamily: "sans-serif" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </header>
      <nav style={{
        position: "sticky", top: 0, zIndex: 10, display: "flex", justifyContent: "center",
        background: "#fff", borderBottom: "1px solid rgba(244,184,200,0.3)",
        boxShadow: "0 2px 16px rgba(244,184,200,0.15)"
      }}>
        {[{ key: "wall", label: "Prayer Wall" }, { key: "submit", label: "Submit Request" }, { key: "donate", label: "Give" }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "16px 24px", border: "none", background: "none", cursor: "pointer",
            fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", fontFamily: "sans-serif",
            color: tab === t.key ? DARK : "#a89880",
            borderBottom: tab === t.key ? `2px solid ${PINK_DARK}` : "2px solid transparent",
            fontWeight: tab === t.key ? "700" : "400", transition: "all 0.2s"
          }}>{t.label}</button>
        ))}
      </nav>
      <main style={{ position: "relative", zIndex: 1, maxWidth: "780px", margin: "0 auto", padding: "40px 20px 80px" }}>
        {tab === "wall" && (
          <div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "32px", justifyContent: "center" }}>
              {["All", ...categories].map(c => (
                <button key={c} onClick={() => setFilterCategory(c)} style={{
                  padding: "6px 16px", border: `1px solid ${filterCategory === c ? PINK_DARK : "#e0d8cc"}`,
                  borderRadius: "20px", background: filterCategory === c ? PINK_DARK : "transparent",
                  color: filterCategory === c ? "#fff" : MUTED,
                  fontSize: "12px", letterSpacing: "1px", cursor: "pointer", fontFamily: "sans-serif", transition: "all 0.2s"
                }}>{c}</button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {filtered.map(prayer => (
                <div key={prayer.id} style={{
                  background: "#fff", borderRadius: "14px", padding: "28px",
                  boxShadow: "0 2px 20px rgba(244,184,200,0.15)", border: "1px solid rgba(244,184,200,0.2)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        width: "38px", height: "38px", borderRadius: "50%",
                        background: `linear-gradient(135deg, ${PINK_LIGHT}, #faf6ef)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "16px", border: `1px solid ${PINK}44`
                      }}>{prayer.anonymous ? "🙏" : prayer.name[0]}</div>
                      <div>
                        <div style={{ fontWeight: "600", color: DARK, fontSize: "14px", fontFamily: "sans-serif" }}>{prayer.name}</div>
                        <div style={{ color: GOLD, fontSize: "11px", fontFamily: "sans-serif" }}>{prayer.timestamp}</div>
                      </div>
                    </div>
                    <span style={{
                      padding: "4px 12px", borderRadius: "12px", fontSize: "11px", letterSpacing: "1px",
                      background: `${categoryColors[prayer.category]}22`, color: categoryColors[prayer.category],
                      fontFamily: "sans-serif", fontWeight: "600", textTransform: "uppercase"
                    }}>{prayer.category}</span>
                  </div>
                  <p style={{ color: "#4a3f30", fontSize: "15px", lineHeight: "1.7", margin: "0 0 20px", fontStyle: "italic" }}>"{prayer.request}"</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ color: GOLD, fontSize: "13px", fontFamily: "sans-serif" }}>🕊️ <strong>{prayer.prayCount}</strong> prayed</div>
                      <button onClick={() => toggleComments(prayer.id)} style={{ background: "none", border: "none", color: PINK_DARK, cursor: "pointer", fontSize: "13px", fontFamily: "sans-serif", padding: "0" }}>
                        💬 {prayer.comments.length} {prayer.comments.length === 1 ? "comment" : "comments"}
                      </button>
                    </div>
                    <button onClick={() => handlePray(prayer.id)} style={{
                      padding: "8px 22px", border: `1px solid ${prayedFor[prayer.id] ? PINK_DARK : PINK}`,
                      borderRadius: "20px", background: prayedFor[prayer.id] ? `linear-gradient(135deg, ${PINK}, ${PINK_DARK})` : PINK_LIGHT,
                      color: prayedFor[prayer.id] ? "#fff" : PINK_DARK,
                      fontSize: "12px", letterSpacing: "1.5px", cursor: prayedFor[prayer.id] ? "default" : "pointer",
                      fontFamily: "sans-serif", fontWeight: "700", textTransform: "uppercase", transition: "all 0.3s"
                    }}>{prayedFor[prayer.id] ? "✓ Prayed" : "Pray"}</button>
                  </div>
                  {expandedComments[prayer.id] && (
                    <div style={{ marginTop: "20px", borderTop: "1px solid rgba(244,184,200,0.3)", paddingTop: "20px" }}>
                      {prayer.comments.length === 0 && <p style={{ color: "#c4b89a", fontSize: "13px", fontStyle: "italic", fontFamily: "sans-serif", marginBottom: "16px" }}>Be the first to leave an encouraging word...</p>}
                      {prayer.comments.map(c => (
                        <div key={c.id} style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                          <div style={{ width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${PINK_LIGHT}, #faf6ef)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", border: `1px solid ${PINK}44`, fontFamily: "sans-serif", fontWeight: "600", color: PINK_DARK }}>{c.name[0]}</div>
                          <div style={{ background: PINK_LIGHT, borderRadius: "10px", padding: "10px 14px", flex: 1 }}>
                            <div style={{ fontSize: "12px", fontWeight: "700", color: DARK, fontFamily: "sans-serif", marginBottom: "4px" }}>{c.name}</div>
                            <div style={{ fontSize: "14px", color: "#4a3f30", lineHeight: "1.5" }}>{c.text}</div>
                            <div style={{ fontSize: "11px", color: GOLD, fontFamily: "sans-serif", marginTop: "4px" }}>{c.timestamp}</div>
                          </div>
                        </div>
                      ))}
                      <div style={{ marginTop: "12px" }}>
                        <input value={commentNames[prayer.id] || ""} onChange={e => setCommentNames(prev => ({ ...prev, [prayer.id]: e.target.value }))} placeholder="Your name (optional)" style={{ width: "100%", padding: "9px 14px", border: "1px solid rgba(244,184,200,0.5)", borderRadius: "8px", fontSize: "13px", color: DARK, background: "#fdfcfa", outline: "none", boxSizing: "border-box", fontFamily: "sans-serif", marginBottom: "8px" }} />
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input value={commentInputs[prayer.id] || ""} onChange={e => setCommentInputs(prev => ({ ...prev, [prayer.id]: e.target.value }))} placeholder="Leave an encouraging word..." onKeyDown={e => e.key === "Enter" && handleAddComment(prayer.id)} style={{ flex: 1, padding: "9px 14px", border: "1px solid rgba(244,184,200,0.5)", borderRadius: "8px", fontSize: "13px", color: DARK, background: "#fdfcfa", outline: "none", fontFamily: "Georgia, serif", fontStyle: "italic" }} />
                          <button onClick={() => handleAddComment(prayer.id)} style={{ padding: "9px 18px", border: "none", borderRadius: "8px", background: `linear-gradient(135deg, ${PINK}, ${PINK_DARK})`, color: "#fff", cursor: "pointer", fontSize: "13px", fontFamily: "sans-serif", fontWeight: "600" }}>Send</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "submit" && (
          <div style={{ maxWidth: "560px", margin: "0 auto" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "60px 40px", background: "#fff", borderRadius: "16px", boxShadow: "0 2px 24px rgba(244,184,200,0.2)" }}>
                <div style={{ fontSize: "48px", marginBottom: "20px" }}>🙏</div>
                <h2 style={{ color: DARK, fontWeight: "400", marginBottom: "12px" }}>Your request has been lifted up</h2>
                <p style={{ color: MUTED, fontStyle: "italic" }}>The community will be praying for you.</p>
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: "16px", padding: "40px", boxShadow: "0 2px 24px rgba(244,184,200,0.2)", border: "1px solid rgba(244,184,200,0.2)" }}>
                <h2 style={{ color: DARK, fontWeight: "400", marginBottom: "8px", fontSize: "26px" }}>Share Your Request</h2>
                <div style={{ width: "32px", height: "2px", background: `linear-gradient(90deg, ${PINK}, ${GOLD})`, marginBottom: "16px" }} />
                <p style={{ color: MUTED, fontStyle: "italic", marginBottom: "32px", fontSize: "15px" }}>You are not alone. Let the community pray with you.</p>
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ fontSize: "11px", letterSpacing: "2px", color: GOLD, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: "12px" }}>How would you like to share?</div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    {[{ val: false, label: "Use My Name" }, { val: true, label: "Stay Anonymous" }].map(opt => (
                      <button key={String(opt.val)} onClick={() => setForm(f => ({ ...f, anonymous: opt.val }))} style={{ flex: 1, padding: "12px", border: `1px solid ${form.anonymous === opt.val ? PINK_DARK : "#e0d8cc"}`, borderRadius: "8px", background: form.anonymous === opt.val ? PINK_LIGHT : "transparent", color: form.anonymous === opt.val ? DARK : "#a89880", cursor: "pointer", fontSize: "13px", fontFamily: "sans-serif", fontWeight: "600", transition: "all 0.2s" }}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                {!form.anonymous && (
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "11px", letterSpacing: "2px", color: GOLD, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: "8px" }}>Your Name</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="First name or full name" style={{ width: "100%", padding: "12px 16px", border: "1px solid rgba(244,184,200,0.4)", borderRadius: "8px", fontSize: "15px", color: DARK, background: "#fdfcfa", outline: "none", boxSizing: "border-box", fontFamily: "Georgia, serif" }} />
                  </div>
                )}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "11px", letterSpacing: "2px", color: GOLD, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: "8px" }}>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: "100%", padding: "12px 16px", border: "1px solid rgba(244,184,200,0.4)", borderRadius: "8px", fontSize: "14px", color: DARK, background: "#fdfcfa", outline: "none", fontFamily: "sans-serif", cursor: "pointer" }}>
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: "32px" }}>
                  <label style={{ display: "block", fontSize: "11px", letterSpacing: "2px", color: GOLD, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: "8px" }}>Your Prayer Request</label>
                  <textarea value={form.request} onChange={e => setForm(f => ({ ...f, request: e.target.value }))} placeholder="Share what's on your heart..." rows={5} style={{ width: "100%", padding: "14px 16px", border: "1px solid rgba(244,184,200,0.4)", borderRadius: "8px", fontSize: "15px", color: DARK, background: "#fdfcfa", outline: "none", resize: "vertical", lineHeight: "1.7", boxSizing: "border-box", fontFamily: "Georgia, serif", fontStyle: "italic" }} />
                </div>
                <button onClick={handleSubmitPrayer} disabled={!form.request.trim()} style={{ width: "100%", padding: "16px", border: "none", borderRadius: "8px", background: form.request.trim() ? `linear-gradient(135deg, ${PINK}, ${PINK_DARK})` : "#d0c8bc", color: "#fff", fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", fontFamily: "sans-serif", fontWeight: "700", cursor: form.request.trim() ? "pointer" : "default", transition: "all 0.2s" }}>Submit Request</button>
              </div>
            )}
          </div>
        )}
        {tab === "donate" && (
          <div style={{ maxWidth: "560px", margin: "0 auto" }}>
            {donationSubmitted ? (
              <div style={{ textAlign: "center", padding: "60px 40px", background: "#fff", borderRadius: "16px", boxShadow: "0 2px 24px rgba(244,184,200,0.2)" }}>
                <div style={{ fontSize: "48px", marginBottom: "20px" }}>💗</div>
                <h2 style={{ color: DARK, fontWeight: "400", marginBottom: "12px" }}>Thank you for your generosity</h2>
                <p style={{ color: MUTED, fontStyle: "italic" }}>Your gift helps keep this community of prayer alive and supports those in need.</p>
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: "16px", padding: "40px", boxShadow: "0 2px 24px rgba(244,184,200,0.2)", border: "1px solid rgba(244,184,200,0.2)" }}>
                <h2 style={{ color: DARK, fontWeight: "400", marginBottom: "8px", fontSize: "26px" }}>Give to the Ministry</h2>
                <div style={{ width: "32px", height: "2px", background: `linear-gradient(90deg, ${PINK}, ${GOLD})`, marginBottom: "16px" }} />
                <p style={{ color: MUTED, fontStyle: "italic", marginBottom: "8px", fontSize: "15px" }}>Every gift — no matter the size — helps provide for those praying for provision.</p>
                <div style={{ background: PINK_LIGHT, borderRadius: "8px", padding: "12px 16px", marginBottom: "28px", fontSize: "13px", color: PINK_DARK, fontFamily: "sans-serif", border: `1px solid ${PINK}44` }}>💗 100% of donations go directly to community members in need.</div>
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ fontSize: "11px", letterSpacing: "2px", color: GOLD, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: "12px" }}>Select Amount</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                    {DONATION_AMOUNTS.map(amt => (
                      <button key={amt} onClick={() => { setDonationAmount(amt); setCustomAmount(""); }} style={{ padding: "14px", border: `1px solid ${donationAmount === amt && !customAmount ? PINK_DARK : "#e0d8cc"}`, borderRadius: "8px", background: donationAmount === amt && !customAmount ? PINK_LIGHT : "transparent", color: donationAmount === amt && !customAmount ? DARK : MUTED, cursor: "pointer", fontSize: "20px", fontFamily: "Georgia, serif", fontWeight: "600", transition: "all 0.2s" }}>${amt}</button>
                    ))}
                  </div>
                  <input value={customAmount} onChange={e => { setCustomAmount(e.target.value); setDonationAmount(null); }} placeholder="Or enter custom amount" type="number" style={{ width: "100%", padding: "12px 16px", border: "1px solid rgba(244,184,200,0.4)", borderRadius: "8px", fontSize: "15px", color: DARK, background: "#fdfcfa", outline: "none", boxSizing: "border-box", fontFamily: "Georgia, serif" }} />
                </div>
                <div style={{ marginBottom: "32px" }}>
                  <label style={{ display: "block", fontSize: "11px", letterSpacing: "2px", color: GOLD, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: "8px" }}>Leave a Note (Optional)</label>
                  <textarea value={donationNote} onChange={e => setDonationNote(e.target.value)} placeholder="In memory of, in honor of, or a personal message..." rows={3} style={{ width: "100%", padding: "14px 16px", border: "1px solid rgba(244,184,200,0.4)", borderRadius: "8px", fontSize: "15px", color: DARK, background: "#fdfcfa", outline: "none", resize: "none", lineHeight: "1.7", boxSizing: "border-box", fontFamily: "Georgia, serif", fontStyle: "italic" }} />
                </div>
                <div style={{ padding: "16px 20px", background: PINK_LIGHT, borderRadius: "8px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${PINK}44` }}>
                  <span style={{ color: MUTED, fontFamily: "sans-serif", fontSize: "13px", letterSpacing: "1px", textTransform: "uppercase" }}>Your Gift</span>
                  <span style={{ fontSize: "24px", fontWeight: "600", color: DARK }}>${customAmount || donationAmount || "—"}</span>
                </div>
                <button onClick={handleDonate} disabled={!donationAmount && !customAmount} style={{ width: "100%", padding: "16px", border: "none", borderRadius: "8px", background: (donationAmount || customAmount) ? `linear-gradient(135deg, ${PINK}, ${PINK_DARK})` : "#d0c8bc", color: "#fff", fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", fontFamily: "sans-serif", fontWeight: "700", cursor: (donationAmount || customAmount) ? "pointer" : "default", transition: "all 0.2s" }}>Give Now</button>
                <p style={{ textAlign: "center", color: "#c4b89a", fontSize: "12px", marginTop: "16px", fontFamily: "sans-serif" }}>🔒 Secure &amp; encrypted · All gifts are tax-deductible</p>
              </div>
            )}
          </div>
        )}
      </main>
      <footer style={{ textAlign: "center", padding: "24px", color: "#c4b89a", fontSize: "12px", letterSpacing: "1px", fontFamily: "sans-serif", borderTop: "1px solid rgba(244,184,200,0.2)" }}>
        LIFTED BY PRAYER · A MINISTRY OF ASK &amp; SEEK FOUNDATION
      </footer>
    </div>
  );
}
