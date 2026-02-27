import { useState } from "react";
import {
  Home, Users, FileText, CheckSquare, MessageSquare,
  Bell, Search, Plus, ChevronRight, ChevronDown, ChevronLeft,
  Car, Heart, Building2, PawPrint, Shield, Briefcase,
  Phone, Mail, MoreVertical, Upload, Flag, Send,
  AlertTriangle, Check, X, Clock, Calendar,
  TrendingUp, TrendingDown, Filter, ArrowUpRight,
  User, Paperclip, Sparkles, RefreshCw, Eye,
  Star, BarChart2, Settings, LogOut, Menu
} from "lucide-react";

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────
const T = {
  bg:          "#F8FAFC",
  card:        "#FFFFFF",
  border:      "#E2E8F0",
  blue:        "#2563EB",
  blueDark:    "#1D4ED8",
  blueLight:   "#EFF6FF",
  blueMid:     "#BFDBFE",
  green:       "#10B981",
  greenLight:  "#ECFDF5",
  amber:       "#F59E0B",
  amberLight:  "#FFFBEB",
  red:         "#EF4444",
  redLight:    "#FEF2F2",
  purple:      "#8B5CF6",
  purpleLight: "#F5F3FF",
  t900:        "#0F172A",
  t700:        "#334155",
  t600:        "#475569",
  t400:        "#94A3B8",
  t200:        "#E2E8F0",
  t100:        "#F1F5F9",
  t50:         "#F8FAFC",
};

// ─── DATA ──────────────────────────────────────────────────────────────────
const CLIENTS = [
  {
    id: 1, name: "Νίκος Παπαδόπουλος", phone: "+30 6940 123456",
    email: "n.papadopoulos@gmail.com", status: "active", segment: "VIP",
    policies: 4, renewalIn: 12, lastActivity: "2h ago",
    tags: ["Motor","Health","Home","Life"],
    avatar: "ΝΠ", avatarBg: "#DBEAFE",
    policies_list: [
      { id: 1, type: "Motor",  name: "Car Insurance",  insurer: "Interamerican", number: "MTR-1234", expires: "15 Mar 2026", premium: "€340/yr", status: "expiring", plate: "ΑΑΑ-1234" },
      { id: 2, type: "Health", name: "Health Plan",    insurer: "Generali",      number: "HLT-5678", expires: "1 Jan 2027",  premium: "€890/yr", status: "active"   },
      { id: 3, type: "Home",   name: "Home Insurance", insurer: "AXA",           number: "HOM-9012", expires: "20 Jun 2026", premium: "€210/yr", status: "active"   },
      { id: 4, type: "Pet",    name: "Pet Insurance",  insurer: "ERGO",          number: "PET-3456", expires: "10 Sep 2025", premium: "€180/yr", status: "expired"  },
    ],
    timeline: [
      { id: 1, type: "upload",  text: "Agent uploaded updated Green Card",  time: "2h ago",  icon: Upload },
      { id: 2, type: "message", text: "You sent renewal proposal for Motor", time: "1d ago",  icon: Send   },
      { id: 3, type: "flag",    text: "Gap flagged: Missing flood coverage", time: "3d ago",  icon: Flag   },
      { id: 4, type: "call",    text: "Phone call logged — 8 minutes",      time: "1w ago",  icon: Phone  },
    ],
  },
  {
    id: 2, name: "Ελένη Κωνσταντίνου", phone: "+30 6945 654321",
    email: "eleni.k@outlook.com", status: "active", segment: "Standard",
    policies: 2, renewalIn: 34, lastActivity: "Yesterday",
    tags: ["Motor","Home"],
    avatar: "ΕΚ", avatarBg: "#D1FAE5",
    policies_list: [
      { id: 5, type: "Motor", name: "Car Insurance",  insurer: "Allianz",  number: "MTR-2345", expires: "5 Apr 2026",  premium: "€295/yr", status: "active" },
      { id: 6, type: "Home",  name: "Home Insurance", insurer: "Eurolife", number: "HOM-2346", expires: "12 Jul 2026", premium: "€185/yr", status: "active" },
    ],
    timeline: [
      { id: 5, type: "message", text: "Client shared portfolio access",   time: "Yesterday", icon: Users  },
      { id: 6, type: "upload",  text: "Home policy PDF uploaded by agent", time: "3d ago",   icon: Upload },
    ],
  },
  {
    id: 3, name: "Γιώργης Αλεξίου", phone: "+30 6955 789012",
    email: "g.alexiou@yahoo.gr", status: "lead", segment: "Lead",
    policies: 0, renewalIn: null, lastActivity: "3d ago",
    tags: [],
    avatar: "ΓΑ", avatarBg: "#FEF3C7",
    policies_list: [],
    timeline: [
      { id: 7, type: "message", text: "Inquiry via website — interested in Motor", time: "3d ago", icon: Mail },
    ],
  },
  {
    id: 4, name: "Μαρία Ανδρέου", phone: "+30 6932 345678",
    email: "m.andreaou@gmail.com", status: "active", segment: "Standard",
    policies: 3, renewalIn: 58, lastActivity: "5d ago",
    tags: ["Motor","Health","Pet"],
    avatar: "ΜΑ", avatarBg: "#EDE9FE",
    policies_list: [
      { id: 8, type: "Motor",  name: "Car Insurance", insurer: "Interamerican", number: "MTR-3456", expires: "20 May 2026", premium: "€380/yr", status: "active"   },
      { id: 9, type: "Health", name: "Health Plan",   insurer: "Cigna",         number: "HLT-3457", expires: "1 Mar 2026",  premium: "€760/yr", status: "expiring" },
      { id: 10, type: "Pet",   name: "Pet Insurance", insurer: "AXA",           number: "PET-3458", expires: "15 Aug 2026", premium: "€150/yr", status: "active"   },
    ],
    timeline: [
      { id: 8, type: "flag",   text: "Pet: Leishmania coverage gap detected", time: "5d ago", icon: Flag  },
      { id: 9, type: "upload", text: "Health policy renewal uploaded",        time: "1w ago", icon: Upload },
    ],
  },
];

