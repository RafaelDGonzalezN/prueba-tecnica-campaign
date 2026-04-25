import axios from "axios";
import axiosRetry from "axios-retry";
import { type CampaignReport } from "./types/campaign-report.type.js";
import type { ExternalApi } from "./types/external-api.type.js";
import { CampaignReportStatus } from "./types/campaign-status.enum.js";
import path from "path";
import fs from "fs/promises";

const apiClient = axios.create({
  timeout: 5000,
});

axiosRetry(apiClient, {
  retries: 4,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      error.response?.status === 429
    );
  },
  onRetry: (retryCount, error, requestConfig) => {
    console.warn(
      `Intento ${retryCount} fallido. Error: ${error}. Reintentando petición a ${requestConfig.url}...`,
    );
  },
});

const evaluateCampaignStatus = (ctr: number): CampaignReportStatus => {
  if (ctr > 2.5) return CampaignReportStatus.OK;
  if (ctr >= 1) return CampaignReportStatus.WARNING;
  return CampaignReportStatus.CRITICAL;
};

export async function getCampaignReports(): Promise<CampaignReport[]> {
  try {
    const response = await apiClient.get(
      "https://retoolapi.dev/JzPphi/campaign",
    );

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error("Estructura de respuesta inválida desde la API.");
    }

    const json = response.data.map((item: ExternalApi) => ({
      id: item.id.toString(),
      name: item.company,
      metric: item.ctr,
      status: evaluateCampaignStatus(item.ctr),
      evaluatedAt: new Date(),
    }));

    const jsonString = JSON.stringify(json, null, 2);

    const filePath = path.join(
      process.cwd(),
      "./src/parte-1/campaign-reports.json",
    );

    await fs.writeFile(filePath, jsonString, "utf-8");
    return json;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response
        ? `Error del servidor (${error.response.status})`
        : error.request
          ? "Error de red o Timeout: Servidor inalcanzable"
          : "Error configurando la petición HTTP";

      throw new Error(`Fallo al obtener reportes: ${errorMessage}`);
    }

    throw new Error("Error inesperado procesando los datos de la campaña.");
  }
}
