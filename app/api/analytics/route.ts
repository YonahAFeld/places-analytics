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
  "profile_info_updated",
  "go_to_signup",
  "go_to_login",
  "open_request_city_sheet",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = searchParams.get("days") || "28";

  try {
    const client = getClient();

    const [kpiResponse, eventTrendResponse, topEventsResponse] =
      await Promise.all([
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

        // Event counts for our custom events
        client.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: {
            filter: {
              fieldName: "eventName",
              inListFilter: { values: CUSTOM_EVENTS },
            },
          },
          orderBys: [
            { metric: { metricName: "eventCount" }, desc: true },
          ],
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
    }));

    return NextResponse.json({ kpis, dauTrend, eventCounts });
  } catch (error) {
    console.error("GA4 API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