const TASKS = [
  { id: 1, title: "Send Motor renewal proposal",     client: "Νίκος Παπαδόπουλος", due: "Today",     priority: "high",   type: "renewal",  done: false },
  { id: 2, title: "Request missing ID document",     client: "Ελένη Κωνσταντίνου", due: "Today",     priority: "high",   type: "document", done: false },
  { id: 3, title: "Follow up on lead inquiry",       client: "Γιώργης Αλεξίου",    due: "Tomorrow",  priority: "medium", type: "follow-up", done: false },
  { id: 4, title: "Upload updated Green Card",       client: "Νίκος Παπαδόπουλος", due: "Tomorrow",  priority: "medium", type: "document", done: false },
  { id: 5, title: "Review Health renewal options",   client: "Μαρία Ανδρέου",      due: "This week", priority: "medium", type: "renewal",  done: false },
  { id: 6, title: "Leishmania gap: follow up",       client: "Μαρία Ανδρέου",      due: "This week", priority: "low",    type: "gap",      done: false },
  { id: 7, title: "Annual portfolio review call",    client: "Ελένη Κωνσταντίνου", due: "Overdue",   priority: "high",   type: "call",     done: false },
];

const MESSAGES = [
  {
    id: 1, client: "Νίκος Παπαδόπουλος", avatar: "ΝΠ", avatarBg: "#DBEAFE",
    lastMsg: "Ευχαριστώ, θα δω την πρόταση.", time: "2h ago", unread: 2,
    thread: [
      { from: "agent",  text: "Γεια Νίκο, σου έστειλα την πρόταση για ανανέωση του Motor.", time: "Yesterday 14:30" },
      { from: "client", text: "Ευχαριστώ! Πότε λήγει ακριβώς;",                            time: "Yesterday 15:12" },
      { from: "agent",  text: "Στις 15 Μαρτίου 2026. Έχεις ακόμα 12 μέρες.",               time: "Yesterday 15:15" },
      { from: "client", text: "Ευχαριστώ, θα δω την πρόταση.",                              time: "2h ago"          },
    ],
  },
  {
    id: 2, client: "Μαρία Ανδρέου", avatar: "ΜΑ", avatarBg: "#EDE9FE",
    lastMsg: "Μπορούμε να μιλήσουμε για το pet;", time: "5d ago", unread: 0,
    thread: [
      { from: "client", text: "Καλημέρα, είδα ότι η ασφάλεια του σκύλου μου έχει κενό για Leishmania.", time: "5d ago 09:00" },
      { from: "agent",  text: "Ναι Μαρία, το εντόπισα κι εγώ. Μπορούμε να το συζητήσουμε;",           time: "5d ago 09:45" },
      { from: "client", text: "Μπορούμε να μιλήσουμε για το pet;",                                     time: "5d ago 10:00" },
    ],
  },
  {
    id: 3, client: "Ελένη Κωνσταντίνου", avatar: "ΕΚ", avatarBg: "#D1FAE5",
    lastMsg: "Εντάξει, σε περιμένω.", time: "1w ago", unread: 0,
    thread: [
      { from: "agent",  text: "Ελένη, θα ήθελα να κλείσουμε ένα σύντομο τηλεφώνημα για το Home.", time: "1w ago 11:00" },
      { from: "client", text: "Εντάξει, σε περιμένω.",                                             time: "1w ago 11:30" },
    ],
  },
];

