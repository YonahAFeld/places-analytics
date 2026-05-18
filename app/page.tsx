"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
type EventCount = { event: string; count: number };

type AnalyticsData = {
  kpis: KPIs;
  dauTrend: DauPoint[];
  eventCounts: EventCount[];
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

type StreamData = {
  powerUsers: PowerUser[];
  newUsers: NewUser[];
  recentMessages: RecentMessage[];
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
  profile_info_updated: "Updated Profile",
  go_to_signup: "Went to Sign Up",
  go_to_login: "Went to Login",
  open_request_city_sheet: "Requested City",
};

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
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
    <div
      className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}
    >
      {initials(name)}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-1">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <span className="text-3xl font-bold text-gray-900">
        {Number(value).toLocaleString()}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
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
    fetch("/api/stream")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setStreamData(d);
      })
      .catch(() => {})
      .finally(() => setStreamLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Places Analytics
            </h1>
            <p className="text-gray-500 mt-1">Powered by Google Analytics 4 + Stream</p>
          </div>
          <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-1">
            {DAYS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  days === opt.value
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-lg">
            Loading...
          </div>
        ) : data ? (
          <div className="flex flex-col gap-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Active Users" value={data.kpis.activeUsers} />
              <KpiCard label="New Users" value={data.kpis.newUsers} />
              <KpiCard label="Sessions" value={data.kpis.sessions} />
              <KpiCard label="Screen Views" value={data.kpis.screenPageViews} />
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
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    formatter={(v) => [v, "Users"]}
                    labelFormatter={(l) => formatDate(l as string)}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#dauGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* Stream widgets row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Power Users */}
              <SectionCard title="🏆 Power Users">
                {streamLoading ? (
                  <p className="text-gray-400 text-sm">Loading...</p>
                ) : streamData?.powerUsers.length ? (
                  <div className="flex flex-col gap-3">
                    {streamData.powerUsers.map((u, i) => (
                      <div key={u.id} className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-400 w-5 text-right">
                          {i + 1}
                        </span>
                        <Avatar name={u.name} />
                        <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                          {u.name}
                        </span>
                        <span className="text-sm font-semibold text-indigo-600">
                          {u.count} msgs
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No data.</p>
                )}
              </SectionCard>

              {/* New Users */}
              <SectionCard title="✨ New Users">
                {streamLoading ? (
                  <p className="text-gray-400 text-sm">Loading...</p>
                ) : streamData?.newUsers.length ? (
                  <div className="flex flex-col gap-3">
                    {streamData.newUsers.map((u) => (
                      <div key={u.id} className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {u.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            Joined {timeAgo(u.createdAt)}
                          </p>
                        </div>
                        {u.online && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                        )}
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
                          <span className="text-sm font-semibold text-gray-800">
                            {msg.userName}
                          </span>
                          <span className="text-xs text-indigo-500 font-medium truncate max-w-[180px]">
                            #{msg.channelName}
                          </span>
                          <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                            {timeAgo(msg.sentAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                          {msg.text}
                        </p>
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
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={data.eventCounts.map((e) => ({
                      ...e,
                      label: EVENT_LABELS[e.event] ?? e.event,
                    }))}
                    layout="vertical"
                    margin={{ left: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="label"
                      type="category"
                      tick={{ fontSize: 12, fill: "#374151" }}
                      axisLine={false}
                      tickLine={false}
                      width={140}
                    />
                    <Tooltip
                      formatter={(v) => [v, "Events"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                    />
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
