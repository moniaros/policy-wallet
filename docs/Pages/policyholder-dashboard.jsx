import { useState, useEffect } from "react";
import {
  LayoutDashboard, CreditCard, FileText, Users, Settings,
  Bell, ChevronDown, ChevronRight, ChevronUp, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, TrendingUp,
  Car, Heart, Building2, PawPrint, Shield,
  AlertTriangle, Sparkles, Check, X, Upload,
  Phone, Share2, RefreshCw, Brain, Clock,
  HelpCircle, LogOut, Search, Plus, Zap,
  Activity, Eye, ChevronLeft
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid
} from "recharts";

// ─── ARC (joinarc.com) DESIGN SYSTEM ──────────────────────────────────────
// Deep navy sidebar + white content + teal accent
// Font: Inter (Fallback for GT America) — Arc's clean geometric sans
// Aesthetic: SaaS Enterprise — data-dense, trustworthy, professional
const T = {
  // Sidebar — deep navy-black (Arc's signature)
  nav: "#000000",
  navHov: "#111111",
  navAct: "#1A1A1A",
  navBrd: "rgba(255, 255, 255, 0.1)",
  navMuted: "#888888",
  navText: "#CCCCCC",
  navActText: "#FFFFFF",
  navActIc: "#1FDC86",   // Arc Primary Green

  // Content surfaces
  bg: "#F9FAFB",
  card: "#FFFFFF",
  cardHov: "#FAFAFA",

  // Borders
  brd: "#E5E7EB",
  brdLight: "#F3F4F6",
  brdFocus: "#1FDC86",

  // Typography
  ink: "#000000",
  ink2: "#111827",
  ink3: "#374151",
  ink4: "#6B7280",
  ink5: "#9CA3AF",

  // Arc Green — primary CTA & positive values ONLY
  teal: "#1FDC86",
  tealD: "#19B870",
  tealDk: "#0F7A4F",
  tealBg: "#E8FAED", // Subtle light green for backgrounds

  // Gray/Neutral — secondary accent (replacing liberal use of teal)
  grayAccent: "#F3F4F6",
  grayDk: "#4B5563",

  // Status
  blue: "#3B82F6",
  blueL: "#EFF6FF",
  blueDk: "#1E40AF",
  amber: "#F59E0B",
  amberL: "#FFFBEB",
  amberDk: "#78350F",
  red: "#EF4444",
  redL: "#FEF2F2",
  redDk: "#7F1D1D",
  purple: "#8B5CF6",
  purpleL: "#F5F3FF",
};

const FONT = "'Inter', ui-sans-serif, system-ui, sans-serif";

// Inject required global styles for hovers and custom scrollbars to maintain the Arc aesthetic
const customStyles = `
  .arc-hover { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  .arc-hover:hover { background-color: ${T.bg}; cursor: pointer; }
  .arc-btn { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  .arc-btn:hover { filter: brightness(0.95); transform: translateY(-1px); }
  .arc-card { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  .arc-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); border-color: ${T.brdLight}; }
  
  /* Scrollbar override for cleaner UI */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
`;

// ─── DATA ──────────────────────────────────────────────────────────────────
const POLICIES = [
  {
    id: 1, type: "Motor", name: "Car Insurance", insurer: "Interamerican",
    number: "MTR-2024-1234", status: "expiring", expires: "15 Mar 2026", daysLeft: 18,
    premium: 340, Ic: Car, color: T.blue, bg: T.blueL, analyzing: false,
  },
  {
    id: 2, type: "Health", name: "Health Plan", insurer: "Generali",
    number: "HLT-2024-5678", status: "active", expires: "1 Jan 2027", daysLeft: 310,
    premium: 890, Ic: Heart, color: T.tealDk, bg: T.tealBg, analyzing: false,
  },
  {
    id: 3, type: "Home", name: "Home Insurance", insurer: "AXA",
    number: "HOM-2024-9012", status: "active", expires: "20 Jun 2026", daysLeft: 115,
    premium: 210, Ic: Building2, color: T.amber, bg: T.amberL, analyzing: false,
  },
  {
    id: 4, type: "Pet", name: "Pet Insurance", insurer: "ERGO",
    number: "PET-2024-3456", status: "analyzing", expires: "—", daysLeft: null,
    premium: 180, Ic: PawPrint, color: T.purple, bg: T.purpleL, analyzing: true, progress: 62,
  },
];

const TOTAL = 340 + 890 + 210 + 180;

const CHART_DATA = [
  { m: "Aug", v: 130 }, { m: "Sep", v: 130 }, { m: "Oct", v: 130 },
  { m: "Nov", v: 130 }, { m: "Dec", v: 130 }, { m: "Jan", v: 280 }, { m: "Feb", v: 135 },
];

