import type { CampaignReportStatus } from "./campaign-status.enum.js";

export type CampaignReport = {
  id: string;
  name: string;
  metric: number;
  status: CampaignReportStatus;
  evaluatedAt: Date;
};