const RENEWALS_BOARD = {
  "90 days": [
    { id: 1, client: "Μαρία Ανδρέου",      type: "Health", insurer: "Cigna",    expires: "1 Mar 2026",  premium: "€760" },
    { id: 2, client: "Ελένη Κωνσταντίνου", type: "Motor",  insurer: "Allianz",  expires: "5 Apr 2026",  premium: "€295" },
  ],
  "60 days": [
    { id: 3, client: "Ελένη Κωνσταντίνου", type: "Home",  insurer: "Eurolife",       expires: "12 Jul 2026", premium: "€185" },
    { id: 4, client: "Μαρία Ανδρέου",      type: "Motor", insurer: "Interamerican",  expires: "20 May 2026", premium: "€380" },
  ],
  "30 days": [
    { id: 5, client: "Νίκος Παπαδόπουλος", type: "Motor", insurer: "Interamerican", expires: "15 Mar 2026", premium: "€340" },
  ],
  "7 days": [],
};

// ─── SHARED ATOMS ──────────────────────────────────────────────────────────
const Avatar = ({ initials, bg, size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: bg || "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: size * 0.33, fontWeight: 700, color: T.t700 }}>
    {initials}
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    active:   { bg: T.greenLight, text: "#065F46", border: "#A7F3D0", label: "Active"    },
    expiring: { bg: T.amberLight, text: "#92400E", border: "#FCD34D", label: "Expiring"  },
    expired:  { bg: T.redLight,   text: "#991B1B", border: "#FCA5A5", label: "Expired"   },
    lead:     { bg: T.purpleLight,text: "#5B21B6", border: "#DDD6FE", label: "Lead"      },
    vip:      { bg: "#FFF7ED",    text: "#C2410C", border: "#FED7AA", label: "VIP"       },
  };
  const s = map[status?.toLowerCase()] || map.active;
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.03em" }}>
      {s.label}
    </span>
  );
};

const PolicyIcon = ({ type, size = 36 }) => {
  const map = {
    Motor:  { Icon: Car,       color: "#2563EB", bg: T.blueLight  },
    Health: { Icon: Heart,     color: T.green,   bg: T.greenLight  },
    Home:   { Icon: Building2, color: T.amber,   bg: T.amberLight  },
    Pet:    { Icon: PawPrint,  color: T.purple,  bg: T.purpleLight },
    Life:   { Icon: Shield,    color: "#0EA5E9", bg: "#F0F9FF"     },
  };
  const { Icon, color, bg } = map[type] || map.Motor;
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.27, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={size * 0.5} color={color} strokeWidth={1.5} />
    </div>
  );
};

const PriorityDot = ({ priority }) => {
  const c = priority === "high" ? T.red : priority === "medium" ? T.amber : T.t400;
  return <div style={{ width: 7, height: 7, borderRadius: "50%", background: c, flexShrink: 0, marginTop: 1 }} />;
};

const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden", ...style }}>
    {children}
  </div>
);

const Btn = ({ children, variant = "primary", onClick, style, size = "md" }) => {
  const pad = size === "sm" ? "6px 12px" : "9px 18px";
  const fs  = size === "sm" ? 12 : 13;
  const variants = {
    primary:   { background: T.blue,      color: "white",  border: "none",                     borderRadius: 10 },
    secondary: { background: T.card,      color: T.t700,   border: `1px solid ${T.border}`,    borderRadius: 10 },
    ghost:     { background: "transparent", color: T.blue, border: "none",                     borderRadius: 10 },
    danger:    { background: T.redLight,   color: T.red,   border: `1px solid #FCA5A5`,         borderRadius: 10 },
    success:   { background: T.greenLight, color: "#065F46", border: `1px solid #A7F3D0`,       borderRadius: 10 },
  };
  return (
    <button onClick={onClick} style={{ ...variants[variant], padding: pad, fontSize: fs, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, ...style }}>
      {children}
    </button>
  );
};

const SectionHeader = ({ title, action, onAction }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
    <div style={{ fontSize: 14, fontWeight: 700, color: T.t900 }}>{title}</div>
    {action && <button onClick={onAction} style={{ fontSize: 12, color: T.blue, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>{action}</button>}
  </div>
);

// ─── TOP NAV ──────────────────────────────────────────────────────────────
const TopNav = ({ onNotif }) => (
  <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "0 20px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 30, height: 30, background: T.blue, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Shield size={16} color="white" strokeWidth={2} />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.t900, letterSpacing: "-0.02em" }}>PolicyWallet</div>
        <div style={{ fontSize: 10, color: T.green, fontWeight: 600, marginTop: -1 }}>● Agent Portal</div>
      </div>
    </div>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div style={{ position: "relative" }}>
        <button onClick={onNotif} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Bell size={16} color={T.t600} strokeWidth={1.5} />
        </button>
        <div style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, background: T.red, borderRadius: "50%", border: "2px solid white" }} />
      </div>
      <Avatar initials="ΓΠ" bg="#DBEAFE" size={34} />
    </div>
  </div>
);