const INSIGHTS = [
  { id: 1, sev: "high", tag: "Gap", title: "ENFIA deduction at risk", body: "Home policy missing Flood coverage. Add all 3 perils for €118 tax deduction.", cta: "Fix gap" },
  { id: 2, sev: "med", tag: "Saving", title: "Duplicate Roadside Assist", body: "Motor & Home both include Roadside Assist. Remove from Home to save €35/yr.", cta: "Review" },
  { id: 3, sev: "low", tag: "Benefit", title: "Annual check-up unused", body: "Generali Health — 1 free check-up/yr. Expires 31 Dec 2025. Call Συντονιστικό Κέντρο.", cta: "Book" },
  { id: 4, sev: "high", tag: "Gap", title: "Leishmania not covered", body: "ERGO Pet excludes Κάλαζαρ. Prevalent in Attica — treatment €800–2,500.", cta: "Add cover" },
];

const ACTIVITY = [
  { id: 1, color: T.blue, label: "Agent uploaded Green Card", sub: "Motor · Interamerican", time: "2h ago" },
  { id: 2, color: T.teal, label: "AI extraction started", sub: "Pet Insurance · ERGO", time: "5h ago" },
  { id: 3, color: T.amber, label: "Renewal reminder sent", sub: "Motor · 18 days left", time: "Yesterday" },
  { id: 4, color: T.tealDk, label: "Portfolio shared with agent", sub: "4 policies shared", time: "3 days ago" },
  { id: 5, color: T.ink4, label: "Home document uploaded", sub: "AXA · HOM-2024-9012", time: "5 days ago" },
];

// ─── ATOMS ─────────────────────────────────────────────────────────────────
const StatusBadge = ({ s }) => {
  const cfg = {
    active: { bg: "#EDFFF6", tc: "#0F7A4F", dot: T.teal, txt: "Active" },
    expiring: { bg: "#FFFBEB", tc: "#92400E", dot: T.amber, txt: "Expiring" },
    expired: { bg: "#FEF2F2", tc: "#991B1B", dot: T.red, txt: "Expired" },
    analyzing: { bg: "#EFF6FF", tc: "#1E40AF", dot: T.blue, txt: "Analysing" },
  };
  const c = cfg[s] || cfg.active;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: c.bg, color: c.tc,
      fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 4,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot }} />
      {c.txt}
    </span>
  );
};

function Divider({ mx = 0 }) {
  return <div style={{ height: 1, background: T.brd, margin: mx ? `0 ${mx}px` : 0 }} />;
}

const Num = ({ n, style }) => (
  <span style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", ...style }}>{n}</span>
);

// ─── SIDEBAR ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "home", label: "Dashboard", Ic: LayoutDashboard },
  { id: "wallet", label: "My Wallet", Ic: CreditCard },
  { id: "docs", label: "Documents", Ic: FileText },
  { id: "agent", label: "My Agent", Ic: Users },
  { id: "settings", label: "Settings", Ic: Settings },
];

