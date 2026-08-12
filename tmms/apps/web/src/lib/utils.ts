import type { VehicleStatus, FranchiseStatus, TicketStatus, InspectionResult, ParkingSlotStatus, AIVerificationStatus, RegistrationStatus } from '@/types';

// ---- Status badge config ----
export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'badge-active',
    APPROVED: 'badge-approved',
    PASSED: 'badge-passed',
    AVAILABLE: 'badge-active',
    SETTLED: 'badge-approved',
    PAID: 'badge-approved',
    VERIFIED: 'badge-approved',
    INACTIVE: 'badge-inactive',
    CANCELLED: 'badge-inactive',
    NA: 'badge-inactive',
    PENDING: 'badge-pending',
    UNDER_REVIEW: 'badge-review',
    DRAFT: 'badge-inactive',
    FOR_INSPECTION: 'badge-pending',
    EXPIRING: 'badge-pending',
    RENEWAL_PENDING: 'badge-pending',
    AI_SUGGESTED: 'badge-pending',
    PROCESSING: 'badge-pending',
    OCCUPIED: 'badge-pending',
    RESERVED: 'badge-pending',
    ISSUED: 'badge-review',
    CONTESTED: 'badge-review',
    CONFIRMED: 'badge-review',
    UNPAID: 'badge-expired',
    EXPIRED: 'badge-expired',
    FAILED: 'badge-failed',
    REJECTED: 'badge-rejected',
    SUSPENDED: 'badge-suspended',
    OUT_OF_SERVICE: 'badge-suspended',
    FOR_REINSPECTION: 'badge-pending',
    ESCALATED: 'badge-review',
  };
  return map[status] ?? 'badge-inactive';
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---- Date formatting ----
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function isExpiringSoon(dateStr?: string | null, daysThreshold = 30): boolean {
  if (!dateStr) return false;
  const expiry = new Date(dateStr);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  return diffMs > 0 && diffMs < daysThreshold * 24 * 60 * 60 * 1000;
}

export function isExpired(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function daysUntilExpiry(dateStr?: string | null): number {
  if (!dateStr) return -1;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ---- Currency ----
export function formatCurrency(amount?: number | null): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP',
  }).format(amount);
}

// ---- Pagination helpers ----
export function computeTotalPages(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / limit));
}

// ---- Class merging ----
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ---- Plate normalization ----
export function normalizePlate(plate: string): string {
  return plate.replace(/\s+/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// ---- Confidence display ----
export function confidenceLabel(score: number): string {
  if (score >= 0.9) return 'High';
  if (score >= 0.7) return 'Medium';
  return 'Low';
}

export function confidenceColor(score: number): string {
  if (score >= 0.9) return '#15803d';
  if (score >= 0.7) return '#d97706';
  return '#dc2626';
}

// ---- Role labels ----
export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    LGU_ADMIN: 'LGU Admin',
    TRANSPORTATION_OFFICER: 'Transportation Officer',
    TRAFFIC_ENFORCER: 'Traffic Enforcer',
    INSPECTOR: 'Inspector',
    PARKING_TERMINAL_OFFICER: 'Parking & Terminal Officer',
    ANALYST: 'Analyst',
    VIEWER: 'Viewer',
  };
  return map[role] ?? role;
}

// ---- Truncate text ----
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

// ---- Generate random demo IDs ----
export function demoId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}
