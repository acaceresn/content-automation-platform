import fs from "fs";
import path from "path";
import type { GeneratedPost } from "../generator/generator";
import type { PlannedTopic, SiteConfig } from "../planner/planner";

type PublishedRecord = {
  topic: string;
  title: string;
  slug: string;
  cluster: string;
  keyword: string;
  url?: string;
  publishedAt: string;
  status: string;
};

function getAuthHeader(): string {
  const username = process.env.WP_USERNAME;
  const appPassword = process.env.WP_APP_PASSWORD;

  if (!username || !appPassword) {
    throw new Error("Missing WP_USERNAME or WP_APP_PASSWORD in environment variables.");
  }

  const token = Buffer.from(`${username}:${appPassword}`).toString("base64");
  return `Basic ${token}`;
}

export async function findExistingPostBySlug(siteConfig: SiteConfig, slug: string): Promise<any | null> {
  const url = `${siteConfig.baseUrl}${siteConfig.wordpress.postEndpoint}?slug=${encodeURIComponent(slug)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader()
    }
  });

  if (!res.ok) {
    throw new Error(`Failed checking existing slug: ${res.status} ${await res.text()}`);
  }

  const posts = await res.json();
  return Array.isArray(posts) && posts.length > 0 ? posts[0] : null;
}

export async function publishPost(siteConfig: SiteConfig, post: GeneratedPost): Promise<any> {
  const url = `${siteConfig.baseUrl}${siteConfig.wordpress.postEndpoint}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content_html,
      status: siteConfig.wordpress.defaultStatus,
      author: siteConfig.wordpress.defaultAuthorId,
      categories: [siteConfig.wordpress.defaultCategoryId]
    })
  });

  if (!res.ok) {
    throw new Error(`Failed creating post: ${res.status} ${await res.text()}`);
  }

  return await res.json();
}

export function trackPublishedPost(
  siteKey: string,
  plannedTopic: PlannedTopic,
  post: GeneratedPost,
  wpResponse: any,
  status: string
): void {
  const dirPath = path.resolve(process.cwd(), "data/published");
  const filePath = path.resolve(dirPath, `${siteKey}-topics.json`);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  let existing: PublishedRecord[] = [];
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    existing = JSON.parse(raw) as PublishedRecord[];
  }

  const record: PublishedRecord = {
    topic: plannedTopic.topic,
    title: post.title,
    slug: post.slug,
    cluster: plannedTopic.cluster,
    keyword: plannedTopic.primaryKeyword,
    url: wpResponse?.link,
    publishedAt: new Date().toISOString(),
    status
  };

  existing.push(record);
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), "utf-8");
}