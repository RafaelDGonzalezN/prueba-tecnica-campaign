import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { campaignQueue } from "./queue.js";
import { getCampaignReports } from "../parte-1/getCampaignReports.js";
import { generateCampaignSummary } from "../parte-4/llm.js";
import { webhook } from "../parte-2/webhook.js";

const connection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  },
);

const worker = new Worker(
  "campaigns-evaluation",
  async (job) => {
    console.log(`\n[Job ${job.id}] Iniciando evaluación de campañas...`);
    try {
      const campaignReports = await getCampaignReports();
      console.log(
        `[Job ${job.id}] Obtenidos ${campaignReports.length} reportes de campañas.`,
      );

      const campaignSummary = await generateCampaignSummary(campaignReports);
      console.log(`[Job ${job.id}] Resumen de IA generado exitosamente.`);

      await webhook(campaignReports, campaignSummary);
      console.log(`[Job ${job.id}] Datos enviados a N8N correctamente.`);
    } catch (error) {
      console.error(`[Job ${job.id}] Falló la ejecución:`, error);
      throw error;
    }
  },
  { connection },
);

worker.on("completed", (job) => {
  console.log(`[Job ${job.id}] Finalizado con éxito.`);
});

worker.on("failed", (job, err) => {
  console.log(`[Job ${job?.id}] Falló con el error: ${err.message}`);
});

async function setupCronJob() {
  await campaignQueue.add(
    "evaluate-thresholds",
    {},
    {
      repeat: {
        pattern: "*/2 * * * *",
      },
      jobId: "campaign-eval-cron",
    },
  );
  console.log("✅ Job recurrente agendado: ejecutándose cada 2 minutos.");
}

setupCronJob().catch(console.error);

console.log("Worker iniciado y escuchando la cola 'campaigns-evaluation'...");
