import {
  SaaSCustomer,
  SaaSMetricsSummary,
  SaaSPlanDistribution,
  SaaSReportPeriod,
  CustomerActivityHeatmapData,
  CustomerDailyActivity,
  HeatmapAggregatedSummary,
} from '../types/saas';

export function calculateCustomerCostAndMargin(
  requests: number,
  dataMb: number,
  dbGb: number,
  aiTokens: number,
  monthlyFee: number
) {
  // Rates:
  // Gateway: $0.000003 per request ($3 per 1M)
  // Egress Bandwidth: $0.08 per GB ($0.00008 per MB)
  // DB Storage: $0.15 per GB
  // AI Tokens: $0.002 per 1k tokens ($0.000002 per token)
  // Serverless execution: $0.000001 per request

  const apiGatewayCost = Number((requests * 0.000003).toFixed(4));
  const egressBandwidthCost = Number(((dataMb / 1024) * 0.08).toFixed(4));
  const databaseStorageCost = Number((dbGb * 0.15).toFixed(4));
  const aiComputeCost = Number(((aiTokens / 1000) * 0.002).toFixed(4));
  const serverlessExecutionCost = Number((requests * 0.000001).toFixed(4));

  const totalCost = Number(
    (apiGatewayCost + egressBandwidthCost + databaseStorageCost + aiComputeCost + serverlessExecutionCost).toFixed(2)
  );

  const netMargin = Number((monthlyFee - totalCost).toFixed(2));
  const netMarginPercent = monthlyFee > 0 ? Number(((netMargin / monthlyFee) * 100).toFixed(1)) : (totalCost > 0 ? -100 : 0);

  return {
    breakdown: {
      apiGatewayCost,
      egressBandwidthCost,
      databaseStorageCost,
      aiComputeCost,
      serverlessExecutionCost,
      totalCost,
    },
    netMargin,
    netMarginPercent,
  };
}

export const INITIAL_SAAS_CUSTOMERS: SaaSCustomer[] = [
  {
    id: "cust_hiren_hv",
    name: "Hiren Patel",
    email: "hirenpatelhv@gmail.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    companyName: "CloudPost SaaS Enterprise",
    role: "Workspace Architect & SuperAdmin",
    plan: "enterprise",
    status: "active",
    monthlyFee: 199,
    billingCycle: "yearly",
    costBreakdown: {
      apiGatewayCost: 3.75,
      egressBandwidthCost: 3.88,
      databaseStorageCost: 1.50,
      aiComputeCost: 3.20,
      serverlessExecutionCost: 1.87,
      totalCost: 14.20,
    },
    usage: {
      totalRequests: 1250000,
      monthlyQuota: 10000000,
      quotaUsedPercent: 12.5,
      requestsThisMonth: 1250000,
      avgLatencyMs: 34,
      errorRatePercent: 0.02,
      dataTransferMb: 48500,
      aiTokensUsed: 1600000,
      activeWorkspacesCount: 1,
      totalCollectionsCount: 1,
      teamMembersCount: 1,
    },
    netMargin: 184.80,
    netMarginPercent: 92.9,
    healthScore: 100,
    registeredAt: "2026-09-17T04:00:00Z",
    lastActiveAt: new Date().toISOString(),
    lastLoginIp: "127.0.0.1 (Local Authorized)",
    country: "United States",
    paymentMethod: "Mastercard Enterprise Tier",
    customDiscountPercent: 0,
    notes: "SuperAdmin SaaS Enterprise account with full analytics and persistent cloud storage privileges.",
    recentActivity: [
      { id: "act_hv_1", action: "Provisioned Enterprise SaaS Customer Workspace", timestamp: "Just now", ip: "127.0.0.1", costImpact: 0.01 },
    ],
  },
];

export function computeSaaSMetrics(customers: SaaSCustomer[]): SaaSMetricsSummary {
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active' || c.status === 'trialing');
  const activeSubscriptions = activeCustomers.filter(c => c.plan !== 'free').length;

  const totalMrr = customers
    .filter(c => c.status === 'active' || c.status === 'past_due')
    .reduce((sum, c) => sum + c.monthlyFee, 0);

  const totalArr = totalMrr * 12;

  const totalApiRequests = customers.reduce((sum, c) => sum + c.usage.totalRequests, 0);
  const totalInfrastructureCost = customers.reduce((sum, c) => sum + c.costBreakdown.totalCost, 0);

  const netProfitMrr = totalMrr - totalInfrastructureCost;
  const overallMarginPercent = totalMrr > 0 ? Number(((netProfitMrr / totalMrr) * 100).toFixed(1)) : 0;
  const avgRevenuePerUser = totalCustomers > 0 ? Number((totalMrr / totalCustomers).toFixed(2)) : 0;
  const churnRatePercent = 2.4; // Average monthly churn
  const customerHealthAvg = totalCustomers > 0
    ? Math.round(customers.reduce((sum, c) => sum + c.healthScore, 0) / totalCustomers)
    : 100;

  return {
    totalCustomers,
    activeSubscriptions,
    totalMrr,
    totalArr,
    totalApiRequests,
    totalInfrastructureCost: Number(totalInfrastructureCost.toFixed(2)),
    netProfitMrr: Number(netProfitMrr.toFixed(2)),
    overallMarginPercent,
    avgRevenuePerUser,
    churnRatePercent,
    customerHealthAvg,
  };
}

