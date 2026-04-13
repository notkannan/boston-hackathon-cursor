import { FirecrawlClient } from "@mendable/firecrawl-js";
import fs from "fs";
import path from "path";

async function main() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.error("FIRECRAWL_API_KEY is not set");
    process.exit(1);
  }

  const client = new FirecrawlClient({ apiKey });

  console.log("Crawling cursorboston.com...");

  const result = await client.crawl("https://cursorboston.com", {
    limit: 20,
    scrapeOptions: {
      formats: ["markdown"],
    },
  });

  const pages = (result.data ?? []).map((page: {
    url?: string;
    markdown?: string;
    metadata?: Record<string, unknown>;
  }) => ({
    url: page.url ?? "",
    title: String(page.metadata?.title ?? ""),
    description: String(page.metadata?.description ?? ""),
    content: page.markdown ?? "",
  }));

  const output = {
    crawledAt: new Date().toISOString(),
    site: "cursorboston.com",
    description: "Boston's Cursor AI coding community — meetups, workshops, and hackathons.",
    contact: "hello@cursorboston.com",
    pages,
  };

  const outPath = path.join(process.cwd(), "lib", "company-context.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`Done. ${pages.length} pages saved to lib/company-context.json`);
}

main();
