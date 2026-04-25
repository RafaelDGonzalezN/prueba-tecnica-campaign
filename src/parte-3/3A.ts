// ---- CODIGO ORIGINAL ----

// import axios from 'axios';

// async function fetchCampaignData(campaignId: string) {
//   const response = await axios.get(`https://api.example.com/campaigns/${campaignId}`);
//   const data = response.data;
//   return {
//     id: data.id,
//     clicks: data.clicks,
//     impressions: data.impressions,
//     ctr: data.clicks / data.impressions
//   };
// }

// async function processCampaigns(ids: string[]) {
//   const results = [];
//   for (const id of ids) {
//     const campaign = await fetchCampaignData(id);
//     results.push(campaign);
//   }
//   return results;
// }

// ---- PROBLEMAS DETECTADOS ----
// 1. Ausencia de try catch para capturar errores en la obtencion de datos
// 2. No habia un control de las variables impresiones y clics,
//    podia dar error si no existian o eran 0
// 3. Ausencia de una interface para tipar las peticiones
// 4. No se limita el numero de peticiones concurrentes

import axios from "axios";

interface CampaignAPIResponse {
  id: string;
  clicks: number;
  impressions: number;
  ctr: number;
}

async function fetchCampaignData(
  campaignId: string,
): Promise<CampaignAPIResponse> {
  try {
    const response = await axios.get(
      `https://api.example.com/campaigns/${campaignId}`,
    );
    if (response.status !== 200) {
      throw new Error(`Error al obtener los datos de la campaña ${campaignId}`);
    }
    const data = response.data;

    const impressions = data.impressions || 0;
    const clicks = data.clicks || 0;
    const ctr = impressions > 0 ? clicks / impressions : 0;

    return {
      id: data.id,
      clicks,
      impressions,
      ctr,
    };
  } catch (error) {
    throw new Error(`Error al obtener los datos de la campaña ${campaignId}`);
  }
}

async function processCampaigns(ids: string[]): Promise<CampaignAPIResponse[]> {
  const results: CampaignAPIResponse[] = [];
  const CONCURRENCY_LIMIT = 3;

  for (let i = 0; i < ids.length; i += CONCURRENCY_LIMIT) {
    const batchIds = ids.slice(i, i + CONCURRENCY_LIMIT);

    const batchPromises = batchIds.map((id) => fetchCampaignData(id));
    const batchResults = await Promise.all(batchPromises);
    const successfulResults = batchResults.filter(
      (result): result is CampaignAPIResponse => result !== null,
    );
    results.push(...successfulResults);
  }
  return results;
}

function filterAndSortCampaigns(
  campaigns: CampaignAPIResponse[],
): CampaignAPIResponse[] {
  return campaigns
    .filter((campaign) => campaign.ctr < 0.02)
    .sort((a, b) => a.ctr - b.ctr);
}