export function computePlanDistributions(customers: SaaSCustomer[]): SaaSPlanDistribution[] {
  const plans: Array<{ plan: 'free' | 'pro' | 'enterprise'; name: string }> = [
    { plan: 'free', name: 'Free Developer ($0)' },
    { plan: 'pro', name: 'Pro Team ($29/mo)' },
    { plan: 'enterprise', name: 'Enterprise Scale ($199-$349/mo)' },
  ];

  return plans.map(({ plan, name }) => {
    const list = customers.filter(c => c.plan === plan);
    const count = list.length;
    const mrr = list.reduce((sum, c) => sum + c.monthlyFee, 0);
    const infra = Number(list.reduce((sum, c) => sum + c.costBreakdown.totalCost, 0).toFixed(2));
    const net = Number((mrr - infra).toFixed(2));
    const marginPercent = mrr > 0 ? Number(((net / mrr) * 100).toFixed(1)) : (infra > 0 ? -100 : 0);
    const totalReqs = list.reduce((sum, c) => sum + c.usage.totalRequests, 0);
    const avgReqs = count > 0 ? Math.round(totalReqs / count) : 0;

    return {
      plan,
      name,
      userCount: count,
      mrr,
      infraCost: infra,
      netMargin: net,
      marginPercent,
      avgRequestsPerUser: avgReqs,
    };
  });
}

export const SAMPLE_REPORT_PERIODS: SaaSReportPeriod[] = [
  { periodLabel: "Sep 2026 (Current MTD)", revenue: 199, infraCost: 14.20, netProfit: 184.80, requestsCount: 1250000, newSignups: 1, activeUsers: 1, churnedUsers: 0, marginPercent: 92.9 },
];

/**
 * Generates 30-day activity frequency matrix per customer for heatmap visualization
 */
