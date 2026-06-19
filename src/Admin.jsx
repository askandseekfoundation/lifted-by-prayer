import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default function Admin() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [prayers, setPrayers] = useState([]);
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [tab, setTab] = useState("queue");
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (profile?.is_admin) {
      fetchPrayers();
      fetchUsers();
      fetchDonations();
    }
  }, [profile]);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
    setLoading(false);
  };

  const fetchPrayers = async () => {
    const { data } = await supabase
      .from("prayers")
      .select("*, profiles(username, full_name, avatar_url), reactions(id), comments(id)")
      .order("created_at", { ascending: false });
    setPrayers(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data || []);
  };

  const fetchDonations = async () => {
    const { data } = await supabase
      .from("donations")
      .select("*, profiles(username, full_name)")
      .order("created_at", { ascending: false });
    setDonations(data || []);
  };

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email: authForm.email,
      password: authForm.password
    });
    if (error) showNotif(error.message, "error");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const handleMarkPrayed = async (prayer) => {
    const { error } = await supabase
      .from("prayers")
      .update({
        status: "prayed",
        prayed_by: profile.full_name || profile.username,
        prayed_at: new Date().toISOString()
      })
      .eq("id", prayer.id);
    if (error) { showNotif("Failed to update prayer.", "error"); return; }
    await supabase.from("admin_logs").insert({
      prayer_id: prayer.id,
      admin_id: profile.id,
      action: "marked_prayed"
    });
    showNotif("Prayer stamped as In God's Hands 🙏");
    fetchPrayers();
  };

  const handleDeletePrayer = async (prayerId) => {
    if (!window.confirm("Are you sure you want to delete this prayer request?")) return;
    await supabase.from("prayers").delete().eq("id", prayerId);
    showNotif("Prayer request deleted.");
    fetchPrayers();
  };

  const handleToggleAdmin = async (userId, currentStatus) => {
    await supabase.from("profiles").update({ is_admin: !currentStatus }).eq("id", userId);
    showNotif(`User ${currentStatus ? "removed from" : "promoted to"} admin.`);
    fetchUsers();
  };

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const pendingPrayers = prayers.filter(p => p.status === "submitted");
  const prayedPrayers = prayers.filter(p => p.status === "prayed");
  const totalDonations = donations.reduce((sum, d) => sum + (d.amount / 100), 0);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf5f8", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ color: "#b090a4", fontSize: 14 }}>Loading... 🙏</div>
    </div>
  );

  if (!user || !profile) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf5f8", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 400, border: "0.5px solid #f0dce8" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#c2527e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 24 }}>🙏</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#7d2a4a" }}>Admin Panel</div>
          <div style={{ fontSize: 13, color: "#b090a4" }}>Lifted by Prayer · Ask & Seek Foundation</div>
        </div>
        <form onSubmit={handleLogin}>
          <input type="email" value={authForm.email} onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))} placeholder="Admin email" required style={{ width: "100%", padding: "10px 14px", border: "1px solid #f0dce8", borderRadius: 10, marginBottom: 10, fontSize: 14, fontFamily: "inherit", background: "#faf5f8", boxSizing: "border-box" }} />
          <input type="password" value={authForm.password} onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))} placeholder="Password" required style={{ width: "100%", padding: "10px 14px", border: "1px solid #f0dce8", borderRadius: 10, marginBottom: 16, fontSize: 14, fontFamily: "inherit", background: "#faf5f8", boxSizing: "border-box" }} />
          <button type="submit" style={{ width: "100%", background: "#c2527e", color: "#fff", border: "none", borderRadius: 22, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Sign In</button>
        </form>
      </div>
    </div>
  );

  if (!profile.is_admin) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf5f8", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#7d2a4a", marginBottom: 8 }}>Access Denied</div>
        <div style={{ fontSize: 14, color: "#b090a4", marginBottom: 16 }}>This account does not have admin privileges.</div>
        <button onClick={handleSignOut} style={{ background: "#c2527e", color: "#fff", border: "none", borderRadius: 22, padding: "10px 24px", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Sign Out</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#faf5f8", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {notification && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, background: notification.type === "error" ? "#feeaea" : "#eaf5ee", border: `1px solid ${notification.type === "error" ? "#e89090" : "#7dc898"}`, color: notification.type === "error" ? "#7a1010" : "#1a5030", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600 }}>
          {notification.msg}
        </div>
      )}

      {/* Top Bar */}
      <div style={{ background: "#7d2a4a", color: "#fff", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🙏</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Lifted by Prayer</div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>Admin Panel</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>@{profile.username}</span>
          <button onClick={handleSignOut} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 20, padding: "5px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Sign Out</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", minHeight: "calc(100vh - 49px)" }}>
        {/* Sidebar */}
        <div style={{ background: "#fff", borderRight: "0.5px solid #f0dce8", padding: "16px 12px" }}>
          {[
            { id: "queue", label: "Prayer Queue", icon: "📥", count: pendingPrayers.length },
            { id: "approved", label: "Prayed For", icon: "✅", count: prayedPrayers.length },
            { id: "all", label: "All Prayers", icon: "🙏", count: prayers.length },
            { id: "users", label: "Users", icon: "👥", count: users.length },
            { id: "donations", label: "Donations", icon: "♡", count: donations.length },
          ].map(item => (
            <div key={item.id} onClick={() => setTab(item.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", borderRadius: 8, fontSize: 13, color: tab === item.id ? "#7d2a4a" : "#7a5068", background: tab === item.id ? "#fbeaf2" : "none", fontWeight: tab === item.id ? 700 : 400, cursor: "pointer", marginBottom: 2 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span>{item.icon}</span>{item.label}</span>
              {item.count > 0 && <span style={{ background: tab === item.id ? "#c2527e" : "#f0dce8", color: tab === item.id ? "#fff" : "#b090a4", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>{item.count}</span>}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div style={{ padding: 24 }}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Awaiting Prayer", value: pendingPrayers.length, color: "#c2527e" },
              { label: "Prayed For", value: prayedPrayers.length, color: "#1a5030" },
              { label: "Total Requests", value: prayers.length, color: "#7d2a4a" },
              { label: "Total Donations", value: `$${totalDonations.toFixed(2)}`, color: "#1a4070" },
            ].map(stat => (
              <div key={stat.label} style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: "0.5px solid #f0dce8" }}>
                <div style={{ fontSize: 10, color: "#b090a4", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Prayer Queue */}
          {(tab === "queue" || tab === "approved" || tab === "all") && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a0d14", marginBottom: 14 }}>
                {tab === "queue" ? "Prayer Queue — Needs Attention" : tab === "approved" ? "Prayed For" : "All Prayer Requests"}
              </div>
              {(tab === "queue" ? pendingPrayers : tab === "approved" ? prayedPrayers : prayers).length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#b090a4", background: "#fff", borderRadius: 12, border: "0.5px solid #f0dce8" }}>
                  {tab === "queue" ? "No pending prayers — all caught up! 🙏" : "No prayers here yet."}
                </div>
              ) : (
                <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #f0dce8", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#faf5f8" }}>
                        {["From", "Request", "Category", "Status", "Actions"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, color: "#b090a4", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", borderBottom: "0.5px solid #f0dce8" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(tab === "queue" ? pendingPrayers : tab === "approved" ? prayedPrayers : prayers).map(prayer => (
                        <tr key={prayer.id} style={{ borderBottom: "0.5px solid #f0dce8" }}>
                          <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#1a0d14" }}>{prayer.is_anonymous ? "Anonymous" : prayer.profiles?.full_name || prayer.profiles?.username || "Unknown"}</div>
                            <div style={{ fontSize: 11, color: "#b090a4" }}>{timeAgo(prayer.created_at)}</div>
                          </td>
                          <td style={{ padding: "12px 14px", verticalAlign: "top", maxWidth: 280 }}>
                            <div style={{ fontSize: 12, color: "#1a0d14", lineHeight: 1.5 }}>{prayer.content.length > 120 ? prayer.content.slice(0, 120) + "..." : prayer.content}</div>
                            <div style={{ fontSize: 11, color: "#b090a4", marginTop: 4 }}>🙏 {prayer.reactions?.length || 0} reactions · 💬 {prayer.comments?.length || 0} comments</div>
                          </td>
                          <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                            <span style={{ background: "#fbeaf2", color: "#7d2a4a", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>{prayer.category}</span>
                          </td>
                          <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                            {prayer.status === "prayed" ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#eaf5ee", border: "0.5px solid #7dc898", color: "#1a5030", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>✓ In God's Hands</span>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fef9e8", border: "0.5px solid #e8c840", color: "#7a6010", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>⏳ Submitted</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {prayer.status !== "prayed" && (
                                <button onClick={() => handleMarkPrayed(prayer)} style={{ background: "#7d2a4a", color: "#fff", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>🙏 Mark Prayed</button>
                              )}
                              <button onClick={() => handleDeletePrayer(prayer.id)} style={{ background: "#feeaea", color: "#7a1010", border: "0.5px solid #e89090", borderRadius: 8, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Users */}
          {tab === "users" && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a0d14", marginBottom: 14 }}>User Management</div>
              <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #f0dce8", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#faf5f8" }}>
                      {["User", "Username", "Joined", "Role", "Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, color: "#b090a4", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", borderBottom: "0.5px solid #f0dce8" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: "0.5px solid #f0dce8" }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f4c0d4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#7d2a4a", overflow: "hidden", flexShrink: 0 }}>
                              {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (u.full_name || u.username || "?")[0].toUpperCase()}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a0d14" }}>{u.full_name || "No name"}</div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: "#7a5068" }}>@{u.username}</td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: "#b090a4" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: "12px 14px" }}>
                          {u.is_admin ? (
                            <span style={{ background: "#fbeaf2", color: "#7d2a4a", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>Admin</span>
                          ) : (
                            <span style={{ background: "#f0f0f0", color: "#7a7a7a", borderRadius: 8, padding: "3px 8px", fontSize: 11 }}>Member</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          {u.id !== profile.id && (
                            <button onClick={() => handleToggleAdmin(u.id, u.is_admin)} style={{ background: u.is_admin ? "#feeaea" : "#eaf5ee", color: u.is_admin ? "#7a1010" : "#1a5030", border: `0.5px solid ${u.is_admin ? "#e89090" : "#7dc898"}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                              {u.is_admin ? "Remove Admin" : "Make Admin"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Donations */}
          {tab === "donations" && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a0d14", marginBottom: 14 }}>Donations Overview</div>
              {donations.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#b090a4", background: "#fff", borderRadius: 12, border: "0.5px solid #f0dce8" }}>No donations yet.</div>
              ) : (
                <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #f0dce8", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#faf5f8" }}>
                        {["Donor", "Amount", "Message", "Date"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, color: "#b090a4", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", borderBottom: "0.5px solid #f0dce8" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {donations.map(d => (
                        <tr key={d.id} style={{ borderBottom: "0.5px solid #f0dce8" }}>
                          <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1a0d14" }}>{d.is_anonymous ? "Anonymous" : d.profiles?.full_name || "Donor"}</td>
                          <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 700, color: "#7d2a4a" }}>${(d.amount / 100).toFixed(2)}</td>
                          <td style={{ padding: "12px 14px", fontSize: 12, color: "#7a5068", fontStyle: "italic" }}>{d.message || "—"}</td>
                          <td style={{ padding: "12px 14px", fontSize: 12, color: "#b090a4" }}>{timeAgo(d.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
