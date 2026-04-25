import { OpenRouter } from "@openrouter/sdk";
import type { CampaignReport } from "../parte-1/types/campaign-report.type.js";

export type LLMSummary = {
  generatedAt: Date;
  model: string;
  summary: string;
  criticalCampaigns: string[];
  suggestedActions: string[];
  rawResponse?: unknown;
};

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function generateCampaignSummary(
  reports: CampaignReport[],
): Promise<LLMSummary> {
  const MODEL = process.env.MODEL;
  if (!MODEL) {
    throw new Error("No se encontró la variable de entorno MODEL.");
  }

  const prompt = `
    Actúa como un analista de datos Senior especializado en campañas de marketing digital. Analiza el siguiente conjunto de datos en formato JSON:
    ${JSON.stringify(reports, null, 2)}

    Genera un resumen ejecutivo que sea directo y estructurado. Tu respuesta DEBE ser ÚNICAMENTE un objeto JSON válido, sin formato markdown, saludos ni texto de relleno. 

    Utiliza EXACTAMENTE esta estructura y sigue estas instrucciones para llenar cada campo:
    {
      "summary": "Resumir el estado general de las campañas en warning, sin listarlas una por una.",
      "criticalCampaigns": ["Identificar y destacar campañas en estado 'critical'"],
      "suggestedActions": ["Sugerir al menos una acción concreta basada en los datos"]
    }
  `;

  const apiKey = process.env.API_OPENROUTER;
  if (!apiKey) {
    throw new Error("No se encontró la variable de entorno API_OPENROUTER.");
  }

  const openrouter = new OpenRouter({
    apiKey,
  });

  try {
    const response = (await openrouter.chat.send({
      chatRequest: {
        model: MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        maxTokens: 1000,
        responseFormat: { type: "json_object" },
      },
    })) as ChatCompletionResponse;

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(
        "La respuesta del modelo no contiene un formato de mensaje válido.",
      );
    }

    const cleanContent = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsedData = JSON.parse(cleanContent);

    return {
      generatedAt: new Date(),
      model: MODEL,
      summary: parsedData.summary || "Resumen generado sin texto descriptivo.",
      criticalCampaigns: Array.isArray(parsedData.criticalCampaigns)
        ? parsedData.criticalCampaigns
        : [],
      suggestedActions: Array.isArray(parsedData.suggestedActions)
        ? parsedData.suggestedActions
        : [],
      rawResponse: response,
    };
  } catch (error) {
    console.error("Error de comunicación con OpenRouter o al parsear:", error);

    return {
      generatedAt: new Date(),
      model: MODEL,
      summary:
        "No se pudo generar el resumen en este momento debido a un error de conexión con la IA o parseo. Por favor, revisa el estado de las campañas manualmente.",
      criticalCampaigns: [],
      suggestedActions: [],
      rawResponse: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
