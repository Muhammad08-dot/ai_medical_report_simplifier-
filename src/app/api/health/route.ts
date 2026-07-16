import { getAdminDb, REPORTS_COLLECTION } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getAdminDb().collection(REPORTS_COLLECTION).limit(1).get();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
