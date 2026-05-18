import { StreamChat } from "stream-chat";
import { NextResponse } from "next/server";

function getClient() {
  return new StreamChat(
    process.env.STREAM_API_KEY!,
    process.env.STREAM_API_SECRET!,
  );
}

export async function GET() {
  try {
    const client = getClient();

    // Fetch recent messages across all team channels (last 30)
    const channelsRes = await client.queryChannels(
      { type: "team" },
      { last_message_at: -1 },
      { limit: 30, state: true },
    );

    // Build recent messages list from channel state
    const recentMessages: {
      id: string;
      text: string;
      userName: string;
      channelName: string;
      channelId: string;
      sentAt: string;
    }[] = [];

    // Track message counts per user
    const userMessageCount: Record<string, { name: string; count: number }> =
      {};

    for (const channel of channelsRes) {
      const channelData = channel.data as Record<string, unknown> | undefined;
      const channelName =
        (channelData?.name as string) ||
        (channelData?.interest as string) ||
        channel.id ||
        "Unknown";

      const messages = channel.state.messages.slice(-5);
      for (const msg of messages) {
        if (!msg.text || msg.type === "system" || msg.user?.id === "admin") continue;

        const userId = msg.user?.id ?? "unknown";
        const userName =
          msg.user?.name || msg.user?.id || "Unknown";

        recentMessages.push({
          id: msg.id,
          text: msg.text,
          userName,
          channelName,
          channelId: channel.id ?? "",
          sentAt: String(msg.created_at),
        });

        if (!userMessageCount[userId]) {
          userMessageCount[userId] = { name: userName, count: 0 };
        }
        userMessageCount[userId].count += 1;
      }
    }

    // Sort recent messages newest first, take top 20
    recentMessages.sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    );
    const topRecentMessages = recentMessages.slice(0, 20);

    // Channel rankings
    const channelRankings = channelsRes
      .map((channel) => {
        const channelData = channel.data as Record<string, unknown> | undefined;
        return {
          id: channel.id ?? "",
          name: (channelData?.name as string) || (channelData?.interest as string) || channel.id || "Unknown",
          memberCount: (channelData?.member_count as number) ?? 0,
          lastMessageAt: channelData?.last_message_at ? String(channelData.last_message_at) : null,
        };
      });

    const largestChannels = [...channelRankings]
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 10);

    const mostActiveChannels = [...channelRankings]
      .filter((c) => c.lastMessageAt)
      .sort((a, b) => new Date(b.lastMessageAt!).getTime() - new Date(a.lastMessageAt!).getTime())
      .slice(0, 10);

    // Power users: sort by message count desc
    const powerUsers = Object.entries(userMessageCount)
      .map(([id, { name, count }]) => ({ id, name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // New users: query users sorted by created_at desc
    const usersRes = await client.queryUsers(
      { role: "user" },
      { created_at: -1 },
      { limit: 10 },
    );

    const totalUsers = (usersRes as unknown as { total_count?: number }).total_count ?? usersRes.users.length;

    const newUsers = usersRes.users.map((u) => ({
      id: u.id,
      name: u.name || u.id,
      createdAt: String(u.created_at),
      online: u.online ?? false,
    }));

    return NextResponse.json({ powerUsers, newUsers, recentMessages: topRecentMessages, largestChannels, mostActiveChannels, totalUsers });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Stream API error:", msg);
    return NextResponse.json(
      { error: "Failed to fetch Stream data" },
      { status: 500 },
    );
  }
}
