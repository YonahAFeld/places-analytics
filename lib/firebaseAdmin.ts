import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getAdminApp() {
  if (!getApps().length) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
    initializeApp({ credential: cert(credentials) });
  }
  return getAuth();
}

export async function getTotalUserCount(): Promise<number> {
  const auth = getAdminApp();
  let total = 0;
  let pageToken: string | undefined;
  do {
    const result = await auth.listUsers(1000, pageToken);
    total += result.users.length;
    pageToken = result.pageToken;
  } while (pageToken);
  return total;
}
