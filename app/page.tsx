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

export default function Dashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Places Analytics
            </h1>
            <p className="text-gray-500 mt-1">Powered by Google Analytics 4</p>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Active Users" value={data.kpis.activeUsers} />
              <KpiCard label="New Users" value={data.kpis.newUsers} />
              <KpiCard label="Sessions" value={data.kpis.sessions} />
              <KpiCard label="Screen Views" value={data.kpis.screenPageViews} />
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Daily Active Users
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.dauTrend}>
                  <defs>
                    <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#6366f1"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor="#6366f1"
                        stopOpacity={0}
                      />
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
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
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
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Event Counts
              </h2>
              {data.eventCounts.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  No events in this period.
                </p>
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
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#f0f0f0"
                    />
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
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                      }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
