"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type KPIs = {
  activeUsers: string;
  newUsers: string;
  sessions: string;
  screenPageViews: string;
};

type DauPoint = { date: string; users: number };
type EventCount = { event: string; count: number; uniqueUsers: number };
type SignUpMethod = { method: string; count: number };
type OnboardingFunnel = { signUps: number; onboardingCompletes: number; completionRate: number };
type DerivedKpis = {
  messagesPerDAU: string;
  pctUsersMessaged: number;
  avgChannelsJoinedPerUser: string;
  joinConversionRate: number;
};
type SignupFunnelStep = { event: string; label: string; users: number; dropPct: number };
type AnalyticsData = {
  kpis: KPIs;
  dauTrend: DauPoint[];
  eventCounts: EventCount[];
  signUpMethods: SignUpMethod[];
  onboardingFunnel: OnboardingFunnel;
  signupFunnel: SignupFunnelStep[];
  derivedKpis: DerivedKpis;
};

type PowerUser = { id: string; name: string; count: number };
type NewUser = { id: string; name: string; createdAt: string; online: boolean };
type RecentMessage = {
  id: string;
  text: string;
  userName: string;
  channelName: string;
  channelId: string;
  sentAt: string;
};

type ChannelRank = { id: string; name: string; memberCount: number; lastMessageAt: string | null };
type StreamData = {
  powerUsers: PowerUser[];
  newUsers: NewUser[];
  recentMessages: RecentMessage[];
  largestChannels: ChannelRank[];
  mostActiveChannels: ChannelRank[];
  totalUsers: number | null;
};

const DAYS_OPTIONS = [
  { label: "7d", value: "7" },
  { label: "28d", value: "28" },
  { label: "90d", value: "90" },
];

const EVENT_LABELS: Record<string, string> = {
  join_button_pressed: "Join Tapped",
  join_channel: "Joined Channel",
  share_channel: "Shared Channel",
  choose_city: "Chose City",
  sign_up: "Sign Up",
  login: "Login",
  submit_details: "Submitted Details",
  submit_location: "Submitted Location",
  onboarding_submit_interests: "Submitted Interests",
  onboarding_complete: "Onboarding Complete",
  profile_info_updated: "Updated Profile",
  go_to_signup: "Went to Sign Up",
  go_to_login: "Went to Login",
  open_request_city_sheet: "Requested City",
  message_sent: "Message Sent",
  dm_sent: "DM Sent",
  channel_viewed: "Channel Viewed",
  app_open: "App Open",
};

const METHOD_COLORS: Record<string, string> = {
  email: "#6366f1",
  google: "#f59e0b",
  apple: "#374151",
};

const PIE_COLORS = ["#6366f1", "#f59e0b", "#374151", "#10b981", "#f43f5e"];

function formatDate(raw: string) {
  const m = raw.slice(4, 6);
  const d = raw.slice(6, 8);
  return `${m}/${d}`;
}