function Sidebar({ active, onNav }) {
  return (
    <div style={{
      width: 220, flexShrink: 0,
      background: T.nav,
      borderRight: `1px solid ${T.navBrd}`,
      display: "flex", flexDirection: "column",
      height: "100%",
      fontFamily: FONT,
    }}>
      {/* Logo */}
      <div style={{
        padding: "22px 20px 16px",
        borderBottom: `1px solid ${T.navBrd}`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 30, height: 30,
          background: `linear-gradient(135deg, ${T.teal}, ${T.tealD})`,
          borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Shield size={15} color={T.nav} strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#EEF4FB", letterSpacing: "-0.02em" }}>
            PolicyWallet
          </div>
          <div style={{ fontSize: 10, color: T.navMuted, marginTop: 1 }}>Personal</div>
        </div>
      </div>

      {/* User */}
      <div style={{
        margin: "12px 12px 4px",
        background: T.navAct, borderRadius: 9,
        border: `1px solid ${T.navBrd}`,
        padding: "10px 12px",
        display: "flex", alignItems: "center", gap: 9,
        cursor: "pointer",
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: `linear-gradient(135deg, #1A3A5C, #0F2A46)`,
          border: `1.5px solid ${T.navActIc}30`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: T.navActIc }}>ΝΠ</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: T.navActText,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
          }}>
            Νίκος Παπαδόπουλος
          </div>
          <div style={{ fontSize: 10, color: T.navMuted }}>Essential Plan</div>
        </div>
        <ChevronDown size={13} color={T.navMuted} strokeWidth={1.5} />
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
        {NAV_ITEMS.map(({ id, label, Ic }) => {
          const on = active === id;
          return (
            <button key={id} onClick={() => onNav(id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 18px",
              background: on ? T.navAct : "transparent",
              border: "none",
              borderLeft: `2px solid ${on ? T.navActIc : "transparent"}`,
              cursor: "pointer", textAlign: "left",
              transition: "all 0.12s",
            }}>
              <Ic
                size={15}
                color={on ? T.navActIc : T.navMuted}
                strokeWidth={on ? 2 : 1.5}
              />
              <span style={{
                fontSize: 13, fontWeight: on ? 600 : 400,
                color: on ? T.navActText : T.navText,
              }}>{label}</span>
              {id === "wallet" && (
                <span style={{
                  marginLeft: "auto", fontSize: 10, fontWeight: 700,
                  background: `${T.amber}22`, color: T.amber,
                  padding: "1px 6px", borderRadius: 3,
                }}>1</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Score widget in sidebar */}
      <div style={{
        margin: "0 12px 12px",
        background: T.navAct, borderRadius: 10,
        border: `1px solid ${T.navBrd}`,
        padding: "16px",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: T.navMuted,
          textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8
        }}>
          Coverage Score
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 12 }}>
          <span style={{
            fontSize: 36, fontWeight: 700, color: T.navActText,
            letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums"
          }}>
            72
          </span>
          <span style={{ fontSize: 14, color: T.navMuted, marginBottom: 4 }}>/100</span>
        </div>
        <div style={{ background: T.navBrd, borderRadius: 999, height: 6, overflow: "hidden" }}>
          <div style={{
            width: "72%", height: "100%",
            background: `linear-gradient(90deg, ${T.teal}, ${T.tealD})`,
            borderRadius: 999,
          }} />
        </div>
        <div style={{ fontSize: 10, color: T.navMuted, marginTop: 8 }}>
          2 gaps · €35 saving opportunity
        </div>
      </div>

      <Divider />

      {/* Bottom */}
      <div style={{ padding: "8px 0" }}>
        {[{ Ic: HelpCircle, l: "Help & Support" }, { Ic: LogOut, l: "Sign Out" }].map(({ Ic, l }) => (
          <button key={l} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "9px 18px", background: "none", border: "none",
            cursor: "pointer", textAlign: "left",
          }}>
            <Ic size={14} color={T.navMuted} strokeWidth={1.5} />
            <span style={{ fontSize: 13, color: T.navText }}>{l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── TOPBAR ────────────────────────────────────────────────────────────────
function TopBar({ tab }) {
  const labels = {
    home: "Dashboard", wallet: "My Wallet", docs: "Documents",
    agent: "My Agent", settings: "Settings",
  };
  return (
    <div style={{
      height: 72,
      background: T.card,
      borderBottom: `1px solid ${T.brd}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 32px", flexShrink: 0,
      fontFamily: FONT,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{labels[tab] || "Dashboard"}</div>
        <div style={{
          width: 1, height: 18, background: T.brd, margin: "0 4px",
        }} />
        <div style={{ fontSize: 13, color: T.ink4, fontWeight: 500 }}>Feb 25, 2026</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: T.bg, border: `1px solid ${T.brd}`,
          borderRadius: 7, padding: "6px 12px", minWidth: 180,
        }}>
          <Search size={13} color={T.ink4} strokeWidth={1.5} />
          <span style={{ fontSize: 12, color: T.ink4 }}>Search policies…</span>
        </div>
        {/* Upload CTA */}
        <button className="arc-btn" style={{
          display: "flex", alignItems: "center", gap: 8,
          background: T.teal,
          color: T.nav,
          border: "none", borderRadius: 9999, /* Pill shaped like Arc */
          padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          boxShadow: `0 4px 6px -1px rgba(31, 220, 134, 0.2), 0 2px 4px -1px rgba(31, 220, 134, 0.1)`,
        }}>
          Upload Policy <ArrowUpRight size={14} strokeWidth={2.5} />
        </button>
        {/* Bell */}
        <div style={{ position: "relative" }}>
          <button style={{
            width: 36, height: 36,
            background: T.bg, border: `1px solid ${T.brd}`,
            borderRadius: 7, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer",
          }}>
            <Bell size={15} color={T.ink3} strokeWidth={1.5} />
          </button>
          <div style={{
            position: "absolute", top: 8, right: 8,
            width: 7, height: 7, background: T.red,
            borderRadius: "50%", border: "2px solid white",
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── KPI STRIP ─────────────────────────────────────────────────────────────
function KpiStrip() {
  const kpis = [
    {
      label: "Annual Premium",
      value: `€${TOTAL.toLocaleString()}`,
      sub: "4 policies · 1 expiring",
      trend: null,
      Ic: CreditCard, icBg: `${T.teal}18`, icColor: T.tealDk,
    },
    {
      label: "Coverage Score",
      value: "72",
      unit: "/100",
      sub: "Good · 2 gaps detected",
      trend: "warn",
      Ic: Shield, icBg: `${T.amber}18`, icColor: T.amber,
    },
    {
      label: "Next Renewal",
      value: "18",
      unit: " days",
      sub: "Motor · Interamerican",
      trend: "urgent",
      Ic: Clock, icBg: `${T.red}12`, icColor: T.red,
    },
    {
      label: "Savings Identified",
      value: "€35",
      unit: "/yr",
      sub: "Duplicate coverage found",
      trend: "up",
      Ic: Zap, icBg: `${T.teal}18`, icColor: T.tealDk,
    },
  ];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
      background: T.card, borderBottom: `1px solid ${T.brd}`,
    }}>
      {kpis.map((k, i) => (
        <div key={k.label} style={{
          padding: "22px 24px",
          borderRight: i < 3 ? `1px solid ${T.brd}` : undefined,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{
              fontSize: 12, fontWeight: 600, color: T.ink3,
              textTransform: "none", letterSpacing: "-0.01em",
            }}>
              {k.label}
            </span>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: k.icBg,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <k.Ic size={18} color={k.icColor} strokeWidth={1.5} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 8 }}>
            <Num n={k.value} style={{ fontSize: 32, fontWeight: 700, color: T.ink, letterSpacing: "-0.03em" }} />
            {k.unit && <span style={{ fontSize: 16, fontWeight: 500, color: T.ink3 }}>{k.unit}</span>}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {k.trend === "up" && <ArrowUpRight size={13} color={T.tealDk} strokeWidth={2} />}
            {k.trend === "warn" && <ArrowDownRight size={13} color={T.amber} strokeWidth={2} />}
            {k.trend === "urgent" && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: "1px 5px",
                background: T.redL, color: T.red, borderRadius: 3,
              }}>URGENT</span>
            )}
            <span style={{
              fontSize: 11, color: k.trend === "urgent" ? T.red : T.ink4,
              fontWeight: k.trend === "urgent" ? 600 : 400,
            }}>{k.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── POLICY TABLE ──────────────────────────────────────────────────────────
const COL = "28px 2.2fr 1.2fr 1.1fr 0.9fr 100px 44px";

function PolicyTable() {
  const [exp, setExp] = useState(null);

  return (
    <div style={{ background: T.card }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "24px 32px 16px",
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>My Policies</div>
          <div style={{ fontSize: 12, color: T.ink4, marginTop: 4 }}>4 policies · 1 expiring soon</div>
        </div>
        <button className="arc-btn" style={{
          fontSize: 13, color: T.ink2, fontWeight: 600,
          background: T.card, border: `1px solid ${T.brd}`,
          borderRadius: 9999, padding: "8px 16px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          View all <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>
      <Divider />

      {/* Col heads */}
      <div style={{
        display: "grid", gridTemplateColumns: COL,
        padding: "7px 24px", background: T.bg,
        alignItems: "center", gap: 12,
      }}>
        {["", "Policy", "Insurer", "Expires", "Premium", "Status", ""].map((h, i) => (
          <div key={i} style={{
            fontSize: 10, fontWeight: 700, color: T.ink4,
            textTransform: "uppercase", letterSpacing: "0.07em",
          }}>{h}</div>
        ))}
      </div>
      <Divider />

      {POLICIES.map((p, i) => (
        <div key={p.id}>
          {/* Row */}
          <div
            className="arc-hover"
            onClick={() => setExp(exp === p.id ? null : p.id)}
            style={{
              display: "grid", gridTemplateColumns: COL,
              padding: "16px 32px", alignItems: "center", gap: 16,
              background: exp === p.id ? T.bg : undefined,
            }}
          >
            {/* Icon */}
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: p.bg,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {p.analyzing
                ? <Brain size={13} color={T.blue} strokeWidth={1.5} />
                : <p.Ic size={13} color={p.color} strokeWidth={1.5} />
              }
            </div>

            {/* Name */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{p.name}</div>
              <div style={{ fontSize: 11, color: T.ink4, marginTop: 1 }}>{p.number}</div>
            </div>

            {/* Insurer */}
            <div style={{ fontSize: 13, color: T.ink2 }}>{p.insurer}</div>

            {/* Expires */}
            <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
              <span style={{
                color: p.daysLeft && p.daysLeft <= 30 ? T.red : T.ink2,
                fontWeight: p.daysLeft && p.daysLeft <= 30 ? 600 : 400,
              }}>
                {p.expires}
              </span>
              {p.daysLeft && p.daysLeft <= 30 && (
                <span style={{
                  display: "inline-block", marginLeft: 6,
                  fontSize: 10, fontWeight: 700,
                  background: T.redL, color: T.red,
                  padding: "1px 5px", borderRadius: 3,
                }}>{p.daysLeft}d</span>
              )}
            </div>

            {/* Premium */}
            <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: T.ink2 }}>
              {p.analyzing ? "—" : `€${p.premium}`}
            </div>

            {/* Status */}
            <StatusBadge s={p.status} />

            {/* Arrow */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <ChevronDown
                size={14} color={T.ink4} strokeWidth={1.5}
                style={{ transform: exp === p.id ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
              />
            </div>
          </div>

          {/* Expanded: analyzing */}
          {exp === p.id && p.analyzing && (
            <div style={{
              padding: "12px 24px 16px 68px",
              background: "#F0F7FF",
              borderTop: `1px solid ${T.brdLight}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Brain size={13} color={T.blue} strokeWidth={1.5} />
                <span style={{ fontSize: 12, fontWeight: 600, color: T.blue }}>
                  Extracting coverage data… {p.progress}%
                </span>
              </div>
              <div style={{ background: T.ink5, borderRadius: 999, height: 4, overflow: "hidden", maxWidth: 320 }}>
                <div style={{
                  background: T.blue, height: "100%", borderRadius: 999,
                  width: `${p.progress}%`, transition: "width 0.5s",
                }} />
              </div>
              <div style={{ fontSize: 11, color: T.ink4, marginTop: 6 }}>Results ready in ~40 seconds</div>
            </div>
          )}

          {/* Expanded: normal */}
          {exp === p.id && !p.analyzing && (
            <div style={{
              padding: "12px 24px 16px 68px",
              background: T.bg,
              borderTop: `1px solid ${T.brdLight}`,
            }}>
              <div style={{ display: "flex", gap: 28, marginBottom: 16, flexWrap: "wrap" }}>
                {[["Type", p.type], ["Insurer", p.insurer], ["Number", p.number], ["Expires", p.expires], ["Premium", `€${p.premium}/yr`]].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 11, color: T.ink4, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, fontWeight: 600 }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <button className="arc-btn" style={{ fontSize: 12, fontWeight: 600, color: T.ink2, background: T.card, border: `1px solid ${T.brd}`, borderRadius: 999, padding: "8px 16px", cursor: "pointer" }}>
                  View Policy
                </button>
                <button className="arc-btn" style={{ fontSize: 12, fontWeight: 600, color: T.ink2, background: T.card, border: `1px solid ${T.brd}`, borderRadius: 999, padding: "8px 16px", cursor: "pointer" }}>
                  Upload Document
                </button>
                {p.status === "expiring" && (
                  <button className="arc-btn" style={{ fontSize: 12, fontWeight: 700, color: "white", background: T.red, border: "none", borderRadius: 999, padding: "8px 20px", cursor: "pointer" }}>
                    Renew Now <ArrowUpRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
                  </button>
                )}
              </div>
            </div>
          )}

          {i < POLICIES.length - 1 && <Divider />}
        </div>
      ))}
    </div>
  );
}

// ─── AI INSIGHTS ───────────────────────────────────────────────────────────
function Insights() {
  const [gone, setGone] = useState([]);
  const visible = INSIGHTS.filter(i => !gone.includes(i.id));

  const tagCfg = {
    Gap: { bg: T.redL, tc: T.redDk },
    Saving: { bg: T.tealBg, tc: T.tealDk },
    Benefit: { bg: T.blueL, tc: T.blueDk },
  };
  const sevColor = { high: T.red, med: T.amber, low: T.blue };

  return (
    <div style={{ background: T.card, borderTop: `1px solid ${T.brd}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 32px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: T.grayAccent,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles size={16} color={T.ink3} strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>AI Insights</div>
            <div style={{ fontSize: 12, color: T.ink4, marginTop: 2 }}>{visible.length} active · PolicyWallet AI</div>
          </div>
        </div>
        {visible.length > 0 && (
          <button
            onClick={() => setGone(INSIGHTS.map(i => i.id))}
            style={{ fontSize: 11, color: T.ink4, background: "none", border: `1px solid ${T.brd}`, borderRadius: 5, padding: "4px 10px", cursor: "pointer" }}
          >
            Clear all
          </button>
        )}
      </div>
      <Divider />

      {visible.length === 0 && (
        <div style={{ padding: "28px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.tealBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={14} color={T.tealDk} strokeWidth={2} />
          </div>
          <span style={{ fontSize: 13, color: T.ink3 }}>No active insights — your portfolio is clean.</span>
        </div>
      )}

      {visible.map((ins, i) => {
        const tc = tagCfg[ins.tag] || tagCfg.Benefit;
        const dot = sevColor[ins.sev];
        return (
          <div key={ins.id}>
            <div style={{ padding: "14px 24px", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0, marginTop: 4 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{ins.title}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3,
                    background: tc.bg, color: tc.tc,
                  }}>{ins.tag}</span>
                </div>
                <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.55, marginBottom: 9 }}>{ins.body}</div>
                <div style={{ display: "flex", gap: 7 }}>
                  <button style={{
                    fontSize: 11, fontWeight: 700, color: T.nav,
                    background: `linear-gradient(135deg,${T.teal},${T.tealD})`,
                    border: "none", borderRadius: 5, padding: "5px 12px", cursor: "pointer",
                  }}>{ins.cta}</button>
                  <button onClick={() => setGone(g => [...g, ins.id])} style={{
                    fontSize: 11, color: T.ink4, background: "none",
                    border: `1px solid ${T.brd}`, borderRadius: 5, padding: "5px 10px", cursor: "pointer",
                  }}>Dismiss</button>
                </div>
              </div>
              <button onClick={() => setGone(g => [...g, ins.id])} style={{ background: "none", border: "none", cursor: "pointer", color: T.ink5, padding: 2, flexShrink: 0 }}>
                <X size={13} strokeWidth={1.5} />
              </button>
            </div>
            {i < visible.length - 1 && <Divider mx={24} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── PREMIUM CHART ─────────────────────────────────────────────────────────
function PremiumChart() {
  return (
    <div style={{ background: T.card }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 32px 16px" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>Monthly Premiums</div>
          <div style={{ fontSize: 12, color: T.ink4, marginTop: 4 }}>Last 7 months</div>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 600,
          background: T.grayAccent, color: T.ink2,
          padding: "4px 12px", borderRadius: 999,
          border: `1px solid ${T.brdLight}`,
        }}>
          Avg €134/mo
        </span>
      </div>
      <Divider />
      <div style={{ padding: "14px 24px 20px" }}>
        <div style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={CHART_DATA} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.teal} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={T.teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.brdLight} vertical={false} />
              <XAxis dataKey="m" tick={{ fontSize: 10, fill: T.ink4, fontFamily: FONT }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: T.ink4, fontFamily: FONT }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
              <Tooltip
                formatter={v => [`€${v}`, "Premium"]}
                contentStyle={{
                  fontSize: 11, fontFamily: FONT, borderRadius: 7,
                  border: `1px solid ${T.brd}`,
                  background: T.card, color: T.ink,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                }}
              />
              <Area
                type="monotone" dataKey="v"
                stroke={T.tealD} strokeWidth={2}
                fill="url(#tealGrad)"
                dot={false}
                activeDot={{ r: 4, fill: T.tealD, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.brdLight}` }}>
          {[["Avg/mo", "€134"], ["Jan spike", "Renewal"], ["YTD total", "€1,113"], ["Saving found", "€35/yr"]].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 10, color: T.ink4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── COVERAGE SUMMARY ──────────────────────────────────────────────────────
function CoverageTable() {
  return (
    <div style={{ background: T.card, borderTop: `1px solid ${T.brd}` }}>
      <div style={{ padding: "24px 32px 16px" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>Coverage Summary</div>
        <div style={{ fontSize: 12, color: T.ink4, marginTop: 4 }}>What's protected · what's not</div>
      </div>
      <Divider />
      {/* Score */}
      <div style={{ padding: "14px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: T.ink3 }}>Overall protection score</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>72 / 100</span>
        </div>
        <div style={{ background: T.bg, borderRadius: 999, height: 6, overflow: "hidden" }}>
          <div style={{
            width: "72%", height: "100%",
            background: `linear-gradient(90deg,${T.teal},${T.tealD})`,
            borderRadius: 999,
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
          <span style={{ fontSize: 10, color: T.ink4 }}>2 coverage gaps identified</span>
          <span style={{ fontSize: 10, color: T.tealDk, fontWeight: 600 }}>↑ 5pts this month</span>
        </div>
      </div>
      <Divider mx={24} />
      {/* LoB rows */}
      {POLICIES.map((p, i) => (
        <div key={p.id}>
          <div className="arc-hover" style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 32px" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: p.bg,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <p.Ic size={16} color={p.color} strokeWidth={1.5} />
            </div>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: T.ink }}>{p.type}</span>
            <span style={{ fontSize: 13, color: T.ink3, fontVariantNumeric: "tabular-nums", minWidth: 70, textAlign: "right" }}>
              {p.analyzing ? "…" : `€${p.premium}/yr`}
            </span>
            <StatusBadge s={p.status} />
          </div>
          {i < POLICIES.length - 1 && <Divider mx={32} />}
        </div>
      ))}
    </div>
  );
}

// ─── AGENT ROW ─────────────────────────────────────────────────────────────
function AgentRow({ onNav }) {
  return (
    <div style={{ background: T.card, borderTop: `1px solid ${T.brd}` }}>
      <div style={{ padding: "24px 32px 16px" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>Agent</div>
      </div>
      <Divider />
      <div className="arc-hover" style={{ padding: "16px 32px", display: "flex", alignItems: "center", gap: 16 }} onClick={() => onNav("agent")}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: T.grayAccent,
            border: `1px solid ${T.brdLight}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>ΓΠ</span>
          </div>
          <div style={{
            position: "absolute", bottom: 1, right: 1,
            width: 12, height: 12, background: T.teal,
            borderRadius: "50%", border: "2px solid white",
          }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Γιώργος Παπαδόπουλος</span>
            <span style={{ fontSize: 11, fontWeight: 600, background: T.tealBg, color: T.tealDk, padding: "2px 8px", borderRadius: 999 }}>Connected</span>
          </div>
          <div style={{ fontSize: 12, color: T.ink4, marginTop: 2 }}>4 policies shared · Active 2h ago</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="arc-btn" style={{ fontSize: 12, fontWeight: 600, color: T.ink2, background: T.card, border: `1px solid ${T.brd}`, borderRadius: 999, padding: "6px 14px", cursor: "pointer" }}>Message</button>
          <button className="arc-btn" style={{ fontSize: 12, fontWeight: 600, color: T.ink2, background: T.card, border: `1px solid ${T.brd}`, borderRadius: 999, padding: "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <Phone size={13} strokeWidth={1.5} />Call
          </button>
        </div>
        <ChevronRight size={16} color={T.ink5} strokeWidth={1.5} />
      </div>
      <Divider />
      {/* Health alert strip */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 24px",
        background: "#FFFCEB",
      }}>
        <AlertTriangle size={13} color={T.amber} strokeWidth={1.5} style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.amberDk }}>Unused benefit: </span>
          <span style={{ fontSize: 12, color: T.ink2 }}>Annual check-up expires 31 Dec 2025. Call your Συντονιστικό Κέντρο — fully covered by Generali.</span>
        </div>
        <button style={{
          fontSize: 11, fontWeight: 700, color: "white",
          background: T.amber, border: "none",
          borderRadius: 5, padding: "4px 12px", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
        }}>Book</button>
      </div>
    </div>
  );
}

// ─── ACTIVITY ──────────────────────────────────────────────────────────────
function ActivityFeed() {
  return (
    <div style={{ background: T.card, borderTop: `1px solid ${T.brd}` }}>
      <div style={{ padding: "24px 32px 16px" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>Activity</div>
      </div>
      <Divider />
      {ACTIVITY.map((a, i) => (
        <div key={a.id}>
          <div className="arc-hover" style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 32px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, flexShrink: 0, marginTop: 6 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: T.ink2 }}>{a.label}</div>
              <div style={{ fontSize: 12, color: T.ink4, marginTop: 2 }}>{a.sub}</div>
            </div>
            <div style={{ fontSize: 12, color: T.ink4, whiteSpace: "nowrap" }}>{a.time}</div>
          </div>
          {i < ACTIVITY.length - 1 && <Divider mx={24} />}
        </div>
      ))}
    </div>
  );
}

// ─── RIGHT PANEL ───────────────────────────────────────────────────────────
function RightPanel({ onNav }) {
  return (
    <div style={{
      width: 280, flexShrink: 0,
      borderLeft: `1px solid ${T.brd}`,
      background: T.card,
      overflowY: "auto",
      fontFamily: FONT,
    }}>
      {/* Urgent renewal */}
      <div style={{
        padding: "14px 16px",
        background: T.redL,
        borderBottom: `1px solid #FECACA`,
      }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <AlertTriangle size={14} color={T.red} strokeWidth={1.5} style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.redDk }}>Motor renews in 18 days</div>
            <div style={{ fontSize: 11, color: "#B91C1C", marginTop: 2 }}>Interamerican · €340/yr · 15 Mar 2026</div>
          </div>
        </div>
        <button style={{
          width: "100%", marginTop: 10,
          background: T.red, color: "white",
          border: "none", borderRadius: 6, padding: "8px",
          fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>Renew Motor Policy</button>
      </div>

      {/* Quick actions */}
      <div style={{ padding: "24px", borderBottom: `1px solid ${T.brd}` }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: T.ink4,
          textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16
        }}>
          Quick Actions
        </div>
        {[
          { l: "Upload Policy Document", Ic: Upload },
          { l: "Share with Agent", Ic: Share2 },
          { l: "Renew Motor Policy", Ic: RefreshCw },
          { l: "View Documents", Ic: FileText },
          { l: "Book Check-up", Ic: Heart },
        ].map(({ l, Ic }) => (
          <div key={l} className="arc-hover" style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px",
            margin: "0 -12px", borderRadius: "8px",
          }}>
            <Ic size={16} color={T.ink3} strokeWidth={1.5} />
            <span style={{ flex: 1, fontSize: 14, color: T.ink2, fontWeight: 500 }}>{l}</span>
            <ChevronRight size={14} color={T.ink5} strokeWidth={1.5} />
          </div>
        ))}
      </div>

      {/* Renewals list */}
      <div style={{ padding: "24px", borderBottom: `1px solid ${T.brd}` }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: T.ink4,
          textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16
        }}>
          Upcoming Renewals
        </div>
        {POLICIES.filter(p => p.daysLeft).sort((a, b) => a.daysLeft - b.daysLeft).map((p, i, arr) => (
          <div key={p.id}>
            <div className="arc-hover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", margin: "0 -12px", borderRadius: "8px" }}>
              <div style={{
                width: 32, height: 32, borderRadius: 6, background: p.bg,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <p.Ic size={16} color={p.color} strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{p.type}</div>
                <div style={{ fontSize: 12, color: T.ink4 }}>{p.insurer}</div>
              </div>
              <div style={{
                fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                color: p.daysLeft <= 30 ? T.red : T.ink3,
                textAlign: "right",
              }}>
                {p.daysLeft}<span style={{ fontSize: 12, fontWeight: 500, color: T.ink4 }}>d</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI widget */}
      <div style={{ padding: "24px" }}>
        <div style={{
          background: T.nav,
          borderRadius: 16, padding: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: T.grayAccent,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={16} color={T.ink} strokeWidth={1.5} />
            </div>
            <span style={{
              fontSize: 12, fontWeight: 700, color: T.navActText,
              textTransform: "uppercase", letterSpacing: "0.05em"
            }}>AI Analysis</span>
          </div>
          <div style={{ fontSize: 13, color: T.navText, lineHeight: 1.6, marginBottom: 16 }}>
            4 insights identified across your policies. 2 coverage gaps and €35/yr in potential savings.
          </div>
          <button className="arc-btn" style={{
            width: "100%",
            background: T.grayAccent,
            color: T.ink, borderRadius: 999, padding: "10px",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            border: "none",
            fontFamily: FONT,
          }}>
            Review All Insights <ArrowUpRight size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════════════════════════════════
export default function PolicyholderDashboard() {
  const [tab, setTab] = useState("home");

  // Load Inter Font (Arc Fallback) and apply global styles
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);

    // Inject custom arc styles
    const styleEl = document.createElement("style");
    styleEl.innerHTML = customStyles;
    document.head.appendChild(styleEl);
  }, []);

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      fontFamily: FONT,
      background: T.bg,
      fontSize: 13,
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    }}>
      {/* Sidebar */}
      <Sidebar active={tab} onNav={setTab} />

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <TopBar tab={tab} />

        {tab === "home" ? (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* Central scroll */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              <KpiStrip />
              <PolicyTable />
              <Insights />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", borderTop: `1px solid ${T.brd}` }}>
                <div style={{ borderRight: `1px solid ${T.brd}` }}>
                  <PremiumChart />
                  <AgentRow onNav={setTab} />
                  <ActivityFeed />
                </div>
                <CoverageTable />
              </div>
            </div>

            {/* Right panel */}
            <RightPanel onNav={setTab} />
          </div>
        ) : (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 12, background: T.bg,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: T.card,
              border: `1px solid ${T.brd}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {tab === "wallet" && <CreditCard size={20} color={T.ink4} strokeWidth={1.5} />}
              {tab === "docs" && <FileText size={20} color={T.ink4} strokeWidth={1.5} />}
              {tab === "agent" && <Users size={20} color={T.ink4} strokeWidth={1.5} />}
              {tab === "settings" && <Settings size={20} color={T.ink4} strokeWidth={1.5} />}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink3 }}>See dedicated artifact for this screen</div>
            <button onClick={() => setTab("home")} style={{
              marginTop: 4,
              background: `linear-gradient(135deg,${T.teal},${T.tealD})`,
              color: T.nav,
              border: "none", borderRadius: 7, padding: "9px 20px",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              boxShadow: `0 2px 12px ${T.teal}40`,
              fontFamily: FONT,
            }}>← Back to Dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
}
