import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://fdphbzxkqqihigqhpynw.supabase.co",
  "sb_publishable_4Vq6vik7S51luaVJkN3ASg_T8LN7bL6"
);

const CATEGORIES = [
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

export default function App() {
  const [tab, setTab] = useState("wall");
  const [prayers, setPrayers] = useState([]);
  const [donations, setDonations] = useState([]);
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
    const prayerSub = supabase
  .channel("public:prayers")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "prayers" }, () => fetchPrayers())
  .on("postgres_changes", { event: "UPDATE", schema: "public", table: "prayers" }, () => fetchPrayers())
  .on("postgres_changes", { event: "DELETE", schema: "public", table: "prayers" }, () => fetchPrayers())
  .subscribe();

const donationSub = supabase
  .channel("public:donations")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "donations" }, () => fetchDonations())
  .subscribe();
    return () => { subscription.unsubscribe(); supabase.removeChannel(prayerSub); supabase.removeChannel(donationSub); };
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
  };

  const fetchPrayers = async () => {
    setLoading(true);
    const { data } = await supabase.from("prayers").select(`*, profiles(username, full_name, avatar_url), comments(id, content, is_anonymous, created_at, profiles(username, full_name, avatar_url)), reactions(id, reaction_type, user_id)`).order("created_at", { ascending: false });
    setPrayers(data || []);
    setLoading(false);
  };

  const fetchDonations = async () => {
    const { data } = await supabase.from("donations").select(`*, profiles(username, full_name)`).order("created_at", { ascending: false }).limit(20);
    setDonations(data || []);
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
          await supabase.from("profiles").insert({ id: data.user.id, username: authForm.username.toLowerCase().replace(/\s/g, ""), full_name: authForm.full_name });
        }
        showNotif("Account created! Welcome to Lifted by Prayer 🙏");
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
      const res = await fetch("/api/moderate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: prayerForm.content }) });
      const { flagged } = await res.json();
      if (flagged) { showNotif("Your request contains content that goes against our community guidelines.", "error"); setSubmitting(false); return; }
      await supabase.from("prayers").insert({ user_id: user.id, content: prayerForm.content, category: prayerForm.category, is_anonymous: prayerForm.is_anonymous, status: "submitted" });
      setPrayerForm({ content: "", category: "Healing", is_anonymous: false });
      showNotif("Your prayer request has been lifted! 🙏");
      setTab("wall");
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
    const res = await fetch("/api/moderate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: content }) });
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
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;
    await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    fetchProfile(user.id);
    showNotif("Profile photo updated! 🙏");
  };

  const getReactionCount = (prayer, type) => prayer.reactions?.filter(r => r.reaction_type === type).length || 0;
  const hasReacted = (prayer, type) => prayer.reactions?.some(r => r.reaction_type === type && r.user_id === user?.id);
  const getInitials = (name) => name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?";
  const timeAgo = (date) => { const s = Math.floor((new Date() - new Date(date)) / 1000); if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s/60)}m ago`; if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; };

  const Avatar = ({ profile, size = 40 }) => {
    const s = { width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden", border: "2px solid #e8a0be", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4c0d4", color: "#7d2a4a", fontWeight: 700, fontSize: size * 0.3, cursor: "pointer" };
    if (profile?.avatar_url) return <div style={s}><img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>;
    return <div style={s}>{getInitials(profile?.full_name || profile?.username || "?")}</div>;
  };

  const ProfileModal = ({ profileData, onClose }) => {
    const [profilePrayers, setProfilePrayers] = useState([]);
    useEffect(() => {
      if (profileData) supabase.from("prayers").select("*, reactions(id, reaction_type, user_id), comments(id)").eq("user_id", profileData.id).eq("is_anonymous", false).order("created_at", { ascending: false }).then(({ data }) => setProfilePrayers(data || []));
    }, [profileData]);
    if (!profileData) return null;
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
        <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "80vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
          <div style={{ background: "#f0c4d4", height: 80, borderRadius: "16px 16px 0 0" }} />
          <div style={{ padding: "0 20px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: -28, marginBottom: 12 }}>
              <Avatar profile={profileData} size={64} />
              <button onClick={onClose} style={{ background: "none", border: "1.5px solid #c2527e", color: "#c2527e", borderRadius: 20, padding: "6px 16px", cursor: "pointer", fontFamily: "inherit" }}>Close</button>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1a0d14" }}>{profileData.full_name}</div>
            <div style={{ fontSize: 13, color: "#b090a4", marginBottom: 8 }}>@{profileData.username}</div>
            {profileData.bio && <div style={{ fontSize: 13, color: "#7a5068", marginBottom: 12 }}>{profileData.bio}</div>}
            <div style={{ fontSize: 12, color: "#b090a4", marginBottom: 16 }}>{profilePrayers.length} prayers shared</div>
            <div style={{ borderTop: "0.5px solid #f0dce8", paddingTop: 16 }}>
              {profilePrayers.map(p => (
                <div key={p.id} style={{ background: "#faf5f8", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: "#b090a4", marginBottom: 4 }}>{timeAgo(p.created_at)}</div>
                  <div style={{ fontSize: 13, color: "#1a0d14", lineHeight: 1.6 }}>{p.content}</div>
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

  return (
    <div style={{ minHeight: "100vh", background: "#faf5f8", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {notification && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, background: notification.type === "error" ? "#feeaea" : "#eaf5ee", border: `1px solid ${notification.type === "error" ? "#e89090" : "#7dc898"}`, color: notification.type === "error" ? "#7a1010" : "#1a5030", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          {notification.msg}
        </div>
      )}

      {showAuth && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowAuth(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#7d2a4a", marginBottom: 4 }}>{authMode === "login" ? "Welcome back 🙏" : "Join the community 🙏"}</div>
              <div style={{ fontSize: 13, color: "#b090a4" }}>{authMode === "login" ? "Sign in to your account" : "Create your free account"}</div>
            </div>
            <form onSubmit={handleAuth}>
              {authMode === "register" && (
                <>
                  <input value={authForm.full_name} onChange={e => setAuthForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Full name" required style={{ width: "100%", padding: "10px 14px", border: "1px solid #f0dce8", borderRadius: 10, marginBottom: 10, fontSize: 14, fontFamily: "inherit", background: "#faf5f8" }} />
                  <input value={authForm.username} onChange={e => setAuthForm(p => ({ ...p, username: e.target.value }))} placeholder="Username (no spaces)" required style={{ width: "100%", padding: "10px 14px", border: "1px solid #f0dce8", borderRadius: 10, marginBottom: 10, fontSize: 14, fontFamily: "inherit", background: "#faf5f8" }} />
                </>
              )}
              <input type="email" value={authForm.email} onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))} placeholder="Email address" required style={{ width: "100%", padding: "10px 14px", border: "1px solid #f0dce8", borderRadius: 10, marginBottom: 10, fontSize: 14, fontFamily: "inherit", background: "#faf5f8" }} />
              <input type="password" value={authForm.password} onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))} placeholder="Password" required style={{ width: "100%", padding: "10px 14px", border: "1px solid #f0dce8", borderRadius: 10, marginBottom: 16, fontSize: 14, fontFamily: "inherit", background: "#faf5f8" }} />
              <button type="submit" disabled={submitting} style={{ width: "100%", background: "#c2527e", color: "#fff", border: "none", borderRadius: 22, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {submitting ? "Please wait..." : authMode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#b090a4" }}>
              {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
              <span onClick={() => setAuthMode(authMode === "login" ? "register" : "login")} style={{ color: "#c2527e", cursor: "pointer", fontWeight: 600 }}>
                {authMode === "login" ? "Register" : "Sign in"}
              </span>
            </div>
          </div>
        </div>
      )}

      <ProfileModal profileData={showProfile} onClose={() => setShowProfile(null)} />

      {/* Navbar */}
      <div style={{ background: "#fff", borderBottom: "0.5px solid #f0dce8", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#c2527e", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 16 }}>🙏</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#7d2a4a", lineHeight: 1.2 }}>Lifted by Prayer</div>
            <div style={{ fontSize: 10, color: "#b090a4" }}>Ask & Seek Foundation</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user && profile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, background: "#fbeaf2", border: "0.5px solid #e8a0be", borderRadius: 20, padding: "5px 12px", fontSize: 12, color: "#7d2a4a" }}>
                <span>📷</span> Photo
                <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
              </label>
              <Avatar profile={profile} size={32} />
              <span style={{ fontSize: 13, color: "#7d2a4a", fontWeight: 600 }}>@{profile.username}</span>
              <button onClick={handleSignOut} style={{ background: "none", border: "1px solid #f0dce8", color: "#b090a4", borderRadius: 20, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Sign out</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setAuthMode("login"); setShowAuth(true); }} style={{ background: "none", border: "1px solid #c2527e", color: "#c2527e", borderRadius: 20, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Sign in</button>
              <button onClick={() => { setAuthMode("register"); setShowAuth(true); }} style={{ background: "#c2527e", color: "#fff", border: "none", borderRadius: 20, padding: "6px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✦ Register</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "220px 1fr 200px", gap: 0, minHeight: "calc(100vh - 57px)" }}>
        {/* Sidebar */}
        <div style={{ borderRight: "0.5px solid #f0dce8", padding: "20px 12px", background: "#fff", position: "sticky", top: 57, height: "calc(100vh - 57px)" }}>
          {[{ id: "wall", label: "Prayer Wall", icon: "🏠" }, { id: "donate", label: "Donations", icon: "♡" }, { id: "submit", label: "Submit Request", icon: "✦" }].map(item => (
            <div key={item.id} onClick={() => setTab(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, color: tab === item.id ? "#7d2a4a" : "#7a5068", background: tab === item.id ? "#fbeaf2" : "none", fontWeight: tab === item.id ? 700 : 400, cursor: "pointer", marginBottom: 4 }}>
              <span>{item.icon}</span> {item.label}
            </div>
          ))}
          <div style={{ margin: "16px 0", height: "0.5px", background: "#f0dce8" }} />
          {user && (
            <div onClick={() => profile && setShowProfile(profile)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, color: "#7a5068", cursor: "pointer" }}>
              <span>👤</span> My Profile
            </div>
          )}
          <button onClick={() => { setTab("submit"); if (!user) { setShowAuth(true); } }} style={{ width: "100%", background: "#c2527e", color: "#fff", border: "none", borderRadius: 22, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 16, fontFamily: "inherit" }}>
            + Submit Request
          </button>
        </div>

        {/* Main Feed */}
        <div style={{ background: "#faf5f8" }}>
          <div style={{ background: "#fff", borderBottom: "0.5px solid #f0dce8", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1a0d14" }}>
              {tab === "wall" ? "Prayer Wall" : tab === "donate" ? "Donations ♡" : "Submit a Request"}
            </span>
            {tab === "wall" && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, background: "#fbeaf2", border: "0.5px solid #e8a0be", borderRadius: 12, padding: "3px 10px", fontSize: 11, color: "#7d2a4a" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e05070", display: "inline-block" }} /> Live
              </span>
            )}
          </div>

          {tab === "wall" && (
            <div>
              {loading ? (
                <div style={{ textAlign: "center", padding: 40, color: "#b090a4" }}>Loading prayers... 🙏</div>
              ) : prayers.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#b090a4" }}>No prayers yet. Be the first to share. 🙏</div>
              ) : prayers.map(prayer => (
                <div key={prayer.id} style={{ background: "#fff", borderBottom: "0.5px solid #f0dce8", padding: "16px 18px" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                    <div onClick={() => !prayer.is_anonymous && prayer.profiles && setShowProfile(prayer.profiles)}>
                      <Avatar profile={prayer.is_anonymous ? null : prayer.profiles} size={42} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a0d14", cursor: prayer.is_anonymous ? "default" : "pointer" }} onClick={() => !prayer.is_anonymous && prayer.profiles && setShowProfile(prayer.profiles)}>
                        {prayer.is_anonymous ? "Anonymous" : prayer.profiles?.full_name || prayer.profiles?.username || "Community Member"}
                      </div>
                      <div style={{ fontSize: 11, color: "#b090a4" }}>
                        {prayer.is_anonymous ? "Private request" : `@${prayer.profiles?.username || ""}`} · {timeAgo(prayer.created_at)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#fbeaf2", color: "#7d2a4a", borderRadius: 10, padding: "2px 8px", fontSize: 10, fontWeight: 600, marginBottom: 8 }}>
                    {prayer.category}
                  </div>
                  <div style={{ fontSize: 13, color: "#1a0d14", lineHeight: 1.7, marginBottom: 10 }}>{prayer.content}</div>
                  {prayer.status === "prayed" && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#eaf5ee", border: "0.5px solid #7dc898", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "#1a5030", fontWeight: 600, marginBottom: 10 }}>
                      ✓ In God's Hands {prayer.prayed_by && `— prayed for by ${prayer.prayed_by}`}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    {[{ type: "pray", emoji: "🙏" }, { type: "cross", emoji: "✝️" }, { type: "heart", emoji: "❤️" }].map(({ type, emoji }) => (
                      <button key={type} onClick={() => handleReact(prayer.id, type)} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: hasReacted(prayer, type) ? "#fce4ef" : "#fbeaf2", border: `1px solid ${hasReacted(prayer, type) ? "#c2527e" : "#e8a0be"}`, borderRadius: 16, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: hasReacted(prayer, type) ? 700 : 400, fontFamily: "inherit" }}>
                        {emoji} <span style={{ color: "#7d2a4a" }}>{getReactionCount(prayer, type)}</span>
                      </button>
                    ))}
                  </div>
                  {prayer.comments?.length > 0 && (
                    <div style={{ background: "#faf5f8", borderRadius: 8, padding: "8px 12px", marginBottom: 10, borderLeft: "3px solid #e8a0be" }}>
                      {prayer.comments.slice(0, 2).map(c => (
                        <div key={c.id} style={{ fontSize: 12, color: "#7a5068", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: "#1a0d14", cursor: "pointer" }} onClick={() => !c.is_anonymous && c.profiles && setShowProfile(c.profiles)}>
                            {c.is_anonymous ? "Anonymous" : c.profiles?.full_name || c.profiles?.username}
                          </span>
                          {" "}{c.content}
                        </div>
                      ))}
                      {prayer.comments.length > 2 && <div style={{ fontSize: 11, color: "#b090a4" }}>+ {prayer.comments.length - 2} more comments</div>}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                    <input value={commentInputs[prayer.id] || ""} onChange={e => setCommentInputs(p => ({ ...p, [prayer.id]: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleComment(prayer.id)} placeholder={user ? "Add a comment..." : "Sign in to comment..."} style={{ flex: 1, padding: "6px 12px", border: "1px solid #f0dce8", borderRadius: 20, fontSize: 12, fontFamily: "inherit", background: "#faf5f8", outline: "none" }} />
                    <button onClick={() => handleComment(prayer.id)} style={{ background: "#c2527e", color: "#fff", border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Send</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "donate" && (
            <div style={{ padding: 20 }}>
              <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16, border: "0.5px solid #f0dce8", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#7d2a4a", marginBottom: 4 }}>
                  ${donations.reduce((sum, d) => sum + (d.amount / 100), 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 13, color: "#b090a4", marginBottom: 16 }}>Total donations received</div>
                <button style={{ background: "#c2527e", color: "#fff", border: "none", borderRadius: 22, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>♡ Give Now via Stripe</button>
                <div style={{ fontSize: 11, color: "#b090a4", marginTop: 8 }}>Ask & Seek Foundation · 501(c)(3) Nonprofit · EIN 42-2057592</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#b090a4", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Live Donations</div>
              {donations.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#b090a4" }}>No donations yet. Be the first to give! ♡</div>
              ) : donations.map(d => (
                <div key={d.id} style={{ background: "#fff", borderRadius: 10, padding: 14, marginBottom: 10, border: "0.5px solid #f0dce8", display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar profile={d.is_anonymous ? null : d.profiles} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a0d14" }}>{d.is_anonymous ? "Anonymous" : d.profiles?.full_name || "Donor"}</div>
                    {d.message && <div style={{ fontSize: 12, color: "#7a5068", fontStyle: "italic" }}>"{d.message}"</div>}
                    <div style={{ fontSize: 11, color: "#b090a4" }}>{timeAgo(d.created_at)}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#7d2a4a" }}>${(d.amount / 100).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}

          {tab === "submit" && (
            <div style={{ padding: 20 }}>
              <div style={{ background: "#fff", borderRadius: 12, padding: 24, border: "0.5px solid #f0dce8" }}>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#7d2a4a", marginBottom: 4 }}>Share Your Prayer Request 🙏</div>
                  <div style={{ fontSize: 13, color: "#b090a4", fontStyle: "italic" }}>"Cast your burdens upon Him, for He cares for you." — 1 Peter 5:7</div>
                </div>
                {!user && (
                  <div style={{ background: "#fbeaf2", border: "1px solid #e8a0be", borderRadius: 10, padding: 14, marginBottom: 16, textAlign: "center", fontSize: 13, color: "#7d2a4a" }}>
                    <span onClick={() => { setAuthMode("register"); setShowAuth(true); }} style={{ cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>Create an account</span> or <span onClick={() => { setAuthMode("login"); setShowAuth(true); }} style={{ cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>sign in</span> to submit a prayer request.
                  </div>
                )}
                <form onSubmit={handleSubmitPrayer}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, color: "#b090a4", display: "block", marginBottom: 6 }}>Category</label>
                    <select value={prayerForm.category} onChange={e => setPrayerForm(p => ({ ...p, category: e.target.value }))} style={{ width: "100%", padding: "10px 14px", border: "1px solid #f0dce8", borderRadius: 10, fontSize: 14, fontFamily: "inherit", background: "#faf5f8" }}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, color: "#b090a4", display: "block", marginBottom: 6 }}>Your prayer request</label>
                    <textarea value={prayerForm.content} onChange={e => setPrayerForm(p => ({ ...p, content: e.target.value }))} placeholder="Share what's on your heart..." required rows={5} style={{ width: "100%", padding: "10px 14px", border: "1px solid #f0dce8", borderRadius: 10, fontSize: 14, fontFamily: "inherit", background: "#faf5f8", resize: "vertical" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    <input type="checkbox" id="anon" checked={prayerForm.is_anonymous} onChange={e => setPrayerForm(p => ({ ...p, is_anonymous: e.target.checked }))} />
                    <label htmlFor="anon" style={{ fontSize: 13, color: "#7a5068", cursor: "pointer" }}>Post anonymously</label>
                  </div>
                  <button type="submit" disabled={submitting || !user} style={{ width: "100%", background: user ? "#c2527e" : "#e0c0cc", color: "#fff", border: "none", borderRadius: 22, padding: "12px", fontSize: 14, fontWeight: 700, cursor: user ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                    {submitting ? "Submitting..." : "Send My Request 🙏"}
                  </button>
                  <div style={{ textAlign: "center", fontSize: 11, color: "#b090a4", marginTop: 10 }}>✦ AI-reviewed for community safety</div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div style={{ borderLeft: "0.5px solid #f0dce8", padding: "20px 14px", background: "#fff", position: "sticky", top: 57, height: "calc(100vh - 57px)", overflowY: "auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#b090a4", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Trending</div>
          {["Healing", "Provision", "Family", "Strength", "Spiritual Growth"].map((cat, i) => (
            <div key={cat} style={{ padding: "8px 0", borderBottom: "0.5px solid #f0dce8" }}>
              <div style={{ fontSize: 10, color: "#b090a4" }}>Category</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a0d14" }}>#{cat}</div>
              <div style={{ fontSize: 11, color: "#b090a4" }}>{prayers.filter(p => p.category === cat).length} requests</div>
            </div>
          ))}
          <div style={{ marginTop: 16, background: "#fbeaf2", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#7d2a4a", marginBottom: 8 }}>About</div>
            <div style={{ fontSize: 11, color: "#7a5068", lineHeight: 1.6 }}>Lifted by Prayer is a ministry of Ask & Seek Foundation, a 501(c)(3) nonprofit. EIN 42-2057592</div>
          </div>
        </div>
      </div>

      <div style={{ background: "#7d2a4a", color: "#f4c0d4", textAlign: "center", padding: "20px", fontSize: 12 }}>
        LIFTED BY PRAYER · A MINISTRY OF ASK & SEEK FOUNDATION<br />
        <span style={{ fontSize: 10, opacity: 0.7 }}>501(c)(3) Nonprofit · info@askandseekfoundation.org</span>
      </div>
    </div>
  );
}
