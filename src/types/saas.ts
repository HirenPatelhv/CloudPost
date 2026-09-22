export type SaaSSubscriptionPlan = 'free' | 'pro' | 'enterprise';
export type SaaSSubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'churned' | 'suspended';

export interface SaaSCostBreakdown {
  apiGatewayCost: number;       // Infrastructure cost for proxy / gateway ($0.000002/req)
  egressBandwidthCost: number;  // Data egress bandwidth ($0.08/GB)
  databaseStorageCost: number;  // DB persistence & indexing ($0.12/GB)
  aiComputeCost: number;        // AI prompt tokens ($0.002/1k tokens)
  serverlessExecutionCost: number; // Sandbox execution runtime ($0.00001/sec)
  totalCost: number;            // Sum of all infrastructure costs
}

export interface SaaSCustomerUsage {
  totalRequests: number;
  monthlyQuota: number;
  quotaUsedPercent: number;
  requestsThisMonth: number;
  avgLatencyMs: number;
  errorRatePercent: number;
  dataTransferMb: number;
  aiTokensUsed: number;
  activeWorkspacesCount: number;
  totalCollectionsCount: number;
  teamMembersCount: number;
}

export interface SaaSCustomerActivity {
  id: string;
  action: string;
  target?: string;
  timestamp: string;
  ip?: string;
  costImpact?: number;
}

export interface SaaSCustomer {
  id: string;
  name: string;
  email: string;
  avatar: string;
  companyName: string;
  role: string;
  plan: SaaSSubscriptionPlan;
  status: SaaSSubscriptionStatus;
  monthlyFee: number;           // Subscription fee charged ($0, $29, $99, custom)
  billingCycle: 'monthly' | 'yearly';
  costBreakdown: SaaSCostBreakdown;
  usage: SaaSCustomerUsage;
  netMargin: number;            // monthlyFee - totalCost
  netMarginPercent: number;     // (netMargin / monthlyFee) * 100
  healthScore: number;          // 0 - 100
  registeredAt: string;
  lastActiveAt: string;
  lastLoginIp: string;
  country: string;
  paymentMethod: string;
  customDiscountPercent?: number;
  notes?: string;
  recentActivity: SaaSCustomerActivity[];
}

export interface SaaSMetricsSummary {
  totalCustomers: number;
  activeSubscriptions: number;
  totalMrr: number;
  totalArr: number;
  totalApiRequests: number;
  totalInfrastructureCost: number;
  netProfitMrr: number;
  overallMarginPercent: number;
  avgRevenuePerUser: number;
  churnRatePercent: number;
  customerHealthAvg: number;
}

export interface SaaSReportPeriod {
  periodLabel: string;
  revenue: number;
  infraCost: number;
  netProfit: number;
  requestsCount: number;
  newSignups: number;
  activeUsers: number;
  churnedUsers: number;
  marginPercent: number;
}

export interface SaaSPlanDistribution {
  plan: SaaSSubscriptionPlan;
  name: string;
  userCount: number;
  mrr: number;
  infraCost: number;
  netMargin: number;
  marginPercent: number;
  avgRequestsPerUser: number;
}

export interface CustomerDailyActivity {
  date: string;         // e.g. "2026-08-25"
  dayLabel: string;     // e.g. "Aug 25"
  dayOfWeek: string;    // e.g. "Tue"
  dayIndex: number;     // 0 to 29 (0 = 29 days ago, 29 = today)
  requests: number;     // count of API calls executed
  dataMb: number;       // egress bandwidth in MB
  cost: number;         // daily infra cost in USD
  intensity: number;    // 0 (idle) to 5 (heavy traffic)
  isWeekend: boolean;
}

export interface CustomerActivityHeatmapData {
  customerId: string;
  customerName: string;
  companyName: string;
  email: string;
  plan: SaaSSubscriptionPlan;
  avatar: string;
  total30dRequests: number;
  peakDayRequests: number;
  peakDayDate: string;
  avgDailyRequests: number;
  total30dCost: number;
  dailyActivity: CustomerDailyActivity[]; // Array of 30 days
}

export interface HeatmapAggregatedSummary {
  total30dRequests: number;
  total30dCost: number;
  avgDailyRequests: number;
  peakDay: {
    date: string;
    dayLabel: string;
    totalRequests: number;
    activeCustomersCount: number;
  };
  mostActiveCustomer: {
    name: string;
    company: string;
    totalRequests: number;
    plan: SaaSSubscriptionPlan;
  };
  dailyTotals: {
    date: string;
    dayLabel: string;
    dayOfWeek: string;
    totalRequests: number;
    totalCost: number;
    intensity: number;
  }[];
}
