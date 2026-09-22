import { SaaSCustomer, SaaSSubscriptionPlan, SaaSSubscriptionStatus } from '../types/saas';
import { User } from '../types';
import { INITIAL_SAAS_CUSTOMERS, calculateCustomerCostAndMargin } from '../data/saasData';

export const SAAS_ADMIN_EMAILS = [
  'hirenpatelhv@gmail.com',
];

/**
 * Checks whether the current user is a SaaS Platform Administrator.
 * SaaS Admins have exclusive access to infrastructure blueprints,
 * database topology, and customer financial metrics.
 */
export function isSaaSAdmin(user: User | null | undefined, isGuest?: boolean): boolean {
  if (isGuest || !user) return false;
  if (user.isSaaSAdmin === true) return true;

  const emailLower = (user.email || '').toLowerCase().trim();
  if (SAAS_ADMIN_EMAILS.includes(emailLower)) return true;

  const roleTitleLower = (user.roleTitle || '').toLowerCase();
  if (
    roleTitleLower.includes('superadmin') ||
    roleTitleLower.includes('saas admin') ||
    roleTitleLower.includes('workspace admin') ||
    roleTitleLower.includes('architect')
  ) {
    return true;
  }

  return false;
}

const SAAS_CUSTOMERS_KEY = 'cloudpost_saas_customers_v1';

export function getSaaSCustomers(): SaaSCustomer[] {
  try {
    const raw = localStorage.getItem(SAAS_CUSTOMERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out legacy mock accounts if present
        const filtered = parsed.filter(c => 
          c.email === 'hirenpatelhv@gmail.com' || 
          (!c.id.startsWith('cust_acme') && 
           !c.id.startsWith('cust_fintech') && 
           !c.id.startsWith('cust_nova') && 
           !c.id.startsWith('cust_pixel') && 
           !c.id.startsWith('cust_solo') && 
           !c.id.startsWith('cust_apex') &&
           !c.id.startsWith('cust_1') &&
           !c.id.startsWith('cust_2') &&
           !c.id.startsWith('cust_3') &&
           !c.id.startsWith('cust_4') &&
           !c.id.startsWith('cust_5'))
        );
        if (filtered.length > 0) {
          return filtered;
        }
      }
    }
  } catch (e) {
    console.error('Failed to load SaaS customers from storage:', e);
  }
  return INITIAL_SAAS_CUSTOMERS;
}

export function saveSaaSCustomers(customers: SaaSCustomer[]): void {
  try {
    localStorage.setItem(SAAS_CUSTOMERS_KEY, JSON.stringify(customers));
  } catch (e) {
    console.error('Failed to persist SaaS customers to storage:', e);
  }
}

