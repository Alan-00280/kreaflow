import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Context, Next } from "hono";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({
	connectionString: databaseUrl,
});
const prisma = new PrismaClient({ adapter });

function withPrisma(c: Context, next: Next) {
	if (!c.get("prisma")) {
		c.set("prisma", prisma);
	}
	return next();
}

export default withPrisma;