import { OpenAPIHono } from "@hono/zod-openapi";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, UserSession } from "../middlewares/auth.js";
import { getDashboardStatsRoute } from "../routes/dashboard.js";

type ContextWithPrisma = {
  Variables: {
    prisma: PrismaClient;
    user?: UserSession;
  };
};

const dashboard = new OpenAPIHono<ContextWithPrisma>();

dashboard.use("*", authMiddleware);

dashboard.openapi(getDashboardStatsRoute, async (c) => {
  try {
    const prisma = c.get("prisma");
    const user = c.get("user") as UserSession | undefined;
    if (!user) {
      return c.json({ error: "Unauthorized: Sesi tidak ditemukan" }, 401);
    }

    const { type, year: queryYear, month: queryMonth } = c.req.valid("query");

    // Fetch counts
    const totalOrders = await prisma.order.count();
    const totalSummaries = await prisma.productOrderSummary.count();
    const totalProducts = await prisma.product.count();
    const totalBundles = await prisma.bundle.count();

    const stats = {
      totalOrders,
      totalSummaries,
      totalProducts,
      totalBundles,
    };

    // Calculate dates based on inputs or defaults
    const now = new Date();
    const currentYear = queryYear ? parseInt(queryYear) : now.getFullYear();
    const currentMonth = queryMonth ? parseInt(queryMonth) : now.getMonth() + 1; // 1-indexed

    const chartData: { label: string; count: number }[] = [];

    if (type === "monthly") {
      // Group orders by month for the specified year
      const startDate = new Date(currentYear, 0, 1); // Jan 1st of year
      const endDate = new Date(currentYear, 11, 31, 23, 59, 59); // Dec 31st of year

      const orders = await prisma.order.findMany({
        where: {
          orderDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          orderDate: true,
        },
      });

      // Initialize monthly counts (Jan to Dec)
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const monthlyCounts = Array(12).fill(0);

      for (const order of orders) {
        const date = new Date(order.orderDate);
        const monthIndex = date.getMonth(); // 0-11
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyCounts[monthIndex]++;
        }
      }

      for (let i = 0; i < 12; i++) {
        chartData.push({
          label: monthNames[i],
          count: monthlyCounts[i],
        });
      }
    } else {
      // type === "daily" -> per hari dalam tiga bulan kebelakang (ending at specified year & month)
      // End date: last day of currentMonth/currentYear
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = new Date(currentYear, currentMonth - 1, lastDayOfMonth, 23, 59, 59);

      // Start date: 3 months ago (e.g., if end is June 30, start is April 1st)
      // To get exactly April 1st from June: currentMonth - 3
      const startDate = new Date(currentYear, currentMonth - 3, 1, 0, 0, 0);

      const orders = await prisma.order.findMany({
        where: {
          orderDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          orderDate: true,
        },
        orderBy: {
          orderDate: "asc",
        },
      });

      // Generate all dates in the range
      const countsMap = new Map<string, number>();
      const tempDate = new Date(startDate);
      while (tempDate <= endDate) {
        const formattedDate = tempDate.toISOString().split("T")[0];
        countsMap.set(formattedDate, 0);
        tempDate.setDate(tempDate.getDate() + 1);
      }

      // Populate counts
      for (const order of orders) {
        const formattedDate = new Date(order.orderDate).toISOString().split("T")[0];
        if (countsMap.has(formattedDate)) {
          countsMap.set(formattedDate, (countsMap.get(formattedDate) || 0) + 1);
        }
      }

      // Convert map to array
      for (const [dateStr, count] of countsMap.entries()) {
        chartData.push({
          label: dateStr,
          count,
        });
      }
    }

    return c.json({ stats, chartData }, 200);
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return c.json({ error: "Internal server error", detail: error.message }, 500);
  }
});

export default dashboard;