// ─── BOTTOM NAV ──────────────────────────────────────────────────────────
const BottomNav = ({ active, onTab }) => {
  const tabs = [
    { id: "home",     label: "Home",     Icon: Home          },
    { id: "clients",  label: "Clients",  Icon: Users         },
    { id: "policies", label: "Policies", Icon: FileText      },
    { id: "tasks",    label: "Tasks",    Icon: CheckSquare   },
    { id: "messages", label: "Messages", Icon: MessageSquare },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: T.card, borderTop: `1px solid ${T.border}`, display: "flex", padding: "8px 0 20px", zIndex: 50 }}>
      {tabs.map(({ id, label, Icon }) => {
        const isActive = active === id;
        const hasBadge = id === "tasks" && TASKS.filter(t => t.due === "Today" && !t.done).length > 0;
        const msgBadge = id === "messages" && MESSAGES.filter(m => m.unread > 0).length;
        return (
          <button key={id} onClick={() => onTab(id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 0", position: "relative" }}>
            {isActive && <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", width: 20, height: 2, background: T.blue, borderRadius: 999 }} />}
            <div style={{ position: "relative" }}>
              <Icon size={20} color={isActive ? T.blue : T.t400} strokeWidth={1.5} />
              {(hasBadge || msgBadge) && (
                <div style={{ position: "absolute", top: -4, right: -5, minWidth: 14, height: 14, background: T.red, borderRadius: 999, border: "2px solid white", fontSize: 8, fontWeight: 700, color: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 2px" }}>
                  {hasBadge ? TASKS.filter(t => t.due === "Today" && !t.done).length : msgBadge}
                </div>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 500, color: isActive ? T.blue : T.t400 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════════════════════════════════════

// ── HOME ──────────────────────────────────────────────────────────────────
const HomeScreen = ({ onTab, onClient }) => {
  const todayTasks = TASKS.filter(t => t.due === "Today" && !t.done);
  const overdueTasks = TASKS.filter(t => t.due === "Overdue" && !t.done);

  return (
    <div style={{ padding: "18px 16px 100px" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: T.t400, fontWeight: 500 }}>Tuesday, 25 February</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.t900, marginTop: 2, letterSpacing: "-0.02em" }}>Good morning, Γιώργης 👋</div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        {[
          { label: "Active Clients",  value: "3",   sub: "+1 lead",    icon: Users,    iconBg: T.blueLight,   iconColor: T.blue  },
          { label: "Policies",        value: "9",   sub: "2 expiring", icon: FileText, iconBg: T.greenLight,  iconColor: T.green },
          { label: "Tasks Today",     value: String(todayTasks.length), sub: `${overdueTasks.length} overdue`, icon: CheckSquare, iconBg: overdueTasks.length ? T.redLight : T.amberLight, iconColor: overdueTasks.length ? T.red : T.amber },
          { label: "Unread Messages", value: "2",   sub: "1 client",   icon: MessageSquare, iconBg: T.purpleLight, iconColor: T.purple },
        ].map(({ label, value, sub, icon: Icon, iconBg, iconColor }) => (
          <Card key={label} style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: T.t400, fontWeight: 500 }}>{label}</span>
              <div style={{ width: 28, height: 28, background: iconBg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={14} color={iconColor} strokeWidth={1.5} />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.t900 }}>{value}</div>
            <div style={{ fontSize: 10, color: T.t400, marginTop: 2 }}>{sub}</div>
          </Card>
        ))}
      </div>

      {/* Alert banner */}
      {overdueTasks.length > 0 && (
        <div style={{ background: T.redLight, border: `1px solid #FCA5A5`, borderRadius: 14, padding: "12px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={16} color={T.red} strokeWidth={1.5} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#991B1B" }}>{overdueTasks.length} overdue task{overdueTasks.length > 1 ? "s" : ""}</div>
            <div style={{ fontSize: 11, color: "#B91C1C" }}>{overdueTasks[0].title} · {overdueTasks[0].client}</div>
          </div>
          <button onClick={() => onTab("tasks")} style={{ fontSize: 11, fontWeight: 600, color: T.red, background: "none", border: "none", cursor: "pointer" }}>View →</button>
        </div>
      )}

      {/* Today's tasks */}
      <div style={{ marginBottom: 18 }}>
        <SectionHeader title="Today's Tasks" action={`See all (${TASKS.length})`} onAction={() => onTab("tasks")} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {todayTasks.slice(0, 3).map(task => (
            <Card key={task.id} style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <PriorityDot priority={task.priority} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.t900 }}>{task.title}</div>
                  <div style={{ fontSize: 11, color: T.t400, marginTop: 2 }}>{task.client}</div>
                </div>
                <StatusBadge status={task.type === "renewal" ? "expiring" : "active"} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Upcoming renewals */}
      <div style={{ marginBottom: 18 }}>
        <SectionHeader title="Upcoming Renewals" action="Renewals board" onAction={() => onTab("tasks")} />
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {Object.entries(RENEWALS_BOARD).flatMap(([window, items]) =>
            items.map(item => (
              <Card key={item.id} style={{ minWidth: 160, flexShrink: 0, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: window === "7 days" ? T.red : window === "30 days" ? T.amber : T.t400, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>{window}</div>
                <PolicyIcon type={item.type} size={32} />
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: T.t900 }}>{item.client.split(" ")[0]}</div>
                <div style={{ fontSize: 11, color: T.t400 }}>{item.type} · {item.insurer}</div>
                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: T.t900 }}>{item.premium}/yr</div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <SectionHeader title="Recent Activity" />
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {CLIENTS.flatMap(c => c.timeline.map(t => ({ ...t, clientName: c.name, avatar: c.avatar, avatarBg: c.avatarBg }))).slice(0, 5).map((event, i) => (
            <div key={event.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: i < 4 ? `1px solid ${T.border}` : "none" }}>
              <Avatar initials={event.avatar} bg={event.avatarBg} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.t900 }}>{event.clientName}</div>
                <div style={{ fontSize: 11, color: T.t600, marginTop: 1 }}>{event.text}</div>
              </div>
              <div style={{ fontSize: 10, color: T.t400, whiteSpace: "nowrap" }}>{event.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── CLIENTS ───────────────────────────────────────────────────────────────
const ClientsScreen = ({ onSelect }) => {
  const [search, setSearch] = useState("");
  const filtered = CLIENTS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: "18px 16px 100px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.t900, letterSpacing: "-0.02em" }}>Clients</div>
        <Btn variant="primary" size="sm"><Plus size={13} strokeWidth={2} /> Add Client</Btn>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={15} color={T.t400} strokeWidth={1.5} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." style={{ width: "100%", padding: "10px 12px 10px 36px", border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 13, color: T.t700, background: T.card, outline: "none", boxSizing: "border-box" }} />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {["All", "Active", "Expiring", "Leads"].map(f => (
          <button key={f} style={{ padding: "5px 14px", borderRadius: 999, border: `1px solid ${f === "All" ? T.blue : T.border}`, background: f === "All" ? T.blueLight : T.card, color: f === "All" ? T.blue : T.t600, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{f}</button>
        ))}
      </div>

      {/* Client list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(client => (
          <Card key={client.id} onClick={() => onSelect(client)} style={{ padding: 16, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative" }}>
                <Avatar initials={client.avatar} bg={client.avatarBg} size={42} />
                {client.status === "active" && <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, background: T.green, borderRadius: "50%", border: "2px solid white" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.t900 }}>{client.name}</div>
                  {client.segment === "VIP" && <StatusBadge status="vip" />}
                  {client.status === "lead" && <StatusBadge status="lead" />}
                </div>
                <div style={{ fontSize: 11, color: T.t400 }}>{client.policies} polic{client.policies !== 1 ? "ies" : "y"} · {client.lastActivity}</div>
                <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                  {client.tags.map(tag => (
                    <PolicyIcon key={tag} type={tag} size={22} />
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                {client.renewalIn && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: client.renewalIn <= 14 ? T.red : client.renewalIn <= 30 ? T.amber : T.t400 }}>
                    {client.renewalIn}d
                  </div>
                )}
                <ChevronRight size={14} color={T.t400} strokeWidth={1.5} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ── CLIENT PROFILE ────────────────────────────────────────────────────────
const ClientProfile = ({ client, onBack }) => {
  const [profileTab, setProfileTab] = useState("portfolio");

  return (
    <div style={{ background: T.bg, minHeight: "100vh" }}>
      {/* Sub-header */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: T.blue, fontSize: 13, fontWeight: 600, padding: 0 }}>
          <ChevronLeft size={16} strokeWidth={2} /> Clients
        </button>
      </div>

      <div style={{ padding: "20px 16px 100px" }}>
        {/* Client header card */}
        <Card style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <Avatar initials={client.avatar} bg={client.avatarBg} size={52} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: T.t900 }}>{client.name}</div>
                {client.segment === "VIP" && <StatusBadge status="vip" />}
              </div>
              <div style={{ fontSize: 12, color: T.t400, marginBottom: 10 }}>Active Client · {client.policies} policies</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="primary"   size="sm"><Phone   size={12} strokeWidth={2} /> Call</Btn>
                <Btn variant="secondary" size="sm"><Mail    size={12} strokeWidth={1.5} /> Email</Btn>
                <Btn variant="secondary" size="sm"><Upload  size={12} strokeWidth={1.5} /> Upload</Btn>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
            <div><div style={{ fontSize: 10, color: T.t400, marginBottom: 2 }}>Phone</div><div style={{ fontSize: 12, fontWeight: 600, color: T.t900 }}>{client.phone}</div></div>
            <div><div style={{ fontSize: 10, color: T.t400, marginBottom: 2 }}>Email</div><div style={{ fontSize: 12, fontWeight: 600, color: T.t900, overflow: "hidden", textOverflow: "ellipsis" }}>{client.email}</div></div>
          </div>
        </Card>

        {/* Profile tabs */}
        <div style={{ display: "flex", gap: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 4, marginBottom: 16 }}>
          {["portfolio", "timeline", "sharing"].map(tab => (
            <button key={tab} onClick={() => setProfileTab(tab)} style={{ flex: 1, padding: "8px 4px", borderRadius: 9, border: "none", background: profileTab === tab ? T.blue : "transparent", color: profileTab === tab ? "white" : T.t600, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
              {tab === "portfolio" ? "Portfolio" : tab === "timeline" ? "Timeline" : "Sharing"}
            </button>
          ))}
        </div>

        {/* Portfolio tab */}
        {profileTab === "portfolio" && (
          <div>
            {client.policies_list.length === 0 ? (
              <Card style={{ padding: 32, textAlign: "center" }}>
                <FileText size={28} color={T.t400} strokeWidth={1.5} style={{ margin: "0 auto 12px" }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: T.t700, marginBottom: 6 }}>No policies yet</div>
                <div style={{ fontSize: 12, color: T.t400, marginBottom: 14 }}>Upload or add a policy for this client.</div>
                <Btn variant="primary" size="sm"><Upload size={12} strokeWidth={2} /> Upload Policy</Btn>
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {client.policies_list.map(policy => (
                  <Card key={policy.id} style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <PolicyIcon type={policy.type} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.t900 }}>{policy.name}</div>
                          <div style={{ fontSize: 11, color: T.t400, marginTop: 1 }}>{policy.insurer} · {policy.number}</div>
                        </div>
                      </div>
                      <StatusBadge status={policy.status} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[["Expires", policy.expires], ["Premium", policy.premium]].map(([l, v]) => (
                        <div key={l} style={{ background: T.bg, borderRadius: 8, padding: "8px 10px" }}>
                          <div style={{ fontSize: 10, color: T.t400, marginBottom: 2 }}>{l}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.t900 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <Btn variant="ghost" size="sm"><Eye size={12} strokeWidth={1.5} /> View</Btn>
                      <Btn variant="ghost" size="sm"><Upload size={12} strokeWidth={1.5} /> Upload</Btn>
                      <Btn variant="ghost" size="sm"><Flag size={12} strokeWidth={1.5} /> Flag</Btn>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timeline tab */}
        {profileTab === "timeline" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {client.timeline.map((event, i) => {
                const Icon = event.icon;
                return (
                  <div key={event.id} style={{ display: "flex", gap: 14, position: "relative", paddingBottom: 20 }}>
                    {i < client.timeline.length - 1 && <div style={{ position: "absolute", left: 16, top: 34, bottom: 0, width: 1, background: T.border }} />}
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.blueLight, border: `2px solid ${T.card}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1, boxShadow: "0 0 0 2px white" }}>
                      <Icon size={14} color={T.blue} strokeWidth={1.5} />
                    </div>
                    <div style={{ flex: 1, paddingTop: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.t900 }}>{event.text}</div>
                      <div style={{ fontSize: 11, color: T.t400, marginTop: 2 }}>{event.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Btn variant="secondary" size="sm" style={{ width: "100%", justifyContent: "center" }}><Plus size={13} strokeWidth={2} /> Add Note or Call</Btn>
          </div>
        )}

        {/* Sharing tab */}
        {profileTab === "sharing" && (
          <div>
            <div style={{ background: T.greenLight, border: `1px solid #A7F3D0`, borderRadius: 12, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <Check size={15} color="#065F46" strokeWidth={2} />
              <div style={{ fontSize: 12, fontWeight: 600, color: "#065F46" }}>Connected · Client has shared their portfolio with you</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.t400, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>What you can see</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {client.policies_list.map(policy => (
                <div key={policy.id} style={{ display: "flex", alignItems: "center", gap: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px" }}>
                  <PolicyIcon type={policy.type} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.t900 }}>{policy.name}</div>
                    <div style={{ fontSize: 11, color: T.t400 }}>{policy.insurer}</div>
                  </div>
                  <div style={{ display: "flex", align: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: T.green, marginTop: 2 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.green }}>Shared</span>
                  </div>
                </div>
              ))}
              {client.policies_list.length === 0 && (
                <div style={{ fontSize: 13, color: T.t400, textAlign: "center", padding: "24px 0" }}>No policies shared yet.</div>
              )}
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.t400, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Audit Log</div>
              <div style={{ fontSize: 12, color: T.t400, textAlign: "center", padding: "12px 0" }}>All access and actions are logged automatically.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── POLICIES ──────────────────────────────────────────────────────────────
const PoliciesScreen = () => {
  const allPolicies = CLIENTS.flatMap(c => c.policies_list.map(p => ({ ...p, clientName: c.name, clientAvatar: c.avatar, clientAvatarBg: c.avatarBg })));

  return (
    <div style={{ padding: "18px 16px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.t900, letterSpacing: "-0.02em" }}>All Policies</div>
        <Btn variant="primary" size="sm"><Upload size={13} strokeWidth={2} /> Upload</Btn>
      </div>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={15} color={T.t400} strokeWidth={1.5} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input placeholder="Search policies..." style={{ width: "100%", padding: "10px 12px 10px 36px", border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 13, color: T.t700, background: T.card, outline: "none", boxSizing: "border-box" }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {["All", "Motor", "Health", "Home", "Pet"].map(f => (
          <button key={f} style={{ padding: "5px 14px", borderRadius: 999, border: `1px solid ${f === "All" ? T.blue : T.border}`, background: f === "All" ? T.blueLight : T.card, color: f === "All" ? T.blue : T.t600, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{f}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {allPolicies.map(policy => (
          <Card key={policy.id} style={{ padding: 16, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <PolicyIcon type={policy.type} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.t900 }}>{policy.name}</div>
                  <div style={{ fontSize: 11, color: T.t400 }}>{policy.insurer} · {policy.number}</div>
                </div>
              </div>
              <StatusBadge status={policy.status} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
              <Avatar initials={policy.clientAvatar} bg={policy.clientAvatarBg} size={22} />
              <span style={{ fontSize: 11, color: T.t600, fontWeight: 500, flex: 1 }}>{policy.clientName}</span>
              <span style={{ fontSize: 11, color: T.t400 }}>{policy.expires}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ── TASKS ──────────────────────────────────────────────────────────────────
const TasksScreen = () => {
  const [view, setView] = useState("list");
  const [tasks, setTasks] = useState(TASKS);

  const toggleTask = id => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const groups = [
    { label: "Overdue",   color: T.red,   items: tasks.filter(t => t.due === "Overdue"   && !t.done) },
    { label: "Today",     color: T.amber,  items: tasks.filter(t => t.due === "Today"     && !t.done) },
    { label: "Tomorrow",  color: T.blue,   items: tasks.filter(t => t.due === "Tomorrow"  && !t.done) },
    { label: "This Week", color: T.t400,   items: tasks.filter(t => t.due === "This week" && !t.done) },
    { label: "Done",      color: T.green,  items: tasks.filter(t => t.done) },
  ];

  return (
    <div style={{ padding: "18px 16px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.t900, letterSpacing: "-0.02em" }}>Tasks</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant={view === "list" ? "primary" : "secondary"} size="sm" onClick={() => setView("list")}>List</Btn>
          <Btn variant={view === "board" ? "primary" : "secondary"} size="sm" onClick={() => setView("board")}>Board</Btn>
        </div>
      </div>

      {/* LIST VIEW */}
      {view === "list" && (
        <div>
          {groups.filter(g => g.items.length > 0).map(group => (
            <div key={group.label} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: group.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.t600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{group.label}</span>
                <span style={{ fontSize: 11, color: T.t400 }}>({group.items.length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {group.items.map(task => (
                  <Card key={task.id} style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <button onClick={() => toggleTask(task.id)} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${task.done ? T.green : T.border}`, background: task.done ? T.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: 1 }}>
                        {task.done && <Check size={11} color="white" strokeWidth={2.5} />}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: task.done ? T.t400 : T.t900, textDecoration: task.done ? "line-through" : "none" }}>{task.title}</div>
                        <div style={{ fontSize: 11, color: T.t400, marginTop: 2 }}>{task.client}</div>
                      </div>
                      <PriorityDot priority={task.priority} />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RENEWALS BOARD VIEW */}
      {view === "board" && (
        <div>
          <div style={{ fontSize: 12, color: T.t400, marginBottom: 16 }}>Renewals by time window</div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, alignItems: "flex-start" }}>
            {Object.entries(RENEWALS_BOARD).map(([window, items]) => {
              const isUrgent = window === "7 days" || window === "30 days";
              return (
                <div key={window} style={{ minWidth: 180, flexShrink: 0 }}>
                  <div style={{ background: isUrgent ? (window === "7 days" ? T.redLight : T.amberLight) : T.card, border: `1px solid ${isUrgent ? (window === "7 days" ? "#FCA5A5" : "#FCD34D") : T.border}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isUrgent ? (window === "7 days" ? T.red : T.amber) : T.t400, textTransform: "uppercase", letterSpacing: "0.05em" }}>{window}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: T.t900 }}>{items.length}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.map(item => (
                      <Card key={item.id} style={{ padding: 12 }}>
                        <PolicyIcon type={item.type} size={28} />
                        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: T.t900 }}>{item.client.split(" ")[0]}</div>
                        <div style={{ fontSize: 10, color: T.t400 }}>{item.type} · {item.insurer}</div>
                        <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: T.blue }}>{item.premium}/yr</div>
                        <div style={{ marginTop: 8 }}>
                          <Btn variant="primary" size="sm" style={{ width: "100%", justifyContent: "center", fontSize: 10 }}>Send Proposal</Btn>
                        </div>
                      </Card>
                    ))}
                    {items.length === 0 && (
                      <div style={{ textAlign: "center", padding: "16px 12px", fontSize: 11, color: T.t400 }}>No renewals</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── MESSAGES ──────────────────────────────────────────────────────────────
const MessagesScreen = () => {
  const [activeThread, setActiveThread] = useState(null);
  const [draft, setDraft] = useState("");

  if (activeThread) {
    const thread = MESSAGES.find(m => m.id === activeThread);
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
        {/* Thread header */}
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setActiveThread(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: T.blue, fontSize: 13, fontWeight: 600, padding: 0 }}>
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <Avatar initials={thread.avatar} bg={thread.avatarBg} size={34} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.t900 }}>{thread.client}</div>
            <div style={{ fontSize: 11, color: T.green, fontWeight: 500 }}>● Active now</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" size="sm"><Phone size={12} strokeWidth={1.5} /></Btn>
            <Btn variant="secondary" size="sm"><Paperclip size={12} strokeWidth={1.5} /></Btn>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, padding: "8px 14px", display: "flex", gap: 8, overflowX: "auto" }}>
          {["Request Document", "Send Renewal", "Book Call"].map(action => (
            <button key={action} style={{ padding: "5px 12px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 999, fontSize: 11, fontWeight: 600, color: T.t600, cursor: "pointer", whiteSpace: "nowrap" }}>{action}</button>
          ))}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {thread.thread.map((msg, i) => {
            const isAgent = msg.from === "agent";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isAgent ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "78%", background: isAgent ? T.blue : T.card, border: isAgent ? "none" : `1px solid ${T.border}`, borderRadius: isAgent ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                  <div style={{ fontSize: 13, color: isAgent ? "white" : T.t900, lineHeight: 1.5 }}>{msg.text}</div>
                  <div style={{ fontSize: 10, color: isAgent ? "rgba(255,255,255,0.6)" : T.t400, marginTop: 4, textAlign: isAgent ? "right" : "left" }}>{msg.time}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div style={{ background: T.card, borderTop: `1px solid ${T.border}`, padding: "12px 14px", display: "flex", gap: 10, alignItems: "center" }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Type a message..." style={{ flex: 1, padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 24, fontSize: 13, color: T.t700, background: T.bg, outline: "none" }} />
          <button style={{ width: 40, height: 40, borderRadius: "50%", background: T.blue, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Send size={16} color="white" strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "18px 16px 100px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.t900, letterSpacing: "-0.02em", marginBottom: 16 }}>Messages</div>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={15} color={T.t400} strokeWidth={1.5} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input placeholder="Search messages..." style={{ width: "100%", padding: "10px 12px 10px 36px", border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 13, background: T.card, outline: "none", boxSizing: "border-box" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {MESSAGES.map((msg, i) => (
          <div key={msg.id} onClick={() => setActiveThread(msg.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 4px", borderBottom: i < MESSAGES.length - 1 ? `1px solid ${T.border}` : "none", cursor: "pointer" }}>
            <div style={{ position: "relative" }}>
              <Avatar initials={msg.avatar} bg={msg.avatarBg} size={44} />
              {msg.unread > 0 && (
                <div style={{ position: "absolute", top: 0, right: 0, width: 16, height: 16, background: T.blue, borderRadius: "50%", border: "2px solid white", fontSize: 9, fontWeight: 700, color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {msg.unread}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: msg.unread ? 700 : 600, color: T.t900 }}>{msg.client}</div>
                <div style={{ fontSize: 11, color: T.t400 }}>{msg.time}</div>
              </div>
              <div style={{ fontSize: 12, color: msg.unread ? T.t700 : T.t400, fontWeight: msg.unread ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.lastMsg}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.t400, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Message Templates</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {["Renewal Reminder", "Missing Docs Request", "Claim Status Update"].map(t => (
            <div key={t} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: T.t700 }}>{t}</span>
              <ChevronRight size={14} color={T.t400} strokeWidth={1.5} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════
export default function AgentDashboard() {
  const [tab, setTab]               = useState("home");
  const [selectedClient, setClient] = useState(null);

  const handleClientSelect = (client) => {
    setClient(client);
    setTab("client-profile");
  };

  const handleBackFromProfile = () => {
    setClient(null);
    setTab("clients");
  };

  const renderScreen = () => {
    if (tab === "client-profile" && selectedClient) {
      return <ClientProfile client={selectedClient} onBack={handleBackFromProfile} />;
    }
    switch (tab) {
      case "home":     return <HomeScreen     onTab={setTab} onClient={handleClientSelect} />;
      case "clients":  return <ClientsScreen  onSelect={handleClientSelect} />;
      case "policies": return <PoliciesScreen />;
      case "tasks":    return <TasksScreen    />;
      case "messages": return <MessagesScreen />;
      default:         return <HomeScreen     onTab={setTab} onClient={handleClientSelect} />;
    }
  };

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", maxWidth: 430, margin: "0 auto", position: "relative" }}>
      <TopNav onNotif={() => {}} />
      <div style={{ overflowY: "auto", height: "calc(100vh - 60px)" }}>
        {renderScreen()}
      </div>
      {tab !== "client-profile" && (
        <BottomNav active={tab} onTab={setTab} />
      )}
    </div>
  );
}