export function registerNewSaaSCustomer(data: {
  name: string;
  email: string;
  companyName?: string;
  role?: string;
  plan: SaaSSubscriptionPlan;
  monthlyFee?: number;
}): SaaSCustomer {
  const currentList = getSaaSCustomers();
  const existing = currentList.find(c => c.email.toLowerCase() === data.email.toLowerCase());
  
  if (existing) {
    return existing;
  }

  const planFees: Record<SaaSSubscriptionPlan, number> = {
    free: 0,
    pro: 0,
    enterprise: 0,
  };

  const monthlyFee = 0;
  const quotaMap: Record<SaaSSubscriptionPlan, number> = {
    free: 999999999, // Unlimited
    pro: 999999999,
    enterprise: 999999999,
  };

  const initialRequests = 100;
  const initialDataMb = 5;
  const initialDbGb = 0.05;
  const initialAiTokens = 5000;

  const costCalc = calculateCustomerCostAndMargin(
    initialRequests,
    initialDataMb,
    initialDbGb,
    initialAiTokens,
    monthlyFee
  );

  const newCustomer: SaaSCustomer = {
    id: 'cust_' + Math.random().toString(36).substring(2, 9),
    name: data.name,
    email: data.email,
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.email)}`,
    companyName: data.companyName || (data.email.split('@')[1] ? data.email.split('@')[1].split('.')[0].toUpperCase() : 'Independent Dev'),
    role: data.role || 'Software Engineer',
    plan: data.plan,
    status: 'active',
    monthlyFee: 0,
    billingCycle: 'monthly',
    costBreakdown: costCalc.breakdown,
    usage: {
      totalRequests: initialRequests,
      monthlyQuota: quotaMap[data.plan],
      quotaUsedPercent: 0,
      requestsThisMonth: initialRequests,
      avgLatencyMs: 45,
      errorRatePercent: 0,
      dataTransferMb: initialDataMb,
      aiTokensUsed: initialAiTokens,
      activeWorkspacesCount: 1,
      totalCollectionsCount: 2,
      teamMembersCount: 1,
    },
    netMargin: costCalc.netMargin,
    netMarginPercent: costCalc.netMarginPercent,
    healthScore: 100,
    registeredAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    lastLoginIp: '127.0.0.1 (Local Client)',
    country: 'United States',
    paymentMethod: 'Direct Registration',
    recentActivity: [
      {
        id: 'act_reg_' + Date.now(),
        action: `User registered account on ${data.plan.toUpperCase()} tier (Unlimited Access)`,
        timestamp: 'Just now',
        ip: '127.0.0.1',
      },
    ],
  };

  const updated = [newCustomer, ...currentList];
  saveSaaSCustomers(updated);
  return newCustomer;
}

export function updateSaaSCustomer(id: string, updates: Partial<SaaSCustomer>): SaaSCustomer[] {
  const currentList = getSaaSCustomers();
  const updatedList = currentList.map(c => {
    if (c.id !== id) return c;
    const merged = { ...c, ...updates };

    // Recalculate margins if fee or costs updated
    if (updates.monthlyFee !== undefined || updates.costBreakdown !== undefined) {
      const fee = merged.monthlyFee;
      const cost = merged.costBreakdown.totalCost;
      merged.netMargin = Number((fee - cost).toFixed(2));
      merged.netMarginPercent = fee > 0 ? Number(((merged.netMargin / fee) * 100).toFixed(1)) : (cost > 0 ? -100 : 0);
    }

    return merged;
  });

  saveSaaSCustomers(updatedList);
  return updatedList;
}

export function recordCustomerApiExecution(emailOrId: string, latencyMs: number = 40, bytes: number = 1024): void {
  const currentList = getSaaSCustomers();
  const updatedList = currentList.map(c => {
    if (c.id === emailOrId || c.email.toLowerCase() === emailOrId.toLowerCase()) {
      const newTotalReqs = c.usage.totalRequests + 1;
      const newMonthReqs = c.usage.requestsThisMonth + 1;
      const newDataMb = Number((c.usage.dataTransferMb + bytes / (1024 * 1024)).toFixed(3));
      const quotaPct = Number(((newMonthReqs / c.usage.monthlyQuota) * 100).toFixed(2));

      const costCalc = calculateCustomerCostAndMargin(
        newMonthReqs,
        newDataMb,
        c.usage.totalCollectionsCount * 0.05,
        c.usage.aiTokensUsed,
        c.monthlyFee
      );

      return {
        ...c,
        lastActiveAt: new Date().toISOString(),
        costBreakdown: costCalc.breakdown,
        usage: {
          ...c.usage,
          totalRequests: newTotalReqs,
          requestsThisMonth: newMonthReqs,
          dataTransferMb: newDataMb,
          quotaUsedPercent: Math.min(quotaPct, 100),
        },
        netMargin: costCalc.netMargin,
        netMarginPercent: costCalc.netMarginPercent,
      };
    }
    return c;
  });

  saveSaaSCustomers(updatedList);
}

export function exportCustomersToCsv(customers: SaaSCustomer[]): string {
  const headers = [
    'Customer ID',
    'Full Name',
    'Email Address',
    'Company',
    'Role',
    'Plan Tier',
    'Status',
    'Monthly Fee ($)',
    'Total Requests',
    'Bandwidth (MB)',
    'Infra Cost Total ($)',
    'Gateway Cost ($)',
    'Bandwidth Cost ($)',
    'DB Storage Cost ($)',
    'AI Tokens Cost ($)',
    'Net Margin ($)',
    'Margin (%)',
    'Health Score',
    'Registered At',
    'Last Active',
    'Country',
  ];

  const rows = customers.map(c => [
    `"${c.id}"`,
    `"${c.name.replace(/"/g, '""')}"`,
    `"${c.email}"`,
    `"${(c.companyName || '').replace(/"/g, '""')}"`,
    `"${(c.role || '').replace(/"/g, '""')}"`,
    `"${c.plan.toUpperCase()}"`,
    `"${c.status.toUpperCase()}"`,
    c.monthlyFee.toFixed(2),
    c.usage.totalRequests,
    c.usage.dataTransferMb.toFixed(1),
    c.costBreakdown.totalCost.toFixed(2),
    c.costBreakdown.apiGatewayCost.toFixed(2),
    c.costBreakdown.egressBandwidthCost.toFixed(2),
    c.costBreakdown.databaseStorageCost.toFixed(2),
    c.costBreakdown.aiComputeCost.toFixed(2),
    c.netMargin.toFixed(2),
    `${c.netMarginPercent.toFixed(1)}%`,
    c.healthScore,
    `"${c.registeredAt}"`,
    `"${c.lastActiveAt}"`,
    `"${c.country}"`,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function downloadCsvFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