function timeAgo(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const colors = [
    "bg-indigo-100 text-indigo-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-sky-100 text-sky-700",
    "bg-violet-100 text-violet-700",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials(name)}
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-1">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <span className="text-3xl font-bold text-gray-900">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function FunnelStep({ label, value, pct, isLast }: { label: string; value: number; pct?: number; isLast?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-6 py-4 text-center min-w-[140px]">
        <div className="text-2xl font-bold text-indigo-700">{value.toLocaleString()}</div>
        <div className="text-sm text-gray-500 mt-1">{label}</div>
      </div>
      {!isLast && (
        <div className="flex flex-col items-center gap-0.5 py-1">
          <div className="text-xs font-medium text-emerald-600">{pct}% continued</div>
          <div className="text-gray-300 text-lg">↓</div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamLoading, setStreamLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState("28");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    setStreamLoading(true);
    fetch(`/api/stream?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setStreamData(d);
      })
      .catch(() => {})
      .finally(() => setStreamLoading(false));
  }, [days]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Places Analytics</h1>
            <p className="text-gray-500 mt-1">Powered by Google Analytics 4 + Stream</p>
          </div>
          <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-1">
            {DAYS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  days === opt.value ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-lg">Loading...</div>
        ) : data ? (
          <div className="flex flex-col gap-6">
            {/* Total Users Hero */}
            <div className="bg-gradient-to-r from-amber-400 to-yellow-300 rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-amber-900 font-semibold text-sm">Total App Users</p>
                <p className="text-5xl font-extrabold text-amber-900 mt-1">
                  {streamData?.totalUsers != null ? streamData.totalUsers.toLocaleString() : "—"}
                </p>
              </div>
              <div className="text-6xl opacity-30">👥</div>
            </div>

            {/* Core KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Active Users" value={Number(data.kpis.activeUsers).toLocaleString()} />
              <KpiCard label="New Users" value={Number(data.kpis.newUsers).toLocaleString()} />
              <KpiCard label="Sessions" value={Number(data.kpis.sessions).toLocaleString()} />
              <KpiCard label="Screen Views" value={Number(data.kpis.screenPageViews).toLocaleString()} />
            </div>

            {/* Engagement KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Messages / DAU"
                value={data.derivedKpis.messagesPerDAU}
                sub="avg messages per active user"
              />
              <KpiCard
                label="Users Who Messaged"
                value={`${data.derivedKpis.pctUsersMessaged}%`}
                sub="of active users sent a message"
              />
              <KpiCard
                label="Avg Channels Joined"
                value={data.derivedKpis.avgChannelsJoinedPerUser}
                sub="channels per user who joined"
              />
              <KpiCard
                label="Join Conversion"
                value={`${data.derivedKpis.joinConversionRate}%`}
                sub="join tapped → channel joined"
              />
            </div>

            {/* DAU Trend */}
            <SectionCard title="Daily Active Users">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.dauTrend}>
                  <defs>
                    <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip formatter={(v) => [v, "Users"]} labelFormatter={(l) => formatDate(l as string)} contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2} fill="url(#dauGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* Onboarding Funnel + Sign-up Methods */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SectionCard title="🚀 Onboarding Funnel">
                <div className="flex flex-col items-center gap-0 py-2">
                  <FunnelStep label="Sign Ups" value={data.onboardingFunnel.signUps} pct={data.onboardingFunnel.completionRate} />
                  <FunnelStep label="Onboarding Complete" value={data.onboardingFunnel.onboardingCompletes} isLast />
                </div>
                <div className="mt-4 text-center text-sm text-gray-500">
                  <span className={`font-semibold ${data.onboardingFunnel.completionRate >= 70 ? "text-emerald-600" : data.onboardingFunnel.completionRate >= 40 ? "text-amber-600" : "text-red-500"}`}>
                    {data.onboardingFunnel.completionRate}% completion rate
                  </span>
                </div>
              </SectionCard>

              <SectionCard title="🔑 Sign-up Methods">
                {data.signUpMethods.length === 0 ? (
                  <p className="text-gray-400 text-sm">No data yet — fires once new sign_up events with method param arrive.</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={data.signUpMethods} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                          {data.signUpMethods.map((entry, i) => (
                            <Cell key={entry.method} fill={METHOD_COLORS[entry.method] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-2 flex-1">
                      {data.signUpMethods.map((m, i) => {
                        const total = data.signUpMethods.reduce((a, b) => a + b.count, 0);
                        const pct = total > 0 ? Math.round((m.count / total) * 100) : 0;
                        return (
                          <div key={m.method} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: METHOD_COLORS[m.method] ?? PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-sm capitalize text-gray-700 flex-1">{m.method}</span>
                            <span className="text-sm font-semibold text-gray-900">{m.count}</span>
                            <span className="text-xs text-gray-400">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Signup Funnel Leakage */}
            <SectionCard title="🔍 Signup Funnel Leakage">
              {data.signupFunnel.every((s) => s.users === 0) ? (
                <p className="text-gray-400 text-sm">No data in this period.</p>
              ) : (
                <div className="flex flex-col gap-0">
                  {data.signupFunnel.map((step, i) => {
                    const max = data.signupFunnel[0].users || 1;
                    const barPct = Math.round((step.users / max) * 100);
                    const isBigDrop = step.dropPct >= 30;
                    return (
                      <div key={step.event}>
                        {i > 0 && (
                          <div className="flex items-center gap-3 py-1 pl-4">
                            <div className={`text-xs font-medium ${isBigDrop ? "text-red-500" : "text-gray-400"}`}>
                              {isBigDrop ? "⚠️" : "↓"} {step.dropPct}% drop-off
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <div className="w-40 flex-shrink-0 text-sm text-gray-600 font-medium text-right pr-2">{step.label}</div>
                          <div className="flex-1 flex items-center gap-3">
                            <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
                              <div
                                className={`h-full rounded-full flex items-center justify-end pr-2 transition-all ${isBigDrop && i > 0 ? "bg-red-400" : "bg-indigo-500"}`}
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-800 w-16 flex-shrink-0">
                              {step.users.toLocaleString()}
                            </span>
                            <span className="text-xs text-gray-400 w-10 flex-shrink-0">
                              {barPct}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Stream widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SectionCard title="🏆 Power Users">
                {streamLoading ? (
                  <p className="text-gray-400 text-sm">Loading...</p>
                ) : streamData?.powerUsers.length ? (
                  <div className="flex flex-col gap-3">
                    {streamData.powerUsers.map((u, i) => (
                      <div key={u.id} className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                        <Avatar name={u.name} />
                        <span className="flex-1 text-sm font-medium text-gray-800 truncate">{u.name}</span>
                        <span className="text-sm font-semibold text-indigo-600">{u.count} msgs</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No data.</p>
                )}
              </SectionCard>

              <SectionCard title="✨ New Users">
                {streamLoading ? (
                  <p className="text-gray-400 text-sm">Loading...</p>
                ) : streamData?.newUsers.length ? (
                  <div className="flex flex-col gap-3">
                    {streamData.newUsers.map((u) => (
                      <div key={u.id} className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                          <p className="text-xs text-gray-400">Joined {timeAgo(u.createdAt)}</p>
                        </div>
                        {u.online && <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No data.</p>
                )}
              </SectionCard>
            </div>

            {/* Channel Rankings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SectionCard title="👥 Largest Channels">
                {streamLoading ? (
                  <p className="text-gray-400 text-sm">Loading...</p>
                ) : streamData?.largestChannels.length ? (
                  <div className="flex flex-col gap-3">
                    {streamData.largestChannels.map((c, i) => {
                      const max = streamData.largestChannels[0].memberCount || 1;
                      const barPct = Math.round((c.memberCount / max) * 100);
                      return (
                        <div key={c.id} className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-400 w-5 text-right flex-shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-800 truncate">{c.name}</span>
                              <span className="text-sm font-semibold text-indigo-600 flex-shrink-0 ml-2">{c.memberCount} members</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${barPct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No data.</p>
                )}
              </SectionCard>

              <SectionCard title="🔥 Most Recently Active Channels">
                {streamLoading ? (
                  <p className="text-gray-400 text-sm">Loading...</p>
                ) : streamData?.mostActiveChannels.length ? (
                  <div className="flex flex-col gap-3">
                    {streamData.mostActiveChannels.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-400 w-5 text-right flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-800 truncate block">{c.name}</span>
                          <span className="text-xs text-gray-400">{c.memberCount} members · last active {c.lastMessageAt ? timeAgo(c.lastMessageAt) : "unknown"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No data.</p>
                )}
              </SectionCard>
            </div>

            {/* Messages Radar */}
            <SectionCard title="📡 Messages Radar">
              {streamLoading ? (
                <p className="text-gray-400 text-sm">Loading...</p>
              ) : streamData?.recentMessages.length ? (
                <div className="flex flex-col divide-y divide-gray-50">
                  {streamData.recentMessages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <Avatar name={msg.userName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-800">{msg.userName}</span>
                          <span className="text-xs text-indigo-500 font-medium truncate max-w-[180px]">#{msg.channelName}</span>
                          <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{timeAgo(msg.sentAt)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No recent messages.</p>
              )}
            </SectionCard>

            {/* Event Counts */}
            <SectionCard title="Event Counts">
              {data.eventCounts.length === 0 ? (
                <p className="text-gray-400 text-sm">No events in this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={data.eventCounts.map((e) => ({ ...e, label: EVENT_LABELS[e.event] ?? e.event }))} layout="vertical" margin={{ left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="label" type="category" tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false} width={140} />
                    <Tooltip formatter={(v) => [v, "Events"]} contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>
        ) : null}
      </div>
    </div>
  );
}
