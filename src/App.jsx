import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

const CATEGORIES = [
  "All",
  "Healing",
  "Provision",
  "Family",
  "Marriage",
  "Strength",
  "Guidance",
  "Grief & Loss",
  "Gratitude",
  "Spiritual Growth",
  "Other",
];

const extractHashtags = (text) => {
  const matches = text.match(/#[a-zA-Z0-9_]+/g);
  return matches ? [...new Set(matches.map(t => t.toLowerCase()))] : [];
};

const renderContentWithHashtags = (content, onHashtagClick) => {
  const parts = content.split(/(#[a-zA-Z0-9_]+)/g);
  return parts.map((part, i) =>
    part.match(/^#[a-zA-Z0-9_]+$/) ? (
      <span key={i} onClick={() => onHashtagClick(part.toLowerCase())} style={{ color: "#c2527e", cursor: "pointer", fontWeight: 700 }}>{part}</span>
    ) : part
  );
};

export default function App() {
  const [tab, setTab] = useState("wall");
  const [prayers, setPrayers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [activeHashtag, setActiveHashtag] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [showProfile, setShowProfile] = useState(null);
  const [authForm, setAuthForm] = useState({ email: "", password: "", username: "", full_name: "" });
  const [prayerForm, setPrayerForm] = useState({ content: "", category: "Healing", is_anonymous: false });
  const [commentInputs, setCommentInputs] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });
    fetchPrayers();
    fetchDonations();
    fetchHashtags();
    const pollInterval = setInterval(() => {
      fetchPrayers();
      fetchDonations();
      fetchHashtags();
    }, 10000);
    return () => { subscription.unsubscribe(); clearInterval(pollInterval); };
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
  };

  const fetchPrayers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("prayers")
      .select(`*, profiles(username, full_name, avatar_url), comments(id, content, is_anonymous, created_at, profiles(username, full_name, avatar_url)), reactions(id, reaction_type, user_id), hashtags(tag)`)
      .order("created_at", { ascending: false });
    setPrayers(data || []);
    setLoading(false);
  };

  const fetchDonations = async () => {
    const { data } = await supabase
      .from("donations")
      .select(`*, profiles(username, full_name)`)
      .order("created_at", { ascending: false })
      .limit(20);
    setDonations(data || []);
  };

  const fetchHashtags = async () => {
    const { data } = await supabase.from("hashtags").select("tag");
    if (data) {
      const counts = {};
      data.forEach(({ tag }) => { counts[tag] = (counts[tag] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, count]) => ({ tag, count }));
      setHashtags(sorted);
    }
  };

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (authMode === "register") {
        const { data, error } = await supabase.auth.signUp({ email: authForm.email, password: authForm.password });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").insert({
            id: data.user.id,
            username: authForm.username.toLowerCase().replace(/\s/g, ""),
            full_name: authForm.full_name
          });
        }
        showNotif("Account created! Please check your email to confirm. 🙏");
        setShowAuth(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password });
        if (error) throw error;
        showNotif("Welcome back! 🙏");
        setShowAuth(false);
      }
    } catch (err) {
      showNotif(err.message, "error");
    }
    setSubmitting(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    showNotif("Signed out. God bless you! 🙏");
  };

  const handleSubmitPrayer = async (e) => {
    e.preventDefault();
    if (!user) { setShowAuth(true); return; }
    if (!prayerForm.content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: prayerForm.content })
      });
      const { flagged } = await res.json();
      if (flagged) { showNotif("Your request contains content that goes against our community guidelines.", "error"); setSubmitting(false); return; }
      const { data: newPrayer, error } = await supabase.from("prayers").insert({
        user_id: user.id,
        content: prayerForm.content,
        category: prayerForm.category,
        is_anonymous: prayerForm.is_anonymous,
        status: "submitted"
      }).select().single();
      if (error) throw error;
      const tags = extractHashtags(prayerForm.content);
      if (tags.length > 0 && newPrayer) {
        await supabase.from("hashtags").insert(tags.map(tag => ({ prayer_id: newPrayer.id, tag })));
      }
      setPrayerForm({ content: "", category: "Healing", is_anonymous: false });
      showNotif("Your prayer request has been lifted! 🙏");
      setTab("wall");
      fetchPrayers();
      fetchHashtags();
    } catch {
      showNotif("Something went wrong. Please try again.", "error");
    }
    setSubmitting(false);
  };

  const handleReact = async (prayerId, reactionType) => {
    if (!user) { setShowAuth(true); return; }
    const prayer = prayers.find(p => p.id === prayerId);
    const existing = prayer?.reactions?.find(r => r.user_id === user.id && r.reaction_type === reactionType);
    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("reactions").insert({ prayer_id: prayerId, user_id: user.id, reaction_type: reactionType });
    }
    fetchPrayers();
  };

  const handleComment = async (prayerId) => {
    if (!user) { setShowAuth(true); return; }
    const content = commentInputs[prayerId]?.trim();
    if (!content) return;
    const res = await fetch("/api/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: content })
    });
    const { flagged } = await res.json();
    if (flagged) { showNotif("Your comment goes against our community guidelines.", "error"); return; }
    await supabase.from("comments").insert({ prayer_id: prayerId, user_id: user.id, content, is_anonymous: false });
    setCommentInputs(prev => ({ ...prev, [prayerId]: "" }));
    fetchPrayers();
  };

  const handleAvatarUpload = async (e) => {
    if (!user) return;
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    const path = `${user.id}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { showNotif("Failed to upload photo. Please try again.", "error"); return; }
    const avatarUrl = `https://fdphbzxkqqihigqhpynw.supabase.co/storage/v1/object/public/avatars/${path}`;
    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
    fetchProfile(user.id);
    showNotif("Profile photo updated! 🙏");
  };

  const handleHashtagClick = (tag) => {
    setActiveHashtag(activeHashtag === tag ? null : tag);
    setActiveCategory("All");
    setTab("wall");
  };

  const getReactionCount = (prayer, type) => prayer.reactions?.filter(r => r.reaction_type === type).length || 0;
  const hasReacted = (prayer, type) => prayer.reactions?.some(r => r.reaction_type === type && r.user_id === user?.id);
  const getInitials = (name) => name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?";
  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const filteredPrayers = prayers.filter(p => {
    if (activeHashtag) return p.hashtags?.some(h => h.tag === activeHashtag);
    if (activeCategory !== "All") return p.category === activeCategory;
    return true;
  });

  const Avatar = ({ profile, size = 38 }) => {
    const s = { width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden", border: "1.5px solid #e8c8d4", display: "flex", alignItems: "center", justifyContent: "center", background: "#fbeaf2", color: "#7d2a4a", fontWeight: 700, fontSize: size * 0.3, cursor: "pointer", fontFamily: "Georgia, serif" };
    if (profile?.avatar_url) return <div style={s}><img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>;
    return <div style={s}>{getInitials(profile?.full_name || profile?.username || "?")}</div>;
  };

  const ProfileModal = ({ profileData, onClose }) => {
    const [profilePrayers, setProfilePrayers] = useState([]);
    useEffect(() => {
      if (profileData) {
        supabase.from("prayers").select("*, reactions(id, reaction_type, user_id), comments(id), hashtags(tag)").eq("user_id", profileData.id).eq("is_anonymous", false).order("created_at", { ascending: false }).then(({ data }) => setProfilePrayers(data || []));
      }
    }, [profileData]);
    if (!profileData) return null;
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(61,26,36,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
        <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "80vh", overflow: "auto", fontFamily: "Georgia, serif" }} onClick={e => e.stopPropagation()}>
          <div style={{ background: "#f0c4d4", height: 72, borderRadius: "16px 16px 0 0" }} />
          <div style={{ padding: "0 24px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: -28, marginBottom: 14 }}>
              <Avatar profile={profileData} size={60} />
              <button onClick={onClose} style={{ background: "none", border: "1px solid #c2527e", color: "#c2527e", borderRadius: 20, padding: "6px 16px", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 12 }}>Close</button>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#3d1a24" }}>{profileData.full_name}</div>
            <div style={{ fontSize: 12, color: "#b090a4", marginBottom: 8 }}>@{profileData.username}</div>
            {profileData.bio && <div style={{ fontSize: 13, color: "#7a5068", marginBottom: 12, fontStyle: "italic" }}>{profileData.bio}</div>}
            <div style={{ fontSize: 11, color: "#b090a4", marginBottom: 16 }}>{profilePrayers.length} prayers shared</div>
            <div style={{ borderTop: "0.5px solid #f0dce8", paddingTop: 16 }}>
              {profilePrayers.map(p => (
                <div key={p.id} style={{ background: "#fdf8f5", borderRadius: 10, padding: 12, marginBottom: 10, border: "0.5px solid #f0dce8" }}>
                  <div style={{ fontSize: 11, color: "#b090a4", marginBottom: 4 }}>{timeAgo(p.created_at)}</div>
                  <div style={{ fontSize: 13, color: "#3d1a24", lineHeight: 1.7 }}>{renderContentWithHashtags(p.content, (tag) => { onClose(); handleHashtagClick(tag); })}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: "#7a5068" }}>🙏 {getReactionCount(p, "pray")}</span>
                    <span style={{ fontSize: 12, color: "#7a5068" }}>✝️ {getReactionCount(p, "cross")}</span>
                    <span style={{ fontSize: 12, color: "#7a5068" }}>❤️ {getReactionCount(p, "heart")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const s = { page: { minHeight: "100vh", background: "#fdf8f5", fontFamily: "Georgia, serif" }, notif: (type) => ({ position: "fixed", top: 16, right: 16, zIndex: 9999, background: type === "error" ? "#feeaea" : "#eaf5ee", border: `1px solid ${type === "error" ? "#e89090" : "#7dc898"}`, color: type === "error" ? "#7a1010" : "#1a5030", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "Georgia, serif" }) };

  return (
    <div style={s.page}>
      {notification && <div style={s.notif(notification.type)}>{notification.msg}</div>}

      {showAuth && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(61,26,36,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowAuth(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 400, fontFamily: "Georgia, serif" }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "#c2527e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>✦ LIFTED BY PRAYER ✦</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#3d1a24", marginBottom: 4 }}>{authMode === "login" ? "Welcome back" : "Join the community"}</div>
              <div style={{ fontSize: 13, color: "#b090a4", fontStyle: "italic" }}>{authMode === "login" ? "Sign in to your account" : "Create your free account"}</div>
            </div>
            <form onSubmit={handleAuth}>
              {authMode === "register" && (
                <>
                  <input value={authForm.full_name} onChange={e => setAuthForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Full name" required style={{ width: "100%", padding: "10px 14px", border: "1px solid #e8c8d4", borderRadius: 10, marginBottom: 10, fontSize: 13, fontFamily: "Georgia, serif", background: "#fdf8f5", boxSizing: "border-box", color: "#3d1a24" }} />
                  <input value={authForm.username} onChange={e => setAuthForm(p => ({ ...p, username: e.target.value }))} placeholder="Username (no spaces)" required style={{ width: "100%", padding: "10px 14px", border: "1px solid #e8c8d4", borderRadius: 10, marginBottom: 10, fontSize: 13, fontFamily: "Georgia, serif", background: "#fdf8f5", boxSizing: "border-box", color: "#3d1a24" }} />
                </>
              )}
              <input type="email" value={authForm.email} onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))} placeholder="Email address" required style={{ width: "100%", padding: "10px 14px", border: "1px solid #e8c8d4", borderRadius: 10, marginBottom: 10, fontSize: 13, fontFamily: "Georgia, serif", background: "#fdf8f5", boxSizing: "border-box", color: "#3d1a24" }} />
              <input type="password" value={authForm.password} onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))} placeholder="Password" required style={{ width: "100%", padding: "10px 14px", border: "1px solid #e8c8d4", borderRadius: 10, marginBottom: 16, fontSize: 13, fontFamily: "Georgia, serif", background: "#fdf8f5", boxSizing: "border-box", color: "#3d1a24" }} />
              <button type="submit" disabled={submitting} style={{ width: "100%", background: "#c2527e", color: "#fff", border: "none", borderRadius: 22, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                {submitting ? "Please wait..." : authMode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#b090a4" }}>
              {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
              <span onClick={() => setAuthMode(authMode === "login" ? "register" : "login")} style={{ color: "#c2527e", cursor: "pointer", fontWeight: 700 }}>
                {authMode === "login" ? "Register" : "Sign in"}
              </span>
            </div>
          </div>
        </div>
      )}

      <ProfileModal profileData={showProfile} onClose={() => setShowProfile(null)} />

      {/* Top Bar */}
      <div style={{ background: "#fff", borderBottom: "0.5px solid #f0dce8", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 10, color: "#b090a4", letterSpacing: "1.5px", textTransform: "uppercase" }}>✦ A Ministry of Ask & Seek Foundation</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user && profile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 5, background: "#fbeaf2", border: "0.5px solid #e8c8d4", borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "#7d2a4a", fontFamily: "Georgia, serif" }}>
                📷 Photo
                <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
              </label>
              <div onClick={() => setShowProfile(profile)} style={{ cursor: "pointer" }}><Avatar profile={profile} size={28} /></div>
              <span style={{ fontSize: 12, color: "#7d2a4a", fontStyle: "italic" }}>@{profile.username}</span>
              <button onClick={handleSignOut} style={{ background: "none", border: "1px solid #e8c8d4", color: "#b090a4", borderRadius: 20, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" }}>Sign out</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setAuthMode("login"); setShowAuth(true); }} style={{ background: "none", border: "1px solid #c2527e", color: "#c2527e", borderRadius: 20, padding: "5px 14px", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>Sign in</button>
              <button onClick={() => { setAuthMode("register"); setShowAuth(true); }} style={{ background: "#c2527e", color: "#fff", border: "none", borderRadius: 20, padding: "5px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif" }}>Register</button>
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "36px 24px 28px", background: "#fff", borderBottom: "0.5px solid #f0dce8" }}>
        <div style={{ fontSize: 10, color: "#c2527e", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>✦ A Ministry of Ask & Seek Foundation ✦</div>
        <div style={{ fontSize: 38, color: "#3d1a24", fontWeight: 700, marginBottom: 10, lineHeight: 1.2 }}>Lifted by Prayer</div>
        <div style={{ fontSize: 14, color: "#9e6a7e", fontStyle: "italic", marginBottom: 24 }}>"Ask, and it shall be given you; seek, and ye shall find." — Matthew 7:7</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {[{ id: "wall", label: "Prayer Wall" }, { id: "donate", label: "Donations" }, { id: "submit", label: "Submit Request" }].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setActiveHashtag(null); }} style={{ background: tab === t.id ? "#c2527e" : "#fff", color: tab === t.id ? "#fff" : "#9e6a7e", border: `1px solid ${tab === t.id ? "#c2527e" : "#e8c8d4"}`, borderRadius: 22, padding: "7px 20px", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 0 40px" }}>

        {tab === "wall" && (
          <>
            {/* Category filters */}
            <div style={{ padding: "14px 20px", background: "#fdf8f5", borderBottom: "0.5px solid #f0dce8", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => { setActiveCategory(cat); setActiveHashtag(null); }} style={{ background: activeCategory === cat && !activeHashtag ? "#fbeaf2" : "#fff", border: `1px solid ${activeCategory === cat && !activeHashtag ? "#c2527e" : "#e8c8d4"}`, color: activeCategory === cat && !activeHashtag ? "#7d2a4a" : "#9e6a7e", borderRadius: 20, padding: "4px 14px", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Wall header */}
            <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderBottom: "0.5px solid #f0dce8" }}>
              <div>
                <div style={{ fontSize: 16, color: "#3d1a24", fontWeight: 700 }}>
                  {activeHashtag ? activeHashtag : "Community Prayer Wall"}
                </div>
                <div style={{ fontSize: 12, color: "#b090a4" }}>
                  {filteredPrayers.length} {filteredPrayers.length === 1 ? "prayer" : "prayers"} lifted up
                  {activeHashtag && <span onClick={() => setActiveHashtag(null)} style={{ marginLeft: 8, color: "#c2527e", cursor: "pointer" }}>✕ clear</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#c2527e" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e05070", display: "inline-block" }} /> Live
              </div>
            </div>

            {/* Prayer cards */}
            {loading ? (
              <div style={{ textAlign: "center", padding: 48, color: "#b090a4", fontStyle: "italic" }}>Loading prayers... 🙏</div>
            ) : filteredPrayers.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "#b090a4", fontStyle: "italic" }}>
                {activeHashtag ? `No prayers found with ${activeHashtag}` : "No prayers yet. Be the first to share. 🙏"}
              </div>
            ) : filteredPrayers.map(prayer => (
              <div key={prayer.id} style={{ background: "#fff", borderBottom: "0.5px solid #f0e8f0", padding: "18px 20px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <div onClick={() => !prayer.is_anonymous && prayer.profiles && setShowProfile(prayer.profiles)}>
                    <Avatar profile={prayer.is_anonymous ? null : prayer.profiles} size={38} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#3d1a24", cursor: prayer.is_anonymous ? "default" : "pointer" }} onClick={() => !prayer.is_anonymous && prayer.profiles && setShowProfile(prayer.profiles)}>
                      {prayer.is_anonymous ? "Anonymous" : prayer.profiles?.full_name || prayer.profiles?.username || "Community Member"}
                    </div>
                    <div style={{ fontSize: 11, color: "#b090a4" }}>
                      {prayer.is_anonymous ? "Private request" : `@${prayer.profiles?.username || ""}`} · {timeAgo(prayer.created_at)}
                    </div>
                  </div>
                  <span style={{ background: "#fbeaf2", color: "#7d2a4a", borderRadius: 10, padding: "2px 10px", fontSize: 10, fontWeight: 700, fontFamily: "-apple-system, sans-serif" }}>{prayer.category}</span>
                </div>
                <div style={{ fontSize: 14, color: "#3d1a24", lineHeight: 1.8, marginBottom: 12 }}>
                  {renderContentWithHashtags(prayer.content, handleHashtagClick)}
                </div>
                {prayer.status === "prayed" && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#eaf5ee", border: "0.5px solid #7dc898", borderRadius: 8, padding: "4px 12px", fontSize: 11, color: "#1a5030", fontWeight: 700, marginBottom: 12, fontFamily: "-apple-system, sans-serif" }}>
                    ✓ In God's Hands {prayer.prayed_by && `— prayed for by ${prayer.prayed_by}`}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {[{ type: "pray", emoji: "🙏" }, { type: "cross", emoji: "✝️" }, { type: "heart", emoji: "❤️" }].map(({ type, emoji }) => (
                    <button key={type} onClick={() => handleReact(prayer.id, type)} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: hasReacted(prayer, type) ? "#fbeaf2" : "#fdf8f5", border: `1px solid ${hasReacted(prayer, type) ? "#c2527e" : "#e8c8d4"}`, borderRadius: 20, padding: "4px 12px", fontSize: 13, cursor: "pointer", fontWeight: hasReacted(prayer, type) ? 700 : 400, fontFamily: "Georgia, serif", color: "#7d2a4a" }}>
                      {emoji} {getReactionCount(prayer, type)}
                    </button>
                  ))}
                </div>
                {prayer.comments?.length > 0 && (
                  <div style={{ background: "#fdf8f5", borderRadius: 8, padding: "10px 14px", marginBottom: 10, borderLeft: "2px solid #e8c8d4" }}>
                    {prayer.comments.slice(0, 2).map(c => (
                      <div key={c.id} style={{ fontSize: 12, color: "#7a5068", marginBottom: 4, lineHeight: 1.6 }}>
                        <span style={{ fontWeight: 700, color: "#3d1a24", cursor: "pointer" }} onClick={() => !c.is_anonymous && c.profiles && setShowProfile(c.profiles)}>
                          {c.is_anonymous ? "Anonymous" : c.profiles?.full_name || c.profiles?.username}
                        </span>
                        {" — "}{c.content}
                      </div>
                    ))}
                    {prayer.comments.length > 2 && <div style={{ fontSize: 11, color: "#b090a4", fontStyle: "italic" }}>+ {prayer.comments.length - 2} more comments</div>}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={commentInputs[prayer.id] || ""} onChange={e => setCommentInputs(p => ({ ...p, [prayer.id]: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleComment(prayer.id)} placeholder={user ? "Add a comment..." : "Sign in to comment..."} style={{ flex: 1, padding: "7px 14px", border: "1px solid #e8c8d4", borderRadius: 20, fontSize: 12, fontFamily: "Georgia, serif", background: "#fdf8f5", outline: "none", color: "#3d1a24" }} />
                  <button onClick={() => handleComment(prayer.id)} style={{ background: "#c2527e", color: "#fff", border: "none", borderRadius: 20, padding: "7px 16px", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>Send</button>
                </div>
              </div>
            ))}

            {/* Submit button */}
            <div style={{ padding: "20px" }}>
              <button onClick={() => { setTab("submit"); if (!user) setShowAuth(true); }} style={{ width: "100%", background: "#c2527e", color: "#fff", border: "none", borderRadius: 22, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                + Submit Your Prayer Request 🙏
              </button>
            </div>

            {/* Trending hashtags */}
            {hashtags.length > 0 && (
              <div style={{ padding: "16px 20px", background: "#fff", borderTop: "0.5px solid #f0dce8", borderBottom: "0.5px solid #f0dce8" }}>
                <div style={{ fontSize: 10, color: "#b090a4", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12, fontFamily: "-apple-system, sans-serif" }}>Trending Prayers</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {hashtags.map(({ tag, count }) => (
                    <button key={tag} onClick={() => handleHashtagClick(tag)} style={{ background: activeHashtag === tag ? "#fbeaf2" : "#fff", border: `1px solid ${activeHashtag === tag ? "#c2527e" : "#e8c8d4"}`, color: activeHashtag === tag ? "#7d2a4a" : "#9e6a7e", borderRadius: 20, padding: "4px 14px", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                      {tag} <span style={{ color: "#b090a4", fontSize: 11 }}>({count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === "donate" && (
          <div style={{ padding: 24 }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: 28, border: "0.5px solid #f0dce8", textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#c2527e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Give with a generous heart</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#3d1a24", marginBottom: 4 }}>
                ${donations.reduce((sum, d) => sum + (d.amount / 100), 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 13, color: "#b090a4", fontStyle: "italic", marginBottom: 20 }}>Total donations received</div>
              <button style={{ background: "#c2527e", color: "#fff", border: "none", borderRadius: 22, padding: "12px 36px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif" }}>♡ Give Now via Stripe</button>
              <div style={{ fontSize: 11, color: "#b090a4", marginTop: 12 }}>Ask & Seek Foundation · 501(c)(3) Nonprofit · EIN 42-2057592</div>
            </div>
            <div style={{ fontSize: 10, color: "#b090a4", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 14, fontFamily: "-apple-system, sans-serif" }}>Live Donations</div>
            {donations.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#b090a4", fontStyle: "italic" }}>No donations yet. Be the first to give! ♡</div>
            ) : donations.map(d => (
              <div key={d.id} style={{ background: "#fff", borderRadius: 10, padding: 16, marginBottom: 10, border: "0.5px solid #f0dce8", display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar profile={d.is_anonymous ? null : d.profiles} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#3d1a24" }}>{d.is_anonymous ? "Anonymous" : d.profiles?.full_name || "Donor"}</div>
                  {d.message && <div style={{ fontSize: 12, color: "#7a5068", fontStyle: "italic" }}>"{d.message}"</div>}
                  <div style={{ fontSize: 11, color: "#b090a4" }}>{timeAgo(d.created_at)}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#3d1a24" }}>${(d.amount / 100).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "submit" && (
          <div style={{ padding: 24 }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: 28, border: "0.5px solid #f0dce8" }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: "#c2527e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>✦ Share Your Heart ✦</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#3d1a24", marginBottom: 6 }}>Submit a Prayer Request</div>
                <div style={{ fontSize: 13, color: "#9e6a7e", fontStyle: "italic" }}>"Cast your burdens upon Him, for He cares for you." — 1 Peter 5:7</div>
              </div>
              {!user && (
                <div style={{ background: "#fbeaf2", border: "1px solid #e8c8d4", borderRadius: 10, padding: 14, marginBottom: 20, textAlign: "center", fontSize: 13, color: "#7d2a4a" }}>
                  <span onClick={() => { setAuthMode("register"); setShowAuth(true); }} style={{ cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>Create an account</span> or <span onClick={() => { setAuthMode("login"); setShowAuth(true); }} style={{ cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>sign in</span> to submit a prayer request.
                </div>
              )}
              <form onSubmit={handleSubmitPrayer}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: "#b090a4", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Category</label>
                  <select value={prayerForm.category} onChange={e => setPrayerForm(p => ({ ...p, category: e.target.value }))} style={{ width: "100%", padding: "10px 14px", border: "1px solid #e8c8d4", borderRadius: 10, fontSize: 13, fontFamily: "Georgia, serif", background: "#fdf8f5", color: "#3d1a24" }}>
                    {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: "#b090a4", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Your Prayer Request</label>
                  <textarea value={prayerForm.content} onChange={e => setPrayerForm(p => ({ ...p, content: e.target.value }))} placeholder="Share what's on your heart... Use #hashtags to join trending topics!" required rows={5} style={{ width: "100%", padding: "12px 14px", border: "1px solid #e8c8d4", borderRadius: 10, fontSize: 13, fontFamily: "Georgia, serif", background: "#fdf8f5", resize: "vertical", color: "#3d1a24", lineHeight: 1.7 }} />
                  <div style={{ fontSize: 11, color: "#b090a4", marginTop: 4, fontStyle: "italic" }}>Tip: Use #healing #provision #family to join trending topics</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <input type="checkbox" id="anon" checked={prayerForm.is_anonymous} onChange={e => setPrayerForm(p => ({ ...p, is_anonymous: e.target.checked }))} />
                  <label htmlFor="anon" style={{ fontSize: 13, color: "#7a5068", cursor: "pointer", fontStyle: "italic" }}>Post anonymously</label>
                </div>
                <button type="submit" disabled={submitting || !user} style={{ width: "100%", background: user ? "#c2527e" : "#d4a0b4", color: "#fff", border: "none", borderRadius: 22, padding: "13px", fontSize: 14, fontWeight: 700, cursor: user ? "pointer" : "not-allowed", fontFamily: "Georgia, serif" }}>
                  {submitting ? "Lifting your prayer..." : "Send My Request 🙏"}
                </button>
                <div style={{ textAlign: "center", fontSize: 11, color: "#b090a4", marginTop: 10, fontStyle: "italic" }}>✦ AI-reviewed for community safety</div>
              </form>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: "#3d1a24", color: "#f4c0d4", textAlign: "center", padding: "24px", fontSize: 11, letterSpacing: "0.5px", fontFamily: "Georgia, serif" }}>
        LIFTED BY PRAYER · A MINISTRY OF ASK & SEEK FOUNDATION<br />
        <span style={{ fontSize: 10, opacity: 0.6 }}>501(c)(3) Nonprofit · EIN 42-2057592 · info@askandseekfoundation.org</span>
      </div>
    </div>
  );
}
