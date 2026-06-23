export type DailyPlan = { planned: number; sold: number };

export type PlanVisualStatus = 'ok' | 'low' | 'exhausted' | 'exceeded';

export const PLAN_LOW_REMAINING = 3;

export function planSoldAdjustment(editMode: boolean, editBaselineQty: number) {
  return editMode ? -editBaselineQty : 0;
}

/** المتبقي من الخطة بعد ما في السلة (بدون احتساب الزيادة الجديدة) */
export function planRemaining(
  plan: DailyPlan,
  cartQty: number,
  soldAdjustment = 0,
) {
  return plan.planned - (plan.sold + soldAdjustment) - cartQty;
}

export function planProjectedTotal(
  plan: DailyPlan,
  cartQty: number,
  soldAdjustment = 0,
) {
  return plan.sold + soldAdjustment + cartQty;
}

export function planVisualStatus(
  plan: DailyPlan,
  cartQty: number,
  soldAdjustment = 0,
): PlanVisualStatus {
  const remaining = planRemaining(plan, cartQty, soldAdjustment);
  if (remaining < 0) return 'exceeded';
  if (remaining === 0) return 'exhausted';
  if (remaining <= PLAN_LOW_REMAINING) return 'low';
  return 'ok';
}

export function planStatusLabel(
  plan: DailyPlan,
  cartQty: number,
  soldAdjustment = 0,
): string | null {
  const remaining = planRemaining(plan, cartQty, soldAdjustment);
  const projected = planProjectedTotal(plan, cartQty, soldAdjustment);
  if (remaining < 0) {
    return `تجاوز الخطة: ${projected}/${plan.planned}`;
  }
  if (remaining === 0) {
    return `اكتملت الخطة (${plan.planned})`;
  }
  if (remaining <= PLAN_LOW_REMAINING) {
    return `متبقي ${remaining} من ${plan.planned}`;
  }
  return null;
}

/** تنبيه عند تغيير الكمية — يُطلَق عند عبور عتبات فقط لتقليل الإزعاج */
export function planQuantityChangeAlert(
  productName: string,
  plan: DailyPlan,
  prevCartQty: number,
  nextCartQty: number,
  soldAdjustment = 0,
): string | null {
  if (nextCartQty <= 0) return null;

  const prevRemaining = planRemaining(plan, prevCartQty, soldAdjustment);
  const nextRemaining = planRemaining(plan, nextCartQty, soldAdjustment);
  const projected = planProjectedTotal(plan, nextCartQty, soldAdjustment);
  const name = `«${productName}»`;

  if (nextRemaining < 0) {
    if (prevRemaining >= 0) {
      return `${name}: الكمية المطلوبة (${projected}) أكبر من الخطة (${plan.planned}) — زيادة ${projected - plan.planned}`;
    }
    if (nextCartQty > prevCartQty) {
      return `${name}: لا تزال فوق الخطة — ${projected}/${plan.planned}`;
    }
    return null;
  }

  if (nextRemaining === 0 && prevRemaining > 0) {
    return `${name}: كمية الخطة اليومية اكتملت (${plan.planned}) — يمكنك الاستمرار`;
  }

  if (nextRemaining > 0 && nextRemaining <= PLAN_LOW_REMAINING) {
    const crossedLowBand = prevRemaining > PLAN_LOW_REMAINING;
    const steppedDown = prevRemaining > nextRemaining && prevRemaining <= PLAN_LOW_REMAINING;
    if (crossedLowBand || steppedDown) {
      return `${name}: قربت تخلص — متبقي ${nextRemaining} من ${plan.planned}`;
    }
  }

  return null;
}

export function summarizeCartPlanAlerts(
  cartItems: Array<{ productId: string; name: string; quantity: number }>,
  getPlan: (productId: string) => DailyPlan | undefined,
  editMode: boolean,
  editBaselineQty: Map<string, number>,
): string[] {
  const messages: string[] = [];
  for (const item of cartItems) {
    const plan = getPlan(item.productId);
    if (!plan) continue;
    const adj = planSoldAdjustment(editMode, editBaselineQty.get(item.productId) ?? 0);
    const label = planStatusLabel(plan, item.quantity, adj);
    if (label) messages.push(`${item.name}: ${label}`);
  }
  return messages;
}
