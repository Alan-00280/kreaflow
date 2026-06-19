// import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { PrismaClient } from "./generated/prisma/client.js";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import withPrisma from "./lib/prisma.js";
import { loggerMiddleware } from "./middlewares/logger.js";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import logger from "./lib/logger.js";
import auth from "./service/auth.js";
import products from "./service/products.js";
import bundles from "./service/bundles.js";
import orders from "./service/orders.js";
import customers from "./service/customers.js";
import productOrderSummaries from "./service/product-order-summaries.js";
import 'dotenv/config'
import { validateSecrets } from "./lib/jwt.js";

type ContextWithPrisma = {
  Variables: {
    prisma: PrismaClient;
  };
};

const app = new OpenAPIHono<ContextWithPrisma>();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

// Global CORS middleware
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return origin;

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".ngrok-free.dev")
      ) {
        return origin;
      }

      return null;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Global logger middleware
app.use("*", withPrisma);
app.use("*", loggerMiddleware);

// Mount services routes
app.route("/auth", auth);
app.route("/products", products);
app.route("/bundles", bundles);
app.route("/orders", orders);
app.route("/customers", customers);
app.route("/product-order-summaries", productOrderSummaries);

const healthRoute = createRoute({
  method: 'get',
  path: 'api/health',
  tags: ['Health'],
  responses: {
    200: {
      content: {
        'text/plain': {
          schema: z.string().openapi({
            example: 'Hello Hono! Helpdesk API Server Activated',
          }),
        },
      },
      description: 'Server berjalan dengan normal',
    },
  },
})

app.openapi(healthRoute, (c) => {
  return c.text("Hello Hono! Kreaflow API Server Activated");
});

// ─────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────

app.notFound((c) => c.json({ error: "Route tidak ditemukan" }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error", detail: err.message }, 500);
});

// ─────────────────────────────────────────
// OPEN API - SWAGGER API DOCUMENTATION
// ─────────────────────────────────────────
app.openAPIRegistry.registerComponent('securitySchemes', 'BearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Masukkan token JWT kamu di sini (Tanpa tulisan "Bearer ")',
})

app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    title: 'Kreaflow API Ecosystem',
    version: '1.0.0',
    // Ringkasan Sistem & Fitur Utama Kreaflow (Mendukung format Markdown)
    description: `
# Kreaflow - Creative & High-Performance Hub

Sistem backend monorepo terdistribusi yang dirancang khusus untuk mengelola ekosistem kreatif Kreaflow secara real-time, scalable, dan type-safe.

---

### 🎯 Fitur Utama & Ruang Lingkup Sistem
* **High-Performance Architecture:** Menggunakan Hono.js untuk routing ultra-cepat dengan overhead minimal.
* **Unified Database Layer:** Manajemen data terpusat menggunakan PostgreSQL dan Prisma ORM dengan arsitektur connection pooling yang aman.
* **Strict Runtime Validation:** Seluruh pintu masuk API dikawal ketat oleh Zod Schema untuk menjamin validitas dan keamanan data.

---

### 🛠 Teknologi Stack
* **Backend Engine:** Node.js (Hono.js) & TypeScript
* **Database & ORM:** PostgreSQL & Prisma ORM
* **Package Management:** pnpm Workspaces
* **Build System:** Turborepo
    `,
    contact: {
      name: 'Kreaflow Core Engineering Team',
      email: 'alanperdana08@gmail.com',
    },
  },
  // Mengelompokkan endpoint sesuai dengan modul Fitur Utama (Dikosongkan terlebih dahulu)
  tags: [],
})

app.get('/ui', swaggerUI({ url: '/doc' }))

// VALIDATE JWTs SECRET REQUIREMENT
validateSecrets()

const port = process.env.PORT ? parseInt(process.env.PORT) : 8000;
serve(
  {
    fetch: app.fetch,
    port: port,
    hostname: "0.0.0.0",
  },
  (info) => {
    const host = process.env.NODE_ENV === 'production' ? 'Production Server' : 'http://localhost'
    logger.info(`Server is running on ${host}:${info.port}`)
  }
)