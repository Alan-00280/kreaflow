import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Kreaflow",
  version: packageJson.version,
  copyright: `© ${currentYear}, Creative Hub.`,
  meta: {
    title: "Kreaflow - Sistem Ekonomi Kreatif",
    description:
      "Kreaflow is a high-performance, type-safe, back-office order logging monorepo application. It is designed specifically for Creative Hub to document transactions, dynamic catalog configurations, custom merchandise requirements, and process-optimized summaries for third-party vendors",
  },
};
