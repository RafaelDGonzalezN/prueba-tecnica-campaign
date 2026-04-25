// model Operator {
//   id         String     @id @default(cuid())
//   name       String
//   campaigns  Campaign[]
// }

// model Campaign {
//   id         String       @id @default(cuid())
//   name       String
//   operatorId String
//   operator   Operator     @relation(fields: [operatorId], references: [id])
//   metrics    CampaignMetric[]
// }

// model CampaignMetric {
//  id          String   @id @default(cuid())
//   campaignId  String
//   campaign    Campaign @relation(fields: [campaignId], references: [id])
//   roas        Float
//   recordedAt  DateTime
// }

import "dotenv/config";
import { PrismaClient } from "../../prisma/generated/client.js";

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL as string,
});

interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  averageRoas: number | null;
}

type GroupedCampaignsByOperator = Record<string, CampaignPerformance[]>;

async function getWorstCampaignsByOperator(): Promise<GroupedCampaignsByOperator> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const metricsAggregation = await prisma.campaignMetric.groupBy({
    by: ["campaignId"],
    where: {
      recordedAt: {
        gte: sevenDaysAgo,
      },
    },
    _avg: {
      roas: true,
    },
    orderBy: {
      _avg: {
        roas: "asc",
      },
    },
  });
  const campaignIds = metricsAggregation.map((m) => m.campaignId);

  const campaigns = await prisma.campaign.findMany({
    where: {
      id: { in: campaignIds },
    },
    include: {
      operator: true,
    },
  });

  const groupedResult = metricsAggregation.reduce(
    (acc, metric) => {
      const campaignDetail = campaigns.find((c) => c.id === metric.campaignId);

      if (campaignDetail) {
        const operatorName = campaignDetail.operator.name;
        const avgRoas = metric._avg.roas;

        if (!acc[operatorName]) {
          acc[operatorName] = [];
        }

        acc[operatorName].push({
          campaignId: campaignDetail.id,
          campaignName: campaignDetail.name,
          averageRoas: avgRoas,
        });
      }

      return acc;
    },
    {} as Record<string, CampaignPerformance[]>,
  );

  return groupedResult;
}
