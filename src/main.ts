import { getCampaignReports } from "./parte-1/getCampaignReports.js";
import dotenv from "dotenv";
import { webhook } from "./parte-2/webhook.js";
import { generateCampaignSummary } from "./parte-4/llm.js";
async function main() {
  dotenv.config();
  try {
    console.log("Iniciando ejecución...");
    const campaignReports = await getCampaignReports();
    console.log("Reports obtenidos exitosamente");
    const campaignSummary = await generateCampaignSummary(campaignReports);
    console.log("Resumen de campañas generado exitosamente");
    await webhook(campaignReports, campaignSummary);
    console.log("Webhook enviado exitosamente");
  } catch (error) {
    console.error("Falló la ejecución principal:");
    console.error(error instanceof Error ? error.message : error);
  }
}

main();
