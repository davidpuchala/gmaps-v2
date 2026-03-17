"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MOCK_USERS } from "../lib/users";
import { synthesizeProfile, scoreRestaurants } from "../lib/engine";
import { GoogleMap, useJsApiLoader, Marker, Circle } from "@react-google-maps/api";

// ── Constants ────────────────────────────────────────────────────────────────
const MODES = [
  { key:"all",       label:"✨ For You"  },
  { key:"open",      label:"🟢 Open now" },
  { key:"trending",  label:"🔥 Trending" },
  { key:"hidden",    label:"💎 Hidden"   },
];
const SNAP_PEEK = 108;
const SNAP_HALF = 0.52;
const SNAP_FULL = 0.93;

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"linear-gradient(145deg,#f0f4ff 0%,#e8f5e9 100%)", padding:24,
    }}>
      <motion.div
        initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.5, ease:[0.22,1,0.36,1] }}
        style={{ width:"100%", maxWidth:380, background:"white", borderRadius:28,
          boxShadow:"0 12px 48px rgba(0,0,0,0.10)", padding:"40px 32px" }}
      >
        <div style={{ textAlign:"center", marginBottom:8 }}>
          <svg width="48" height="48" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M24 4C15.163 4 8 11.163 8 20c0 12 16 28 16 28s16-16 16-28c0-8.837-7.163-16-16-16z"/>
            <circle cx="24" cy="20" r="6" fill="white"/>
          </svg>
        </div>
        <h1 style={{ fontSize:24, fontWeight:700, textAlign:"center", color:"#202124", marginBottom:4 }}>
          Sign in to Maps
        </h1>
        <p style={{ fontSize:14, color:"#5f6368", textAlign:"center", marginBottom:28 }}>
          Use your Google Account
        </p>

        <div style={{ background:"#f0f4ff", border:"1px solid #c5d8ff", borderRadius:12,
          padding:"14px 16px", marginBottom:28, fontSize:13, color:"#3c4043", lineHeight:1.6 }}>
          <strong style={{ color:"#1a73e8" }}>🔒 Demo mode</strong><br/>
          This prototype simulates Google OAuth. Select a persona to see how the engine
          personalises recommendations based on your account activity.
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {Object.values(MOCK_USERS).map((user, i) => (
            <motion.button key={user.email}
              initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }}
              transition={{ delay:0.1 + i*0.07 }}
              whileHover={{ scale:1.015, boxShadow:"0 4px 16px rgba(0,0,0,0.10)" }}
              whileTap={{ scale:0.98 }}
              onClick={() => onLogin(user.email)}
              style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px",
                border:"1px solid #dadce0", borderRadius:24, background:"white",
                cursor:"pointer", textAlign:"left", fontFamily:"'Google Sans',sans-serif",
                boxShadow:"0 1px 4px rgba(0,0,0,0.06)", transition:"box-shadow 0.15s" }}
            >
              <div style={{ width:42, height:42, borderRadius:"50%", background:user.color,
                display:"flex", alignItems:"center", justifyContent:"center",
                color:"white", fontWeight:700, fontSize:16, flexShrink:0 }}>
                {user.initials}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, color:"#202124" }}>{user.name}</div>
                <div style={{ fontSize:12, color:"#5f6368" }}>{user.neighborhood} · {user.tagline}</div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </motion.button>
          ))}
        </div>

        <p style={{ fontSize:11, color:"#9aa0a6", textAlign:"center", marginTop:20, lineHeight:1.6 }}>
          In production, OAuth grants the engine access to your<br/>
          Maps reviews, saves, and location history.
        </p>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RESTAURANT CARD
