import axios from "axios";
import * as cheerio from "cheerio";

export interface CrawlResult {
  url: string;
  statusCode: number;
  title: string | null;
  metaDesc: string | null;
  h1: string | null;
  missingAlt: number;
  brokenLinks: number;
}

export async function crawlSinglePage(targetUrl: string): Promise<CrawlResult> {
  const urlObj = new URL(targetUrl);
  let statusCode = 200;
  let html = "";

  try {
    const response = await axios.get(targetUrl, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SEOHealthBot/1.0)",
      },
    });
    statusCode = response.status;
    html = response.data;
  } catch (error: any) {
    statusCode = error.response?.status || 500;
    return {
      url: targetUrl,
      statusCode,
      title: null,
      metaDesc: null,
      h1: null,
      missingAlt: 0,
      brokenLinks: 0,
    };
  }

  const $ = cheerio.load(html);

  // 1. Extract Core Meta
  const title = $("title").first().text().trim() || null;
  const metaDesc =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;
  const h1 = $("h1").first().text().trim() || null;

  // 2. Count Images Missing alt Attributes
  let missingAlt = 0;
  $("img").each((_, el) => {
    const alt = $(el).attr("alt");
    if (!alt || alt.trim() === "") {
      missingAlt++;
    }
  });

  // 3. Inspect Internal Links (Sample up to 5 to avoid timeouts)
  const linksToCheck: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    try {
      const resolved = new URL(href, targetUrl);
      // Only check same-origin internal links
      if (
        resolved.origin === urlObj.origin &&
        !linksToCheck.includes(resolved.href) &&
        !resolved.pathname.match(/\.(png|jpg|jpeg|gif|svg|pdf|zip)$/i)
      ) {
        linksToCheck.push(resolved.href);
      }
    } catch {
      // Ignore malformed hrefs
    }
  });

  let brokenLinks = 0;
  const sampleLinks = linksToCheck.slice(0, 5);

  await Promise.all(
    sampleLinks.map(async (link) => {
      try {
        const res = await axios.head(link, {
          timeout: 4000,
          validateStatus: () => true, // Don't throw on 4xx/5xx
        });
        if (res.status >= 400) brokenLinks++;
      } catch {
        brokenLinks++;
      }
    }),
  );

  return {
    url: targetUrl,
    statusCode,
    title,
    metaDesc,
    h1,
    missingAlt,
    brokenLinks,
  };
}
