import type { Context, Next } from "hono";
import logger from "../lib/logger.js";

export const loggerMiddleware = async (c: Context, next: Next) => {
	const start = Date.now();
	const method = c.req.method;
	const path = c.req.path;
	const query = c.req.query();
	const role = c.get("role");

	await next();

	const duration = Date.now() - start;
	const status = c.res.status;

	logger.info(
		{
			method,
			path,
			status,
			role,
			duration: `${duration}ms`,
			query: Object.keys(query).length > 0 ? query : undefined,
		},
		`[${method}] ${path} - ${status} (${duration}ms)`,
	);
};
