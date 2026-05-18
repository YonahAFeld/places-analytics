import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminDb() {
  if (!getApps().length) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
    initializeApp({ credential: cert(credentials) });
  }
  return getFirestore();
}

export async function getTotalUserCount(): Promise<number> {
  const db = getAdminDb();
  const snapshot = await db.collection("users").count().get();
  return snapshot.data().count;
}