export function generateCustomer30DayHeatmapData(customers: SaaSCustomer[]): {
  heatmapRows: CustomerActivityHeatmapData[];
  summary: HeatmapAggregatedSummary;
} {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Base date anchor: Aug 25, 2026
  const baseDate = new Date(Date.UTC(2026, 7, 25));

  // Build the 30 days template
  const datesTemplate: Array<{
    dateStr: string;
    dayLabel: string;
    dayOfWeek: string;
    isWeekend: boolean;
    dayIndex: number;
    weekdayWeight: number;
  }> = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dayOfWeekStr = dayNames[d.getUTCDay()];
    const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayLabel = `${monthNames[d.getUTCMonth()]} ${d.getUTCDate()}`;

    // Traffic weight: Tue/Wed/Thu peak (1.3), Mon/Fri medium (1.0), Weekends low (0.35)
    let weekdayWeight = 1.1;
    if (dayOfWeekStr === 'Tue' || dayOfWeekStr === 'Wed' || dayOfWeekStr === 'Thu') weekdayWeight = 1.35;
    else if (dayOfWeekStr === 'Mon') weekdayWeight = 1.15;
    else if (dayOfWeekStr === 'Fri') weekdayWeight = 0.95;
    else if (isWeekend) weekdayWeight = 0.32;

    datesTemplate.push({
      dateStr,
      dayLabel,
      dayOfWeek: dayOfWeekStr,
      isWeekend,
      dayIndex: 29 - i,
      weekdayWeight,
    });
  }

  // Generate for each customer
  const heatmapRows: CustomerActivityHeatmapData[] = customers.map(c => {
    // Base daily average based on total usage
    const target30dTotal = c.usage.requestsThisMonth > 0 ? c.usage.requestsThisMonth : Math.max(500, Math.round(c.usage.totalRequests * 0.8));
    const baseDaily = target30dTotal / 30;

    // Stable pseudo-random seed based on customer id
    const seed = c.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

    let peakDayRequests = 0;
    let peakDayDate = datesTemplate[0].dateStr;
    let computedTotal30d = 0;
    let computedCost30d = 0;

    const dailyActivity: CustomerDailyActivity[] = datesTemplate.map(t => {
      // Deterministic noise: sin/cos wave + customer seed
      const variation = Math.sin((t.dayIndex * 1.7) + (seed % 10)) * 0.35 +
                        Math.cos((t.dayIndex * 0.9) + (seed % 7)) * 0.25;
      
      // Intentional burst spikes on certain days for enterprise/pro
      const isBurstDay = (t.dayIndex + (seed % 5)) % 9 === 0 && (c.plan === 'enterprise' || c.plan === 'pro');
      const burstMultiplier = isBurstDay ? 2.4 : 1.0;

      let dailyReq = Math.round(baseDaily * t.weekdayWeight * (1 + variation) * burstMultiplier);
      if (dailyReq < 0) dailyReq = 0;

      // Plan minimum adjustments
      if (c.plan === 'enterprise' && dailyReq < 50000 && !t.isWeekend) dailyReq += 80000;
      if (c.plan === 'pro' && dailyReq < 5000 && !t.isWeekend) dailyReq += 12000;
      if (c.plan === 'free' && dailyReq > 8000) dailyReq = Math.round(dailyReq * 0.2);

      // Data transfer and cost
      const dataMb = Number(((dailyReq * 2.4) / 1024).toFixed(2));
      const cost = Number((dailyReq * 0.0000045 + (dataMb / 1024) * 0.08).toFixed(4));

      // Calculate intensity (0 to 5)
      let intensity = 0;
      if (dailyReq > 350000) intensity = 5;
      else if (dailyReq > 150000) intensity = 4;
      else if (dailyReq > 50000) intensity = 3;
      else if (dailyReq > 10000) intensity = 2;
      else if (dailyReq > 500) intensity = 1;
      else if (dailyReq > 0) intensity = 1;

      if (dailyReq > peakDayRequests) {
        peakDayRequests = dailyReq;
        peakDayDate = t.dateStr;
      }

      computedTotal30d += dailyReq;
      computedCost30d += cost;

      return {
        date: t.dateStr,
        dayLabel: t.dayLabel,
        dayOfWeek: t.dayOfWeek,
        dayIndex: t.dayIndex,
        requests: dailyReq,
        dataMb,
        cost,
        intensity,
        isWeekend: t.isWeekend,
      };
    });

    return {
      customerId: c.id,
      customerName: c.name,
      companyName: c.companyName,
      email: c.email,
      plan: c.plan,
      avatar: c.avatar,
      total30dRequests: computedTotal30d,
      peakDayRequests,
      peakDayDate,
      avgDailyRequests: Math.round(computedTotal30d / 30),
      total30dCost: Number(computedCost30d.toFixed(2)),
      dailyActivity,
    };
  });

  // Calculate Aggregated Summary across all customers
  let grandTotalRequests = 0;
  let grandTotalCost = 0;
  let peakDayTotal = 0;
  let peakDayInfo = {
    date: datesTemplate[0].dateStr,
    dayLabel: datesTemplate[0].dayLabel,
    totalRequests: 0,
    activeCustomersCount: 0,
  };

  const dailyTotals = datesTemplate.map(t => {
    let dayTotalReq = 0;
    let dayTotalCost = 0;
    let activeCusts = 0;

    heatmapRows.forEach(row => {
      const act = row.dailyActivity[t.dayIndex];
      if (act) {
        dayTotalReq += act.requests;
        dayTotalCost += act.cost;
        if (act.requests > 0) activeCusts++;
      }
    });

    grandTotalRequests += dayTotalReq;
    grandTotalCost += dayTotalCost;

    if (dayTotalReq > peakDayTotal) {
      peakDayTotal = dayTotalReq;
      peakDayInfo = {
        date: t.dateStr,
        dayLabel: t.dayLabel,
        totalRequests: dayTotalReq,
        activeCustomersCount: activeCusts,
      };
    }

    let intensity = 0;
    if (dayTotalReq > 1000000) intensity = 5;
    else if (dayTotalReq > 600000) intensity = 4;
    else if (dayTotalReq > 300000) intensity = 3;
    else if (dayTotalReq > 100000) intensity = 2;
    else if (dayTotalReq > 10000) intensity = 1;

    return {
      date: t.dateStr,
      dayLabel: t.dayLabel,
      dayOfWeek: t.dayOfWeek,
      totalRequests: dayTotalReq,
      totalCost: Number(dayTotalCost.toFixed(2)),
      intensity,
    };
  });

  // Find most active customer
  const sortedRows = [...heatmapRows].sort((a, b) => b.total30dRequests - a.total30dRequests);
  const topCustomer = sortedRows[0] || {
    customerName: "Hiren Patel",
    companyName: "CloudPost SaaS Enterprise",
    total30dRequests: 1250000,
    plan: "enterprise" as const,
  };

  const summary: HeatmapAggregatedSummary = {
    total30dRequests: grandTotalRequests,
    total30dCost: Number(grandTotalCost.toFixed(2)),
    avgDailyRequests: Math.round(grandTotalRequests / 30),
    peakDay: peakDayInfo,
    mostActiveCustomer: {
      name: topCustomer.customerName,
      company: topCustomer.companyName,
      totalRequests: topCustomer.total30dRequests,
      plan: topCustomer.plan,
    },
    dailyTotals,
  };

  return { heatmapRows, summary };
}

