import { query } from "../../../lib/api";
import { getUsageSummary } from "../../../lib/usage-summary";

export const dynamic = "force-dynamic";

export async function GET() {
  return query((viewer) => getUsageSummary(viewer));
}
