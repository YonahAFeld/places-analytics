import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { NextResponse } from "next/server";

const propertyId = process.env.GA4_PROPERTY_ID!;

function getClient() {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  return new BetaAnalyticsDataClient({ credentials: key });
}

const CUSTOM_EVENTS = [
  "join_button_pressed",
  "join_channel",
  "share_channel",
  "choose_city",
  "sign_up",
  "login",
  "submit_details",
  "submit_location",
  "onboarding_submit_interests",
  "onboarding_complete",
  "profile_info_updated",
  "go_to_signup",
  "go_to_login",
  "open_request_city_sheet",
  "message_sent",
  "dm_sent",
  "channel_viewed",
  "app_open",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawDays = searchParams.get("days");
  const days = ["7", "28", "90"].includes(rawDays ?? "") ? rawDays! : "28";

  try {
    const client = getClient();

    type ReportResponse = [{ rows: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[] }];
    const safeQuery = async (fn: () => Promise<ReportResponse>): Promise<ReportResponse> => {
      try { return await fn(); } catch { return [{ rows: [] }]; }
    };

    const [
      kpiResponse,
      eventTrendResponse,
      topEventsResponse,
      signUpMethodResponse,
      onboardingFunnelResponse,
    ] = await Promise.all([
      // KPIs: active users, new users, sessions
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        metrics: [
          { name: "activeUsers" },
          { name: "newUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
        ],
      }),

      // Daily active users trend
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),

      // Event counts for all custom events
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            inListFilter: { values: CUSTOM_EVENTS },
          },
        },
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      }),

      // Sign-up method breakdown — requires customEvent:method registered in GA4
      safeQuery(() => client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "eventName" }, { name: "customEvent:method" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            stringFilter: { value: "sign_up" },
          },
        },
      }) as unknown as Promise<ReportResponse>),

      // Onboarding funnel: sign_up → onboarding_complete
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "totalUsers" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            inListFilter: { values: ["sign_up", "onboarding_complete"] },
          },
        },
      }),
    ]);

    const kpiRow = kpiResponse[0].rows?.[0];
    const kpis = {
      activeUsers: kpiRow?.metricValues?.[0]?.value ?? "0",
      newUsers: kpiRow?.metricValues?.[1]?.value ?? "0",
      sessions: kpiRow?.metricValues?.[2]?.value ?? "0",
      screenPageViews: kpiRow?.metricValues?.[3]?.value ?? "0",
    };

    const dauTrend = (eventTrendResponse[0].rows ?? []).map((row) => ({
      date: row.dimensionValues?.[0]?.value ?? "",
      users: parseInt(row.metricValues?.[0]?.value ?? "0"),
    }));

    const eventCounts = (topEventsResponse[0].rows ?? []).map((row) => ({
      event: row.dimensionValues?.[0]?.value ?? "",
      count: parseInt(row.metricValues?.[0]?.value ?? "0"),
      uniqueUsers: parseInt(row.metricValues?.[1]?.value ?? "0"),
    }));

    // Sign-up method breakdown
    const signUpMethods = (signUpMethodResponse[0].rows ?? [])
      .filter((row) => row.dimensionValues?.[1]?.value && row.dimensionValues[1].value !== "(not set)")
      .map((row) => ({
        method: row.dimensionValues?.[1]?.value ?? "unknown",
        count: parseInt(row.metricValues?.[0]?.value ?? "0"),
      }));

    // Onboarding funnel
    const funnelMap: Record<string, number> = {};
    for (const row of onboardingFunnelResponse[0].rows ?? []) {
      const event = row.dimensionValues?.[0]?.value ?? "";
      funnelMap[event] = parseInt(row.metricValues?.[0]?.value ?? "0");
    }
    const signUps = funnelMap["sign_up"] ?? 0;
    const onboardingCompletes = funnelMap["onboarding_complete"] ?? 0;
    const onboardingFunnel = {
      signUps,
      onboardingCompletes,
      completionRate: signUps > 0 ? Math.round((onboardingCompletes / signUps) * 100) : 0,
    };

    // Derived KPIs from event counts
    const messageSentCount = eventCounts.find((e) => e.event === "message_sent")?.count ?? 0;
    const messageSentUsers = eventCounts.find((e) => e.event === "message_sent")?.uniqueUsers ?? 0;
    const joinChannelCount = eventCounts.find((e) => e.event === "join_channel")?.count ?? 0;
    const joinChannelUsers = eventCounts.find((e) => e.event === "join_channel")?.uniqueUsers ?? 0;
    const joinButtonCount = eventCounts.find((e) => e.event === "join_button_pressed")?.count ?? 0;
    const activeUsers = parseInt(kpis.activeUsers);

    const derivedKpis = {
      messagesPerDAU: activeUsers > 0 ? (messageSentCount / activeUsers).toFixed(1) : "0",
      pctUsersMessaged: activeUsers > 0 ? Math.round((messageSentUsers / activeUsers) * 100) : 0,
      avgChannelsJoinedPerUser: joinChannelUsers > 0 ? (joinChannelCount / joinChannelUsers).toFixed(1) : "0",
      joinConversionRate: joinButtonCount > 0 ? Math.round((joinChannelCount / joinButtonCount) * 100) : 0,
    };

    return NextResponse.json({
      kpis,
      dauTrend,
      eventCounts,
      signUpMethods,
      onboardingFunnel,
      derivedKpis,
    });
  } catch (error) {
    console.error("GA4 API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
