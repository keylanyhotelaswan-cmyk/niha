import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

const TZ = 'Africa/Cairo';
const DEFAULT_LOOKBACK_DAYS = 365;

export type ProductDayMatrixRow = {
  productId: string;
  productName: string;
  dow: number;
  qtySold: number;
  revenue: number;
  ordersWithItem: number;
  dayStrengthIndex: number | null;
  rankInDay: number;
};

export type WeekOverWeekSummaryRow = {
  weekStart: Date;
  grossSales: number;
  prevGrossSales: number | null;
  wowSalesPct: number | null;
  orderCount: number;
  prevOrderCount: number | null;
  wowOrdersPct: number | null;
  avgTicket: number;
};

export type WeekOverWeekProductRow = {
  productId: string;
  name: string;
  weekStart: Date;
  qty: number;
  prevQty: number | null;
  wowQtyPct: number | null;
  revenue: number;
  prevRevenue: number | null;
};

@Injectable()
export class ReportsAnalyticsService {
  constructor(private prisma: PrismaService) {}

  resolveDateRange(from?: string, to?: string, lookbackDays = DEFAULT_LOOKBACK_DAYS) {
    const toDate = to ? new Date(to) : new Date();
    if (!to) {
      toDate.setHours(23, 59, 59, 999);
    }
    const fromDate = from
      ? new Date(from)
      : new Date(toDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    return { fromDate, toDate };
  }

  async countClosedOrders(branchId: string, fromDate: Date, toDate: Date) {
    const result = await this.prisma.$queryRaw<Array<{ cnt: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS cnt
      FROM "Order" o
      WHERE o."branchId" = ${branchId}
        AND o.status = 'CLOSED'
        AND COALESCE(o."closedAt", o."openedAt") >= ${fromDate}
        AND COALESCE(o."closedAt", o."openedAt") <= ${toDate}
    `);
    return Number(result[0]?.cnt ?? 0);
  }

  async getProductDayMatrix(
    branchId: string,
    from?: string,
    to?: string,
    topPerDay = 10,
  ): Promise<{ rows: ProductDayMatrixRow[]; from: string; to: string; ordersAnalyzed: number }> {
    const { fromDate, toDate } = this.resolveDateRange(from, to);
    const ordersAnalyzed = await this.countClosedOrders(branchId, fromDate, toDate);

    const raw = await this.prisma.$queryRaw<
      Array<{
        product_id: string;
        product_name: string;
        dow: number;
        qty_sold: Prisma.Decimal;
        revenue: Prisma.Decimal;
        orders_with_item: bigint;
        day_strength_index: Prisma.Decimal | null;
        rank_in_day: bigint;
      }>
    >(Prisma.sql`
      WITH sales AS (
        SELECT
          oi."productId" AS product_id,
          p.name AS product_name,
          EXTRACT(DOW FROM COALESCE(o."closedAt", o."openedAt") AT TIME ZONE ${TZ})::int AS dow,
          SUM(oi.quantity) AS qty_sold,
          SUM(oi."lineTotal") AS revenue,
          COUNT(DISTINCT oi."orderId") AS orders_with_item
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        JOIN "Product" p ON p.id = oi."productId"
        WHERE o."branchId" = ${branchId}
          AND o.status = 'CLOSED'
          AND COALESCE(o."closedAt", o."openedAt") >= ${fromDate}
          AND COALESCE(o."closedAt", o."openedAt") <= ${toDate}
        GROUP BY 1, 2, 3
      ),
      baseline AS (
        SELECT product_id, AVG(qty_sold) AS avg_qty
        FROM sales
        GROUP BY 1
      ),
      ranked AS (
        SELECT
          s.product_id,
          s.product_name,
          s.dow,
          s.qty_sold,
          s.revenue,
          s.orders_with_item,
          ROUND((s.qty_sold / NULLIF(b.avg_qty, 0))::numeric, 2) AS day_strength_index,
          ROW_NUMBER() OVER (PARTITION BY s.dow ORDER BY s.qty_sold DESC) AS rank_in_day
        FROM sales s
        JOIN baseline b ON b.product_id = s.product_id
      )
      SELECT * FROM ranked
      WHERE rank_in_day <= ${topPerDay}
      ORDER BY dow, rank_in_day
    `);

    const rows: ProductDayMatrixRow[] = raw.map((r) => ({
      productId: r.product_id,
      productName: r.product_name,
      dow: Number(r.dow),
      qtySold: Number(r.qty_sold),
      revenue: Number(r.revenue),
      ordersWithItem: Number(r.orders_with_item),
      dayStrengthIndex: r.day_strength_index != null ? Number(r.day_strength_index) : null,
      rankInDay: Number(r.rank_in_day),
    }));

    return { rows, from: fromDate.toISOString(), to: toDate.toISOString(), ordersAnalyzed };
  }

  async getWeekOverWeek(branchId: string, weeks = 8) {
    const summaryRaw = await this.prisma.$queryRaw<
      Array<{
        week_start: Date;
        gross_sales: Prisma.Decimal;
        prev_gross_sales: Prisma.Decimal | null;
        wow_sales_pct: Prisma.Decimal | null;
        order_count: bigint;
        prev_order_count: bigint | null;
        wow_orders_pct: Prisma.Decimal | null;
        avg_ticket: Prisma.Decimal;
      }>
    >(Prisma.sql`
      WITH weekly AS (
        SELECT
          date_trunc('week', COALESCE(o."closedAt", o."openedAt") AT TIME ZONE ${TZ}) AS week_start,
          SUM(o."totalAmount") AS gross_sales,
          COUNT(*)::bigint AS order_count,
          SUM(o."totalAmount") / NULLIF(COUNT(*), 0) AS avg_ticket
        FROM "Order" o
        WHERE o."branchId" = ${branchId}
          AND o.status = 'CLOSED'
          AND COALESCE(o."closedAt", o."openedAt") >= NOW() - (${weeks}::int * INTERVAL '1 week')
        GROUP BY 1
      ),
      ranked AS (
        SELECT
          week_start,
          gross_sales,
          order_count,
          avg_ticket,
          LAG(gross_sales) OVER (ORDER BY week_start) AS prev_gross_sales,
          LAG(order_count) OVER (ORDER BY week_start) AS prev_order_count
        FROM weekly
      )
      SELECT
        week_start,
        gross_sales,
        prev_gross_sales,
        ROUND(((gross_sales - prev_gross_sales) / NULLIF(prev_gross_sales, 0) * 100)::numeric, 1) AS wow_sales_pct,
        order_count,
        prev_order_count,
        ROUND(((order_count - prev_order_count)::numeric / NULLIF(prev_order_count, 0) * 100), 1) AS wow_orders_pct,
        avg_ticket
      FROM ranked
      ORDER BY week_start DESC
    `);

    const productRaw = await this.prisma.$queryRaw<
      Array<{
        product_id: string;
        name: string;
        week_start: Date;
        qty: Prisma.Decimal;
        prev_qty: Prisma.Decimal | null;
        wow_qty_pct: Prisma.Decimal | null;
        revenue: Prisma.Decimal;
        prev_revenue: Prisma.Decimal | null;
      }>
    >(Prisma.sql`
      WITH item_weekly AS (
        SELECT
          oi."productId" AS product_id,
          p.name,
          date_trunc('week', COALESCE(o."closedAt", o."openedAt") AT TIME ZONE ${TZ}) AS week_start,
          SUM(oi.quantity) AS qty,
          SUM(oi."lineTotal") AS revenue
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        JOIN "Product" p ON p.id = oi."productId"
        WHERE o."branchId" = ${branchId}
          AND o.status = 'CLOSED'
          AND COALESCE(o."closedAt", o."openedAt") >= NOW() - INTERVAL '52 weeks'
        GROUP BY 1, 2, 3
      ),
      with_lag AS (
        SELECT
          *,
          LAG(qty) OVER (PARTITION BY product_id ORDER BY week_start) AS prev_qty,
          LAG(revenue) OVER (PARTITION BY product_id ORDER BY week_start) AS prev_revenue
        FROM item_weekly
      )
      SELECT
        product_id,
        name,
        week_start,
        qty,
        prev_qty,
        ROUND(((qty - prev_qty) / NULLIF(prev_qty, 0) * 100)::numeric, 1) AS wow_qty_pct,
        revenue,
        prev_revenue
      FROM with_lag
      WHERE week_start = date_trunc('week', NOW() AT TIME ZONE ${TZ})
      ORDER BY wow_qty_pct DESC NULLS LAST
      LIMIT 30
    `);

    const totalOrders = await this.countClosedOrders(
      branchId,
      new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000),
      new Date(),
    );

    return {
      ordersAnalyzed: totalOrders,
      weekly: summaryRaw.map((r) => ({
        weekStart: r.week_start,
        grossSales: Number(r.gross_sales),
        prevGrossSales: r.prev_gross_sales != null ? Number(r.prev_gross_sales) : null,
        wowSalesPct: r.wow_sales_pct != null ? Number(r.wow_sales_pct) : null,
        orderCount: Number(r.order_count),
        prevOrderCount: r.prev_order_count != null ? Number(r.prev_order_count) : null,
        wowOrdersPct: r.wow_orders_pct != null ? Number(r.wow_orders_pct) : null,
        avgTicket: Number(r.avg_ticket),
      })),
      productTrends: productRaw.map((r) => ({
        productId: r.product_id,
        name: r.name,
        weekStart: r.week_start,
        qty: Number(r.qty),
        prevQty: r.prev_qty != null ? Number(r.prev_qty) : null,
        wowQtyPct: r.wow_qty_pct != null ? Number(r.wow_qty_pct) : null,
        revenue: Number(r.revenue),
        prevRevenue: r.prev_revenue != null ? Number(r.prev_revenue) : null,
      })),
    };
  }

  async computeBundleSuggestions(branchId: string, from?: string, to?: string) {
    const { fromDate, toDate } = this.resolveDateRange(from, to);
    const ordersAnalyzed = await this.countClosedOrders(branchId, fromDate, toDate);

    const raw = await this.prisma.$queryRaw<
      Array<{
        product_a: string;
        product_b: string;
        product_a_name: string;
        product_b_name: string;
        pair_orders: bigint;
        support: number;
        confidence_a_to_b: number;
        lift: number;
        price_a: Prisma.Decimal;
        price_b: Prisma.Decimal;
      }>
    >(Prisma.sql`
      WITH baskets AS (
        SELECT o.id AS order_id, oi."productId"
        FROM "Order" o
        JOIN "OrderItem" oi ON oi."orderId" = o.id
        WHERE o."branchId" = ${branchId}
          AND o.status = 'CLOSED'
          AND COALESCE(o."closedAt", o."openedAt") >= ${fromDate}
          AND COALESCE(o."closedAt", o."openedAt") <= ${toDate}
        GROUP BY o.id, oi."productId"
      ),
      pairs AS (
        SELECT
          LEAST(a."productId", b."productId") AS product_a,
          GREATEST(a."productId", b."productId") AS product_b,
          COUNT(DISTINCT a.order_id)::bigint AS pair_orders
        FROM baskets a
        JOIN baskets b
          ON a.order_id = b.order_id
         AND a."productId" < b."productId"
        GROUP BY 1, 2
      ),
      totals AS (
        SELECT COUNT(DISTINCT order_id)::float AS total_orders FROM baskets
      ),
      product_support AS (
        SELECT "productId", COUNT(DISTINCT order_id)::float AS cnt
        FROM baskets GROUP BY 1
      )
      SELECT
        p.product_a,
        p.product_b,
        pa.name AS product_a_name,
        pb.name AS product_b_name,
        p.pair_orders,
        p.pair_orders / t.total_orders AS support,
        p.pair_orders / psa.cnt AS confidence_a_to_b,
        (p.pair_orders / psa.cnt) / (psb.cnt / t.total_orders) AS lift,
        pa."salePrice" AS price_a,
        pb."salePrice" AS price_b
      FROM pairs p
      CROSS JOIN totals t
      JOIN product_support psa ON psa."productId" = p.product_a
      JOIN product_support psb ON psb."productId" = p.product_b
      JOIN "Product" pa ON pa.id = p.product_a
      JOIN "Product" pb ON pb.id = p.product_b
      WHERE t.total_orders >= 3
        AND p.pair_orders >= 2
        AND (
          (t.total_orders >= 100
            AND p.pair_orders / t.total_orders >= 0.01
            AND (p.pair_orders / psa.cnt) / (psb.cnt / t.total_orders) >= 1.2)
          OR
          (t.total_orders < 100
            AND p.pair_orders / t.total_orders >= 0.02
            AND (p.pair_orders / psa.cnt) / (psb.cnt / t.total_orders) >= 1.05)
        )
      ORDER BY
        CASE WHEN pa."categoryId" <> pb."categoryId" THEN 0 ELSE 1 END,
        lift DESC,
        support DESC
      LIMIT 50
    `);

    const computedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.productBundleSuggestion.deleteMany({ where: { branchId } }),
      ...raw.map((r) =>
        this.prisma.productBundleSuggestion.create({
          data: {
            branchId,
            productAId: r.product_a,
            productBId: r.product_b,
            productAName: r.product_a_name,
            productBName: r.product_b_name,
            pairOrders: Number(r.pair_orders),
            support: r.support,
            confidenceAtoB: r.confidence_a_to_b,
            lift: r.lift,
            suggestedPrice: Math.round((Number(r.price_a) + Number(r.price_b)) * 0.9 * 100) / 100,
            computedAt,
          },
        }),
      ),
    ]);

    return {
      count: raw.length,
      ordersAnalyzed,
      computedAt: computedAt.toISOString(),
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    };
  }

  async getBundleSuggestions(branchId: string, maxAgeHours = 24, from?: string, to?: string) {
    const { fromDate, toDate } = this.resolveDateRange(from, to);
    const ordersAnalyzed = await this.countClosedOrders(branchId, fromDate, toDate);

    const latest = await this.prisma.productBundleSuggestion.findFirst({
      where: { branchId },
      orderBy: { computedAt: 'desc' },
      select: { computedAt: true },
    });

    const stale =
      !latest ||
      Date.now() - latest.computedAt.getTime() > maxAgeHours * 60 * 60 * 1000;

    if (stale) {
      await this.computeBundleSuggestions(branchId, from, to);
    }

    const rows = await this.prisma.productBundleSuggestion.findMany({
      where: { branchId },
      orderBy: [{ lift: 'desc' }, { support: 'desc' }],
      take: 50,
    });

    return {
      computedAt: rows[0]?.computedAt?.toISOString() ?? null,
      staleRefreshed: stale,
      ordersAnalyzed,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      suggestions: rows.map((r) => ({
        productAId: r.productAId,
        productBId: r.productBId,
        productAName: r.productAName,
        productBName: r.productBName,
        pairOrders: r.pairOrders,
        support: Number(r.support),
        confidenceAtoB: Number(r.confidenceAtoB),
        lift: Number(r.lift),
        suggestedPrice: r.suggestedPrice != null ? Number(r.suggestedPrice) : null,
      })),
    };
  }

  async getShiftSalesHistory(branchId: string, fromDate: Date, toDate: Date) {
    const raw = await this.prisma.$queryRaw<
      Array<{
        shift_id: string;
        shift_number: string;
        opened_at: Date;
        closed_at: Date | null;
        cashier_name: string | null;
        cash_box_name: string | null;
        snapshot_orders: number | null;
        snapshot_sales: Prisma.Decimal | null;
        orders_count: number;
        total_sales: Prisma.Decimal;
      }>
    >(Prisma.sql`
      SELECT
        s.id AS shift_id,
        s."shiftNumber" AS shift_number,
        s."openedAt" AS opened_at,
        s."closedAt" AS closed_at,
        u."fullName" AS cashier_name,
        cb.name AS cash_box_name,
        sc."ordersCount" AS snapshot_orders,
        sc."totalSales" AS snapshot_sales,
        COUNT(o.id) FILTER (WHERE o.status = 'CLOSED')::int AS orders_count,
        COALESCE(SUM(o."totalAmount") FILTER (WHERE o.status = 'CLOSED'), 0) AS total_sales
      FROM "Shift" s
      LEFT JOIN "ShiftClosing" sc ON sc."shiftId" = s.id
      LEFT JOIN "User" u ON u.id = s."openedById"
      LEFT JOIN "CashBox" cb ON cb.id = s."cashBoxId"
      LEFT JOIN "Order" o ON o."shiftId" = s.id
      WHERE s."branchId" = ${branchId}
        AND s.status = 'CLOSED'
        AND s."closedAt" >= ${fromDate}
        AND s."closedAt" <= ${toDate}
      GROUP BY
        s.id, s."shiftNumber", s."openedAt", s."closedAt",
        u."fullName", cb.name, sc."ordersCount", sc."totalSales"
      ORDER BY s."closedAt" DESC
    `);

    return raw.map((r) => ({
      shiftId: r.shift_id,
      shiftNumber: r.shift_number,
      openedAt: r.opened_at,
      closedAt: r.closed_at,
      cashierName: r.cashier_name ?? 'غير معروف',
      cashBoxName: r.cash_box_name,
      ordersCount: r.snapshot_orders ?? r.orders_count,
      totalSales: Number(r.snapshot_sales ?? r.total_sales),
    }));
  }

  /** كل الفواتير المغلقة — مستقل عن ظهورها في POS بعد إغلاق الوردية */
  async getOperationsBreakdown(branchId: string, fromDate: Date, toDate: Date) {
    const dateFilter = Prisma.sql`
      o."branchId" = ${branchId}
      AND o.status = 'CLOSED'
      AND COALESCE(o."closedAt", o."openedAt") >= ${fromDate}
      AND COALESCE(o."closedAt", o."openedAt") <= ${toDate}
    `;

    const [kpiRows, cashierRows, productRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ cnt: bigint; sales: Prisma.Decimal }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS cnt, COALESCE(SUM(o."totalAmount"), 0) AS sales
        FROM "Order" o
        WHERE ${dateFilter}
      `),
      this.prisma.$queryRaw<Array<{ cashier: string; invoices: number; total: Prisma.Decimal }>>(Prisma.sql`
        SELECT u."fullName" AS cashier, COUNT(*)::int AS invoices, SUM(o."totalAmount") AS total
        FROM "Order" o
        JOIN "User" u ON u.id = o."createdById"
        WHERE ${dateFilter}
        GROUP BY u."fullName"
        ORDER BY SUM(o."totalAmount") DESC
      `),
      this.prisma.$queryRaw<Array<{ name: string; quantity: Prisma.Decimal; revenue: Prisma.Decimal }>>(Prisma.sql`
        SELECT p.name, SUM(oi.quantity) AS quantity, SUM(oi."lineTotal") AS revenue
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        JOIN "Product" p ON p.id = oi."productId"
        WHERE ${dateFilter}
        GROUP BY p.name
        ORDER BY SUM(oi."lineTotal") DESC
        LIMIT 10
      `),
    ]);

    const orderCount = Number(kpiRows[0]?.cnt ?? 0);
    const totalSales = Number(kpiRows[0]?.sales ?? 0);

    return {
      orderCount,
      totalSales,
      salesByCashier: cashierRows.map((r) => ({
        cashier: r.cashier ?? 'غير معروف',
        invoices: r.invoices,
        total: Number(r.total),
      })),
      topSellingItems: productRows.map((r) => ({
        name: r.name,
        quantity: Number(r.quantity),
        revenue: Number(r.revenue),
      })),
    };
  }

  async refreshAllBranchBundles() {
    const branches = await this.prisma.branch.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    let total = 0;
    for (const branch of branches) {
      const result = await this.computeBundleSuggestions(branch.id);
      total += result.count;
    }
    return { branches: branches.length, suggestions: total };
  }
}