// ══════════════════════════════════════════════════════════════════════════════
function RestaurantCard({ r, onFeedback }) {
  const [expanded, setExpanded] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(null);
  const price = "€".repeat(r.price_level || 2);
  const rawType = (r.types?.[0] || "restaurant").replace(/_restaurant$/,"").replace(/_/g," ");
  const typeLabel = rawType.charAt(0).toUpperCase() + rawType.slice(1);
  const distKm = ((r.distance_m || 0)/1000).toFixed(1);
  const matchColor = r.matchPct >= 78 ? "#188038" : r.matchPct >= 58 ? "#e37400" : "#5f6368";

  const handleFb = (intent) => {
    setFeedbackGiven(intent);
    onFeedback(r.name, intent);
  };

  return (
    <motion.div layout initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
      transition={{ ease:[0.22,1,0.36,1] }}
      style={{ background:"white", borderRadius:18, marginBottom:12, overflow:"hidden",
        boxShadow:"0 2px 10px rgba(0,0,0,0.09)" }}>

      {/* Photo */}
      {r.photo_url && (
        <div style={{ height:148, background:"#f1f3f4", overflow:"hidden" }}>
          <img src={r.photo_url} alt={r.name}
            style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
        </div>
      )}
      {!r.photo_url && (
        <div style={{ height:80, background:`linear-gradient(135deg, ${matchColor}22, ${matchColor}44)`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:36 }}>
          🍽️
        </div>
      )}

      <div style={{ padding:"14px 14px 12px" }}>
        {/* Name + match */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:700, color:"#202124",
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {r.name}
            </div>
            <div style={{ fontSize:12, color:"#5f6368", marginTop:1 }}>
              {typeLabel} · {price} · {r.neighborhood}
            </div>
          </div>
          <motion.div initial={{ scale:0.7 }} animate={{ scale:1 }}
            transition={{ type:"spring", stiffness:400, damping:20 }}
            style={{ background:matchColor, color:"white", borderRadius:20,
              padding:"3px 11px", fontSize:13, fontWeight:700, marginLeft:10, flexShrink:0 }}>
            {r.matchPct}%
          </motion.div>
        </div>

        {/* Meta */}
        <div style={{ fontSize:12, color:"#3c4043", marginBottom:8 }}>
          ⭐ <strong>{r.rating}</strong>
          <span style={{ color:"#9aa0a6" }}> ({(r.reviews_count||0).toLocaleString()})</span>
          {" · "}
          <span style={{ color: r.open_now ? "#188038" : "#d93025", fontWeight:600 }}>
            {r.open_now ? "Open" : "Closed"}
          </span>
          {" · "}{distKm} km
        </div>

        {/* AI explanation */}
        {r.explanation ? (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
            style={{ fontSize:13, color:"#3c4043", fontStyle:"italic", marginBottom:10,
              background:"#f8f9fa", borderRadius:10, padding:"8px 12px",
              borderLeft:"3px solid #1a73e8" }}>
            "{r.explanation}"
          </motion.div>
        ) : (
          <div style={{ fontSize:12, color:"#9aa0a6", marginBottom:10 }}>
            Generating personalised reason…
          </div>
        )}

        {/* Score breakdown */}
        <button onClick={() => setExpanded(e=>!e)}
          style={{ fontSize:12, color:"#1a73e8", background:"none", border:"none",
            cursor:"pointer", padding:0, marginBottom:8, fontFamily:"'Google Sans',sans-serif" }}>
          {expanded ? "▲ Hide scores" : "▼ Score breakdown"}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
              exit={{ height:0, opacity:0 }} style={{ overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8,
                background:"#f8f9fa", borderRadius:12, padding:"12px", marginBottom:10 }}>
                {[
                  ["🍜 Cuisine",  r.cuisineScore, "#1a73e8"],
                  ["⭐ Rating",   r.ratingScore,  "#fbbc04"],
                  ["💰 Price",    r.priceScore,   "#188038"],
                  ["📍 Distance", r.distScore,    "#ea4335"],
                ].map(([label, val, color]) => (
                  <div key={label}>
                    <div style={{ fontSize:11, color:"#5f6368", marginBottom:4 }}>{label}</div>
                    <div style={{ background:"#e8eaed", borderRadius:4, height:6, marginBottom:3 }}>
                      <motion.div initial={{ width:0 }} animate={{ width:`${val||0}%` }}
                        transition={{ duration:0.5 }}
                        style={{ background:color, borderRadius:4, height:6 }}/>
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#202124" }}>{val||0}/100</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback buttons */}
        {feedbackGiven ? (
          <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
            style={{ textAlign:"center", fontSize:13, color:"#5f6368", padding:"6px 0" }}>
            {feedbackGiven === "🔖" ? "🔖 Saved!" : feedbackGiven === "👍" ? "👍 Noted — improving your picks" : "👎 Removed from picks"}
          </motion.div>
        ) : (
          <div style={{ display:"flex", gap:7 }}>
            {[
              { intent:"👍", label:"Interested", bg:"#e6f4ea", color:"#188038" },
              { intent:"👎", label:"Not for me", bg:"#fce8e6", color:"#d93025" },
              { intent:"🔖", label:"Save",       bg:"#fef7e0", color:"#e37400" },
            ].map(({ intent, label, bg, color }) => (
              <motion.button key={intent} whileTap={{ scale:0.94 }} onClick={() => handleFb(intent)}
                style={{ flex:1, padding:"8px 0", borderRadius:20, border:"none",
                  background:bg, color, fontSize:12, fontWeight:600, cursor:"pointer",
                  fontFamily:"'Google Sans',sans-serif" }}>
                {intent} {label}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// YOU TAB
// ══════════════════════════════════════════════════════════════════════════════
function YouTab({ user, profile, history }) {
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const prevLen = useRef(0);

  useEffect(() => {
    if (history.length < 1 || history.length === prevLen.current) return;
    prevLen.current = history.length;
    setLoading(true);
    fetch("/api/summary", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ history, profile }),
    })
      .then(r => r.json())
      .then(d => { setSummary(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [history, profile]);

  const topAff = Object.entries(profile?.affinity || {})
    .sort((a,b) => b[1]-a[1]).slice(0,6);
  const saved  = history.filter(h => h.saved || h.intent === "🔖");

  return (
    <div style={{ padding:"16px 16px 80px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <div style={{ width:50, height:50, borderRadius:"50%", background:user.color,
          display:"flex", alignItems:"center", justifyContent:"center",
          color:"white", fontWeight:700, fontSize:20 }}>{user.initials}</div>
        <div>
          <div style={{ fontSize:17, fontWeight:700, color:"#202124" }}>{user.name}</div>
          <div style={{ fontSize:13, color:"#5f6368" }}>{user.neighborhood} · {user.tagline}</div>
        </div>
      </div>

      {/* LLM Personality summary */}
      <SectionTitle>🧠 Your taste profile</SectionTitle>
      {loading && (
        <div style={{ fontSize:13, color:"#5f6368", marginBottom:12,
          background:"#f8f9fa", borderRadius:10, padding:"12px 14px" }}>
          Generating insights from your interactions…
        </div>
      )}
      {summary?.summary_text && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          style={{ background:"#f8f9fa", borderLeft:"4px solid #1a73e8",
            borderRadius:"0 12px 12px 0", padding:"14px 16px", fontSize:13,
            color:"#3c4043", lineHeight:1.7, marginBottom:10 }}>
          {summary.summary_text}
        </motion.div>
      )}
      {summary?.top_tags?.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
          {summary.top_tags.map(tag => (
            <span key={tag} style={{ background:"#e8f0fe", color:"#1a73e8",
              borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:600 }}>
              {tag}
            </span>
          ))}
        </div>
      )}
      {summary?.accuracy != null && (
        <div style={{ fontSize:13, color:"#5f6368", marginBottom:20 }}>
          Engine accuracy:{" "}
          <strong style={{ color: summary.accuracy >= 70 ? "#188038" : summary.accuracy >= 40 ? "#e37400" : "#d93025" }}>
            {summary.accuracy}%
          </strong> of recommendations accepted
        </div>
      )}
      {!history.length && (
        <div style={{ background:"#f8f9fa", borderRadius:12, padding:"14px 16px",
          fontSize:13, color:"#5f6368", marginBottom:20, lineHeight:1.6 }}>
          React to a few recommendations on the Explore tab to unlock your personalised insights.
        </div>
      )}

      {/* Affinity bars */}
      <SectionTitle>🍽️ Cuisine affinities</SectionTitle>
      {topAff.map(([cuisine, score], i) => {
        const raw = cuisine.replace(/_restaurant$/,"").replace(/_/g," ");
        const label = raw.charAt(0).toUpperCase() + raw.slice(1);
        const pct = Math.round(score * 100);
        return (
          <div key={cuisine} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}>
              <span style={{ color:"#3c4043" }}>{label}</span>
              <span style={{ color:"#5f6368", fontWeight:600 }}>{pct}%</span>
            </div>
            <div style={{ background:"#e8eaed", borderRadius:4, height:8 }}>
              <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }}
                transition={{ duration:0.6, delay:i*0.06, ease:[0.22,1,0.36,1] }}
                style={{ background:"#1a73e8", borderRadius:4, height:8 }}/>
            </div>
          </div>
        );
      })}

      {/* Saved */}
      {saved.length > 0 && (
        <>
          <SectionTitle style={{ marginTop:20 }}>🔖 Saved places</SectionTitle>
          {saved.map((h, i) => (
            <div key={i} style={{ background:"#fef7e0", borderRadius:12, padding:"10px 14px",
              marginBottom:8, fontSize:13, color:"#202124", fontWeight:600 }}>
              {h.name}
              <span style={{ fontSize:12, color:"#9aa0a6", fontWeight:400, marginLeft:8 }}>{h.date}</span>
            </div>
          ))}
        </>
      )}

      {/* History */}
      <SectionTitle style={{ marginTop:20 }}>📋 Interaction history</SectionTitle>
      {!history.length
        ? <div style={{ fontSize:13, color:"#9aa0a6" }}>No interactions yet.</div>
        : [...history].reverse().map((h, i) => {
            const rawType = (h.types?.[0] || "restaurant").replace(/_restaurant$/,"").replace(/_/g," ");
            const tLabel  = rawType.charAt(0).toUpperCase() + rawType.slice(1);
            return (
              <div key={i} style={{ background:"white", borderRadius:12, padding:"12px 14px",
                marginBottom:8, boxShadow:"0 1px 4px rgba(0,0,0,0.07)",
                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:"#202124" }}>{h.name}
                    {(h.saved || h.intent === "🔖") && (
                      <span style={{ marginLeft:7, fontSize:11, background:"#fef7e0",
                        color:"#e37400", borderRadius:8, padding:"2px 7px" }}>🔖</span>
                    )}
                  </div>
                  <div style={{ fontSize:12, color:"#9aa0a6" }}>{tLabel} · {h.date}</div>
                </div>
                <div style={{ fontSize:24 }}>{h.intent}</div>
              </div>
            );
          })
      }
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PIPELINE TAB
// ══════════════════════════════════════════════════════════════════════════════
function PipelineTab({ user, profile, weights, prefLabel }) {
  const w = weights || { cuisine:0.40, rating:0.30, price:0.20, distance:0.10 };
  const totalReviews = Object.values(user?.reviewed_cuisines || {}).reduce((s,v)=>s+v.count,0);
  const totalVisits  = Object.values(user?.visited_types || {}).reduce((s,v)=>s+v,0);

  return (
    <div style={{ padding:"16px 16px 80px" }}>
      <SectionTitle>📡 Input signals</SectionTitle>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:20 }}>
        {[["Reviews",totalReviews,"#1a73e8"],["Visits",totalVisits,"#188038"],
          ["Saved",user?.saved_places?.length||0,"#e37400"]].map(([label,val,color])=>(
          <div key={label} style={{ background:"white", borderRadius:14, padding:"14px 10px",
            textAlign:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize:26, fontWeight:700, color }}>{val}</div>
            <div style={{ fontSize:12, color:"#5f6368" }}>{label}</div>
          </div>
        ))}
      </div>

      <SectionTitle>
        ⚖️ Scoring weights
        {prefLabel && <span style={{ fontSize:11, color:"#1a73e8", fontWeight:400,
          background:"#e8f0fe", borderRadius:20, padding:"2px 9px", marginLeft:8 }}>
          ⚡ {prefLabel}
        </span>}
      </SectionTitle>
      <div style={{ background:"white", borderRadius:14, overflow:"hidden",
        boxShadow:"0 1px 4px rgba(0,0,0,0.08)", marginBottom:20 }}>
        {Object.entries(w).map(([k,v],i,arr)=>{
          const icons = { cuisine:"🍜", rating:"⭐", price:"💰", distance:"📍" };
          return (
            <div key={k} style={{ padding:"11px 16px",
              borderBottom: i<arr.length-1 ? "1px solid #f1f3f4" : "none" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                fontSize:13, marginBottom:5 }}>
                <span style={{ color:"#3c4043" }}>{icons[k]} {k.charAt(0).toUpperCase()+k.slice(1)}</span>
                <strong style={{ color:"#202124" }}>{Math.round(v*100)}%</strong>
              </div>
              <div style={{ background:"#f1f3f4", borderRadius:4, height:5 }}>
                <motion.div initial={{ width:0 }} animate={{ width:`${Math.round(v*100)}%` }}
                  transition={{ duration:0.5 }}
                  style={{ background:"#1a73e8", borderRadius:4, height:5 }}/>
              </div>
            </div>
          );
        })}
      </div>

      <SectionTitle>🤖 LLM features</SectionTitle>
      {[
        { n:1, title:"Per-card explanation", fn:"POST /api/explain",
          badge:null,
          desc:"gpt-4o-mini generates a personalized 1-sentence reason why each restaurant fits this user. Profile + restaurant metadata → tailored explanation text injected into the card." },
        { n:2, title:"Personality summary (You tab)", fn:"POST /api/summary",
          badge:"Non-straightforward",
          desc:"LLM receives structured interaction data (accepted/rejected/saved restaurants) and reasons over it to produce natural-language personality insights + descriptor tags. Output is parsed into structured fields, not displayed raw." },
        { n:3, title:"Free-text → scoring weights", fn:"POST /api/parse-pref",
          badge:"Non-straightforward · Tools pattern",
          desc:'User types "quiet spot for a business lunch" → LLM returns structured JSON that directly overwrites the scoring weights and filters. The recommendation algorithm runs differently on every subsequent call. LLM output feeds a downstream system.' },
      ].map(f => (
        <div key={f.n} style={{ background:"white", borderRadius:14, padding:16,
          marginBottom:10, boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:6, flexWrap:"wrap" }}>
            <span style={{ background:"#1a73e8", color:"white", borderRadius:20,
              width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:11, fontWeight:700, flexShrink:0 }}>{f.n}</span>
            <div style={{ fontSize:14, fontWeight:700, color:"#202124" }}>{f.title}</div>
            {f.badge && <span style={{ fontSize:10, background:"#e6f4ea", color:"#188038",
              borderRadius:20, padding:"2px 8px", fontWeight:600 }}>{f.badge}</span>}
          </div>
          <code style={{ fontSize:11, background:"#f1f3f4", borderRadius:6,
            padding:"3px 8px", color:"#1a73e8", display:"block", marginBottom:8 }}>
            {f.fn}
          </code>
          <div style={{ fontSize:12, color:"#5f6368", lineHeight:1.6 }}>{f.desc}</div>
        </div>
      ))}

      <SectionTitle style={{ marginTop:20 }}>🔐 Mock OAuth</SectionTitle>
      <div style={{ background:"white", borderRadius:14, padding:16,
        boxShadow:"0 1px 4px rgba(0,0,0,0.08)", fontSize:12, color:"#5f6368", lineHeight:1.7 }}>
        The login screen simulates a Google OAuth 2.0 flow with 3 pre-built personas.
        Each persona has a distinct review history, visit pattern, and saved-places list —
        representing data that would be fetched from Google's People API after a real OAuth grant.
        Swapping personas demonstrates how dramatically recommendations change,
        proving the engine is genuinely personalised. In production: replace <code style={{ background:"#f1f3f4",
          borderRadius:4, padding:"1px 5px", color:"#1a73e8" }}>MOCK_USERS</code> with
        a People API call using the OAuth access token.
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function SectionTitle({ children, style }) {
  return (
    <div style={{ fontSize:14, fontWeight:700, color:"#202124",
      margin:"0 0 10px", ...style }}>
      {children}
    </div>
  );
}

function Toast({ msg }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          exit={{ opacity:0, y:16 }}
          style={{ position:"fixed", bottom:130, left:"50%", transform:"translateX(-50%)",
            background:"#202124", color:"white", borderRadius:20,
            padding:"9px 20px", fontSize:13, fontWeight:500, zIndex:100,
            whiteSpace:"nowrap", boxShadow:"0 4px 16px rgba(0,0,0,0.22)" }}>
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── Auth state ─────────────────────────────────────────────────────────────
  const [loggedIn,   setLoggedIn]   = useState(false);
  const [userEmail,  setUserEmail]  = useState(null);
  const [profile,    setProfile]    = useState(null);

  // ── Data state ─────────────────────────────────────────────────────────────
  const [restaurants,    setRestaurants]    = useState([]);
  const [recs,           setRecs]           = useState([]);
  const [history,        setHistory]        = useState([]);
  const [excluded,       setExcluded]       = useState(new Set());
  const [loadingRecs,    setLoadingRecs]    = useState(false);

  // ── Controls ───────────────────────────────────────────────────────────────
  const [mode,           setMode]           = useState("all");
  const [radius,         setRadius]         = useState(750);
  const [advanced,       setAdvanced]       = useState({});
  const [customWeights,  setCustomWeights]  = useState(null);
  const [prefLabel,      setPrefLabel]      = useState(null);
  const [prefInput,      setPrefInput]      = useState("");
  const [prefLoading,    setPrefLoading]    = useState(false);
  const [showAdvanced,   setShowAdvanced]   = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("explore");
  const [toastMsg,  setToastMsg]  = useState(null);
  const [vh,        setVh]        = useState(812);   // SSR-safe viewport height
  const [sheetSnap, setSheetSnap] = useState("half");
  const dragStartY = useRef(null);

  // ── Map state ──────────────────────────────────────────────────────────────
  const [userLatLng, setUserLatLng] = useState(null);
  const mapRef = useRef(null);
  const BARCELONA = { lat: 41.3874, lng: 2.1686 };

  const { isLoaded: mapsLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GMAPS_KEY || "",
  });

  // Use persona's neighbourhood coords — no real geolocation needed in prototype
  const PERSONA_COORDS = {
    "david@gmail.com": { lat: 41.3910, lng: 2.1655 },  // Eixample (central)
    "sofia@gmail.com": { lat: 41.4035, lng: 2.1536 },  // Gràcia
    "marc@gmail.com":  { lat: 41.3762, lng: 2.1921 },  // Barceloneta (central)
  };
  useEffect(() => {
    if (!loggedIn || !userEmail) return;
    setUserLatLng(PERSONA_COORDS[userEmail] || BARCELONA);
  }, [loggedIn, userEmail]);

  // Pan map to user's location whenever it changes (profile switch or login)
  useEffect(() => {
    if (userLatLng && mapRef.current) mapRef.current.panTo(userLatLng);
  }, [userLatLng]);

  // Measure real viewport height client-side only
  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const snapPx = useCallback((snap) => {
    if (snap === "peek") return SNAP_PEEK;
    if (snap === "half") return vh * SNAP_HALF;
    return vh * SNAP_FULL;
  }, [vh]);

  const user = userEmail ? MOCK_USERS[userEmail] : null;

  // ── Login / logout ─────────────────────────────────────────────────────────
  const handleLogin = (email) => {
    setUserEmail(email);
    setProfile(synthesizeProfile(MOCK_USERS[email]));
    setLoggedIn(true);
    setRecs([]); setRestaurants([]); setHistory([]);
    setExcluded(new Set()); setCustomWeights(null); setPrefLabel(null);
  };
  const handleLogout = () => {
    setLoggedIn(false); setUserEmail(null); setProfile(null);
  };

  // ── Fetch restaurants when logged in, radius, or user location changes ────
  useEffect(() => {
    if (!loggedIn || !userLatLng) return;
    setLoadingRecs(true);
    fetch(`/api/places?radius=${radius}&lat=${userLatLng.lat}&lng=${userLatLng.lng}`)
      .then(r => r.json())
      .then(d => setRestaurants(d.results || []))
      .catch(() => {})
      .finally(() => setLoadingRecs(false));
  }, [loggedIn, radius, userLatLng]);

  // ── Re-score whenever inputs change ───────────────────────────────────────
  useEffect(() => {
    if (!profile || !restaurants.length) return;
    const scored  = scoreRestaurants(restaurants, profile, { mode, advanced, weights: customWeights });
    const visible = scored.filter(r => !excluded.has(r.name)).slice(0, 3);

    // Set placeholder immediately, then stream in explanations
    setRecs(visible.map(r => ({ ...r, explanation: null })));
    visible.forEach(r => {
      fetch("/api/explain", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ restaurant: r, profile }),
      })
        .then(res => res.json())
        .then(d => setRecs(prev =>
          prev.map(pr => pr.name === r.name ? { ...pr, explanation: d.explanation } : pr)
        ))
        .catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurants, profile, mode, customWeights, excluded, advanced]);

  // ── Feedback ───────────────────────────────────────────────────────────────
  const handleFeedback = useCallback((name, intent) => {
    const rec = recs.find(r => r.name === name) || {};
    const entry = {
      name, types: rec.types, rating: rec.rating, price_level: rec.price_level,
      intent, saved: intent === "🔖",
      date: new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short" }),
    };
    setHistory(h => [...h.filter(e => e.name !== name), entry]);
    if (intent === "👎") setExcluded(ex => new Set([...ex, name]));
    showToast(
      intent === "🔖" ? `🔖 ${name} saved!`
      : intent === "👍" ? "👍 Noted — improving picks"
      : "👎 Removed from picks"
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recs]);

  // ── Refresh picks ──────────────────────────────────────────────────────────
  const handleRefresh = () => {
    const names = recs.map(r => r.name);
    setExcluded(ex => new Set([...ex, ...names]));
  };

  // ── Natural language preference ────────────────────────────────────────────
  const handlePrefSubmit = async () => {
    if (!prefInput.trim() || prefLoading) return;
    setPrefLoading(true);
    try {
      const res = await fetch("/api/parse-pref", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ text: prefInput }),
      });
      const d = await res.json();
      setCustomWeights(d.weights);
      setAdvanced(a => ({ ...a, ...d.filters, cuisine_override: d.cuisine_override || null }));
      setPrefLabel(d.summary_label);
      setPrefInput("");
      showToast(`🎯 ${d.summary_label || "Preferences updated"}`);
    } catch {}
    setPrefLoading(false);
  };

  // ── Toast ──────────────────────────────────────────────────────────────────
  const toastTimer = useRef(null);
  const showToast = (msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2600);
  };

  // ── Sheet drag ─────────────────────────────────────────────────────────────
  const sheetY = -(snapPx(sheetSnap) - SNAP_PEEK);

  const handleDragEnd = (_, info) => {
    const velocity = info.velocity.y;
    const offset   = info.offset.y;
    if (velocity > 400 || offset > 100) {
      setSheetSnap(sheetSnap === "full" ? "half" : "peek");
    } else if (velocity < -400 || offset < -100) {
      setSheetSnap(sheetSnap === "peek" ? "half" : "full");
    }
  };

  if (!loggedIn) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ minHeight:"100vh", background:"#1a1a2e", display:"flex",
      alignItems:"center", justifyContent:"center", padding:"20px 0" }}>
    {/* iPhone shell */}
    <div style={{ width:393, height:Math.min(vh, 852), flexShrink:0,
      borderRadius:50, overflow:"hidden", position:"relative",
      background:"#e8e8e8",
      boxShadow:"0 0 0 10px #1a1a1a, 0 0 0 12px #3a3a3a, 0 40px 80px rgba(0,0,0,0.7)",
    }}>
    {/* Notch */}
    <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
      width:120, height:34, background:"#1a1a1a", borderRadius:"0 0 20px 20px", zIndex:100 }} />

      {/* ── Map background ──────────────────────────────────────────────── */}
      {mapsLoaded ? (
        <GoogleMap
          mapContainerStyle={{ position:"absolute", inset:0, width:"100%", height:"100%", filter:"saturate(0.85) brightness(0.97)" }}
          defaultCenter={userLatLng || BARCELONA}
          zoom={15}
          onLoad={map => { mapRef.current = map; }}
          options={{
            disableDefaultUI: true,
            gestureHandling: "greedy",
            styles: [{ featureType:"poi", elementType:"labels", stylers:[{visibility:"off"}] }],
          }}
        >
          {userLatLng && (
            <>
              <Marker
                position={userLatLng}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#4285F4",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 3,
                }}
              />
              <Circle
                center={userLatLng}
                radius={80}
                options={{ fillColor:"#4285F4", fillOpacity:0.15, strokeColor:"#4285F4", strokeOpacity:0.3, strokeWeight:1 }}
              />
            </>
          )}
          {recs.map((r, i) => r.lat && r.lng && (
            <Marker
              key={r.place_id || r.name}
              position={{ lat: r.lat, lng: r.lng }}
              label={{ text: String(i + 1), color: "#fff", fontWeight: "bold", fontSize: "13px" }}
              icon={{
                path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
                fillColor: "#1a73e8",
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 2,
                scale: 2,
                anchor: new window.google.maps.Point(12, 22),
                labelOrigin: new window.google.maps.Point(12, 9),
              }}
            />
          ))}
        </GoogleMap>
      ) : (
        <div style={{ position:"absolute", inset:0, background:"#e8e8e8" }} />
      )}

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{ position:"absolute", top:0, left:0, right:0, zIndex:20,
        padding:"12px 12px 0",
        background:"linear-gradient(to bottom,rgba(255,255,255,0.97) 70%,transparent)" }}>

        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
          {/* Maps pin logo */}
          <svg width="32" height="32" viewBox="0 0 48 48" style={{ flexShrink:0 }}>
            <path fill="#4285F4" d="M24 4C15.163 4 8 11.163 8 20c0 12 16 28 16 28s16-16 16-28c0-8.837-7.163-16-16-16z"/>
            <circle cx="24" cy="20" r="6.5" fill="white"/>
          </svg>

          {/* Search pill */}
          <div style={{ flex:1, background:"white", borderRadius:24, padding:"9px 16px",
            fontSize:14, color:"#80868b", boxShadow:"0 2px 8px rgba(0,0,0,0.12)",
            fontFamily:"'Google Sans',sans-serif" }}>
            Search in Maps
          </div>

          {/* Avatar / sign out */}
          <motion.button whileTap={{ scale:0.92 }} onClick={handleLogout}
            title="Tap to sign out"
            style={{ width:38, height:38, borderRadius:"50%", background:user.color,
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"white", fontWeight:700, fontSize:15, flexShrink:0,
              border:"2.5px solid white", cursor:"pointer",
              boxShadow:"0 2px 8px rgba(0,0,0,0.18)" }}>
            {user.initials}
          </motion.button>
        </div>

        {/* Mode chips */}
        <div style={{ display:"flex", gap:7, overflowX:"auto",
          scrollbarWidth:"none", paddingBottom:10 }}>
          {MODES.map(m => (
            <motion.button key={m.key} whileTap={{ scale:0.95 }}
              onClick={() => setMode(m.key)}
              style={{ padding:"7px 15px", borderRadius:20, border:"none",
                fontSize:12, fontWeight:600, whiteSpace:"nowrap", cursor:"pointer",
                fontFamily:"'Google Sans',sans-serif",
                background: mode===m.key ? "#1a73e8" : "white",
                color:      mode===m.key ? "white"   : "#3c4043",
                boxShadow:  mode===m.key
                  ? "0 2px 8px rgba(26,115,232,0.35)"
                  : "0 1px 4px rgba(0,0,0,0.10)",
                transition:"all 0.18s" }}>
              {m.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Bottom sheet ────────────────────────────────────────────────── */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.06}
        onDragEnd={handleDragEnd}
        animate={{ y: sheetY }}
        transition={{ type:"spring", stiffness:320, damping:32 }}
        style={{ position:"absolute", bottom: -(vh - SNAP_PEEK),
          left:0, right:0, height: vh * SNAP_FULL + 20,
          background:"white", borderRadius:"22px 22px 0 0",
          boxShadow:"0 -6px 32px rgba(0,0,0,0.13)", zIndex:30,
          display:"flex", flexDirection:"column" }}
      >
        {/* Drag handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 6px", flexShrink:0, cursor:"grab" }}>
          <div style={{ width:38, height:4, borderRadius:2, background:"#dadce0" }}/>
        </div>

        {/* Tab bar */}
        <div style={{ display:"flex", borderBottom:"1px solid #f1f3f4", flexShrink:0 }}>
          {[
            { key:"explore",  label:"🗺️ Explore"  },
            { key:"you",      label:"👤 You"       },
            { key:"pipeline", label:"⚙️ Pipeline"  },
          ].map(t => (
            <button key={t.key}
              onClick={() => {
                setActiveTab(t.key);
                if (sheetSnap === "peek") setSheetSnap("half");
              }}
              style={{ flex:1, padding:"11px 0", border:"none", background:"none",
                cursor:"pointer", fontSize:12, fontWeight:600,
                fontFamily:"'Google Sans',sans-serif",
                color: activeTab===t.key ? "#1a73e8" : "#5f6368",
                borderBottom: activeTab===t.key ? "2.5px solid #1a73e8" : "2.5px solid transparent",
                transition:"color 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable tab content */}
        <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
          <AnimatePresence mode="wait">
            {activeTab === "explore" && (
              <motion.div key="explore"
                initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }}
                exit={{ opacity:0, x:-10 }} transition={{ duration:0.18 }}>

                {/* Pref input */}
                <div style={{ padding:"14px 14px 4px" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#202124", marginBottom:7 }}>
                    💬 What are you in the mood for?
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <input value={prefInput}
                      onChange={e => setPrefInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handlePrefSubmit()}
                      placeholder="e.g. quiet spot for a business lunch…"
                      style={{ flex:1, border:"1.5px solid #dadce0", borderRadius:20,
                        padding:"9px 15px", fontSize:13, outline:"none", color:"#202124",
                        fontFamily:"'Google Sans',sans-serif",
                        transition:"border-color 0.15s" }}
                      onFocus={e => e.target.style.borderColor="#1a73e8"}
                      onBlur={e  => e.target.style.borderColor="#dadce0"}
                    />
                    <motion.button whileTap={{ scale:0.93 }} onClick={handlePrefSubmit}
                      disabled={prefLoading}
                      style={{ padding:"9px 18px", background:"#1a73e8", color:"white",
                        border:"none", borderRadius:20, fontSize:13, fontWeight:700,
                        cursor:"pointer", fontFamily:"'Google Sans',sans-serif",
                        opacity: prefLoading ? 0.7 : 1, minWidth:44 }}>
                      {prefLoading ? "…" : "→"}
                    </motion.button>
                  </div>
                  {prefLabel && (
                    <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
                      style={{ display:"inline-flex", alignItems:"center", gap:6,
                        marginTop:8, background:"#e8f0fe", color:"#1a73e8",
                        borderRadius:20, padding:"5px 14px", fontSize:12, fontWeight:600 }}>
                      🎯 {prefLabel}
                      <span style={{ cursor:"pointer", opacity:0.6 }}
                        onClick={() => { setPrefLabel(null); setCustomWeights(null);
                          setAdvanced({}); }}>✕</span>
                    </motion.div>
                  )}
                </div>

                {/* Radius slider */}
                <div style={{ padding:"8px 14px 4px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    fontSize:12, color:"#5f6368", marginBottom:4 }}>
                    <span>Search radius</span>
                    <span style={{ fontWeight:600, color:"#3c4043" }}>{radius}m</span>
                  </div>
                  <input type="range" min={500} max={5000} step={250} value={radius}
                    onChange={e => setRadius(Number(e.target.value))}
                    onPointerDown={e => e.stopPropagation()}
                    style={{ width:"100%", accentColor:"#1a73e8", cursor:"pointer" }}/>
                </div>

                {/* Advanced toggle */}
                <div style={{ padding:"4px 14px 8px" }}>
                  <button onClick={() => setShowAdvanced(s=>!s)}
                    style={{ fontSize:12, color:"#1a73e8", background:"none", border:"none",
                      cursor:"pointer", fontFamily:"'Google Sans',sans-serif", padding:0 }}>
                    {showAdvanced ? "▲ Hide filters" : "▼ Advanced filters"}
                  </button>
                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div initial={{ height:0, opacity:0 }}
                        animate={{ height:"auto", opacity:1 }}
                        exit={{ height:0, opacity:0 }} style={{ overflow:"hidden" }}>
                        <div style={{ paddingTop:10, display:"flex", flexDirection:"column", gap:10 }}>
                          {/* Max price — pill buttons (avoids native select/picker) */}
                          <div>
                            <div style={{ fontSize:12, color:"#5f6368", marginBottom:6 }}>Max price</div>
                            <div style={{ display:"flex", gap:6 }}>
                              {[["Any",null],["€",1],["€€",2],["€€€",3],["€€€€",null]].map(([label, val]) => {
                                const active = val === null
                                  ? !advanced.price_max
                                  : advanced.price_max === val;
                                return (
                                  <button key={label}
                                    onPointerDown={e => e.stopPropagation()}
                                    onClick={() => setAdvanced(a => ({ ...a, price_max: val }))}
                                    style={{ flex:1, padding:"6px 0", border:"1.5px solid",
                                      borderColor: active ? "#1a73e8" : "#dadce0",
                                      borderRadius:20, background: active ? "#e8f0fe" : "white",
                                      color: active ? "#1a73e8" : "#5f6368",
                                      fontSize:12, fontWeight:600, cursor:"pointer",
                                      fontFamily:"'Google Sans',sans-serif" }}>
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          {/* Dietary — pill buttons */}
                          <div>
                            <div style={{ fontSize:12, color:"#5f6368", marginBottom:6 }}>Dietary</div>
                            <div style={{ display:"flex", gap:6 }}>
                              {[["None",null],["Vegan","vegan"],["Seafood","seafood"]].map(([label, val]) => {
                                const active = (advanced.dietary || null) === val;
                                return (
                                  <button key={label}
                                    onPointerDown={e => e.stopPropagation()}
                                    onClick={() => setAdvanced(a => ({ ...a, dietary: val }))}
                                    style={{ flex:1, padding:"6px 0", border:"1.5px solid",
                                      borderColor: active ? "#1a73e8" : "#dadce0",
                                      borderRadius:20, background: active ? "#e8f0fe" : "white",
                                      color: active ? "#1a73e8" : "#5f6368",
                                      fontSize:12, fontWeight:600, cursor:"pointer",
                                      fontFamily:"'Google Sans',sans-serif" }}>
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          {/* Quiet vibe toggle */}
                          <div style={{ display:"flex", gap:6 }}>
                            <button
                              onPointerDown={e => e.stopPropagation()}
                              onClick={() => setAdvanced(a => ({ ...a, quiet: !a.quiet }))}
                              style={{ padding:"6px 16px", border:"1.5px solid",
                                borderColor: advanced.quiet ? "#1a73e8" : "#dadce0",
                                borderRadius:20, background: advanced.quiet ? "#e8f0fe" : "white",
                                color: advanced.quiet ? "#1a73e8" : "#5f6368",
                                fontSize:12, fontWeight:600, cursor:"pointer",
                                fontFamily:"'Google Sans',sans-serif" }}>
                              🤫 Quiet vibe
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div style={{ borderTop:"1px solid #f1f3f4" }}/>

                {/* Cards */}
                <div style={{ padding:"12px 14px" }}>
                  {loadingRecs
                    ? <div style={{ textAlign:"center", padding:32, color:"#5f6368", fontSize:13 }}>
                        Finding your picks…
                      </div>
                    : recs.length === 0
                    ? <div style={{ textAlign:"center", padding:32, color:"#5f6368", fontSize:13 }}>
                        No restaurants found — try increasing the radius.
                      </div>
                    : recs.map(r => (
                        <RestaurantCard key={r.name} r={r} onFeedback={handleFeedback}/>
                      ))
                  }

                  {recs.length > 0 && (
                    <motion.button whileTap={{ scale:0.97 }} onClick={handleRefresh}
                      style={{ width:"100%", padding:"12px 0", border:"1.5px solid #dadce0",
                        borderRadius:20, background:"white", color:"#3c4043",
                        fontSize:13, fontWeight:600, cursor:"pointer",
                        fontFamily:"'Google Sans',sans-serif", marginBottom:24 }}>
                      🔄 Show 3 more picks
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "you" && (
              <motion.div key="you"
                initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }}
                exit={{ opacity:0, x:-10 }} transition={{ duration:0.18 }}>
                <YouTab user={user} profile={profile} history={history}/>
              </motion.div>
            )}

            {activeTab === "pipeline" && (
              <motion.div key="pipeline"
                initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }}
                exit={{ opacity:0, x:-10 }} transition={{ duration:0.18 }}>
                <PipelineTab user={user} profile={profile}
                  weights={customWeights} prefLabel={prefLabel}/>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <Toast msg={toastMsg}/>
    </div>
    </div>
  );
}
