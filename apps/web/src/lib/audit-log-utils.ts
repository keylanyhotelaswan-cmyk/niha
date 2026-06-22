export type AuditPayload = Record<string, unknown> | null | undefined;

export type AuditEntryLike = {
  action: string;
  entityType?: string;
  entityId?: string;
  beforeData?: AuditPayload;
  afterData?: AuditPayload;
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: 'إنشاء',
  UPDATE: 'تعديل',
  CLOSE: 'إغلاق',
  CANCEL: 'إلغاء',
  APPROVE: 'اعتماد',
  DELETE: 'حذف',
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  ORDER: 'فاتورة / طلب',
  PRODUCT: 'منتج',
  USER: 'مستخدم',
  TREASURY: 'خزنة',
  INVENTORY: 'مخزون',
};

const COLLECTION_STATUS_LABELS: Record<string, string> = {
  UNCOLLECTED: 'غير محصل',
  PENDING_APPROVAL: 'بانتظار اعتماد',
  APPROVED: 'معتمد',
  uncollected: 'غير محصل',
  pending_approval: 'بانتظار اعتماد',
  approved: 'معتمد',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'غير مدفوع',
  PAID: 'مدفوع',
  VOIDED: 'ملغى',
  PARTIAL: 'جزئي',
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: 'صالة',
  TAKEAWAY: 'تيك أواي',
  DELIVERY: 'دليفري',
};

const FIELD_LABELS: Record<string, string> = {
  orderNumber: 'رقم الطلب',
  orderType: 'نوع الطلب',
  status: 'الحالة',
  customerName: 'العميل',
  customerPhone: 'هاتف',
  customerAddress: 'عنوان',
  captainName: 'دليفري',
  note: 'ملاحظة',
  collectionStatus: 'التحصيل',
  paymentStatus: 'الدفع',
  totalAmount: 'الإجمالي',
  subtotal: 'قبل الخصم',
  discountAmount: 'الخصم',
  amountPaid: 'المبلغ المدفوع',
  reason: 'السبب',
  items: 'الأصناف',
};

export function formatAuditTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
}

function formatFieldValue(key: string, value: unknown): string {
  if (value == null || value === '') return '—';
  if (key === 'collectionStatus' && typeof value === 'string') {
    return COLLECTION_STATUS_LABELS[value] ?? value;
  }
  if (key === 'paymentStatus' && typeof value === 'string') {
    return PAYMENT_STATUS_LABELS[value] ?? value;
  }
  if (key === 'orderType' && typeof value === 'string') {
    return ORDER_TYPE_LABELS[value] ?? value;
  }
  if (key === 'status' && typeof value === 'string') {
    const statusLabels: Record<string, string> = {
      OPEN: 'مفتوح',
      CLOSED: 'مغلق',
      SUSPENDED: 'معلّق',
      CANCELLED: 'ملغى',
      CANCEL_REQUESTED: 'طلب إلغاء',
      CANCEL_WITHDRAWN: 'سحب طلب الإلغاء',
      CANCEL_REJECTED: 'رفض الإلغاء',
    };
    return statusLabels[value] ?? value;
  }
  if (Array.isArray(value) && key === 'items') {
    return value
      .map((item) => {
        const row = item as { quantity?: number; name?: string; unitPrice?: number };
        const line = `${row.quantity ?? 1}× ${row.name ?? 'صنف'}`;
        return row.unitPrice != null ? `${line} (${row.unitPrice})` : line;
      })
      .join('، ');
  }
  if (typeof value === 'number') {
    if (key === 'totalAmount' || key === 'amountPaid' || key === 'subtotal' || key === 'discountAmount') {
      return `${value.toLocaleString('ar-EG')} ج.م`;
    }
    return value.toLocaleString('ar-EG');
  }
  return String(value);
}

function summarizePayload(data: AuditPayload, prefix?: 'before' | 'after') {
  if (!data || typeof data !== 'object') return [];
  const lines: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const label = FIELD_LABELS[key] ?? key;
    lines.push(`${label}: ${formatFieldValue(key, value)}`);
  }
  if (!lines.length && prefix) return [];
  return lines;
}

export function describeAuditChanges(entry: AuditEntryLike): string[] {
  const after = entry.afterData ?? {};
  const before = entry.beforeData ?? {};
  const lines: string[] = [];

  if (entry.action === 'CANCEL') {
    if (after.orderNumber) lines.push(`رقم الطلب: ${String(after.orderNumber)}`);
    if (after.totalAmount != null) {
      lines.push(`قيمة الفاتورة: ${formatFieldValue('totalAmount', after.totalAmount)}`);
    }
    if (after.collectionStatus != null) {
      lines.push(`${FIELD_LABELS.collectionStatus}: ${formatFieldValue('collectionStatus', after.collectionStatus)}`);
    }
    if (after.reason) lines.push(`السبب: ${String(after.reason)}`);
    if (after.status) lines.push(`الحالة: ${formatFieldValue('status', after.status)}`);
    return lines.length ? lines : summarizePayload(after);
  }

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (key === 'items') {
      const beforeItems = JSON.stringify(before.items ?? []);
      const afterItems = JSON.stringify(after.items ?? []);
      if (beforeItems !== afterItems) {
        if (before.items) lines.push(`قبل — ${FIELD_LABELS.items}: ${formatFieldValue('items', before.items)}`);
        if (after.items) lines.push(`بعد — ${FIELD_LABELS.items}: ${formatFieldValue('items', after.items)}`);
      }
      continue;
    }
    const b = before[key];
    const a = after[key];
    if (JSON.stringify(b) === JSON.stringify(a)) continue;
    const label = FIELD_LABELS[key] ?? key;
    if (b !== undefined && a !== undefined) {
      lines.push(`${label}: ${formatFieldValue(key, b)} ← ${formatFieldValue(key, a)}`);
    } else if (a !== undefined) {
      lines.push(`${label}: ${formatFieldValue(key, a)}`);
    } else if (b !== undefined) {
      lines.push(`${label}: (حُذف) كان ${formatFieldValue(key, b)}`);
    }
  }

  if (!lines.length) {
    return summarizePayload(after);
  }
  return lines;
}

export function getAuditActionLabel(action: string) {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function getAuditEntityLabel(entityType?: string) {
  if (!entityType) return '—';
  return AUDIT_ENTITY_LABELS[entityType] ?? entityType;
}
