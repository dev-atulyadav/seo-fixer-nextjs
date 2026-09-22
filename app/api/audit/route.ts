import { NextResponse } from "next/server";
import { db } from "@/db";
import { domains, audits, pageResults } from "@/db/schema";
import { eq } from "drizzle-orm";
import { crawlSinglePage } from "@/lib/crawler";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Valid URL is required" }, { status: 400 });
    }

    // Normalize URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const domainOrigin = new URL(formattedUrl).origin;

    // 1. Find or create the Domain
    let [domain] = await db
      .select()
      .from(domains)
      .where(eq(domains.url, domainOrigin))
      .limit(1);

    if (!domain) {
      [domain] = await db
        .insert(domains)
        .values({ url: domainOrigin })
        .returning();
    }

    // 2. Initialize Audit Record with "PROCESSING"
    const [audit] = await db
      .insert(audits)
      .values({
        domainId: domain.id,
        status: "PROCESSING",
      })
      .returning();

    // 3. Run Crawl
    const crawlData = await crawlSinglePage(domainOrigin);

    // 4. Save Page Result
    await db.insert(pageResults).values({
      auditId: audit.id,
      url: crawlData.url,
      statusCode: crawlData.statusCode,
      title: crawlData.title,
      metaDesc: crawlData.metaDesc,
      h1: crawlData.h1,
      missingAlt: crawlData.missingAlt,
      brokenLinks: crawlData.brokenLinks,
    });

    // 5. Mark Audit as COMPLETED
    await db
      .update(audits)
      .set({ status: "COMPLETED" })
      .where(eq(audits.id, audit.id));

    return NextResponse.json({
      success: true,
      auditId: audit.id,
      domainId: domain.id,
    });
  } catch (error: any) {
    console.error("Audit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process audit" },
      { status: 500 }
    );
  }
}