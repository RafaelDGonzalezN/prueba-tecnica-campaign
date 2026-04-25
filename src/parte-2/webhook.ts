import axios from "axios";
import type { CampaignReport } from "../parte-1/types/campaign-report.type.js";
import { getCampaignReports } from "../parte-1/getCampaignReports.js";
import type { LLMSummary } from "../parte-4/llm.js";

export async function webhook(
  campaignReports: CampaignReport[],
  campaignSummary: LLMSummary,
) {
  const WEBHOOK_URL = process.env.WEBHOOK_URL;
  if (!WEBHOOK_URL) {
    throw new Error(
      "No se encontró la URL del webhook en las variables de entorno",
    );
  }
  const data = {
    campaignReports,
    campaignSummary,
  };
  const response = await axios.post(WEBHOOK_URL, data);
  return response.data;
}
