import "dotenv/config";
import { planNextTopic } from "./planner/planner";
import { generateBrief, generatePost } from "./generator/generator";
import { findExistingPostBySlug, publishPost, trackPublishedPost } from "./publisher/publisher";

function validateGeneratedPost(post: {
  title: string;
  slug: string;
  excerpt: string;
  meta_description: string;
  content_html: string;
  tags: string[];
}) {
  if (!post.title?.trim()) {
    throw new Error("Generated post is missing title.");
  }

  if (!post.slug?.trim()) {
    throw new Error("Generated post is missing slug.");
  }

  if (!post.content_html?.trim()) {
    throw new Error("Generated post is missing content_html.");
  }

  if (post.content_html.length < 3000) {
    throw new Error("Generated content looks too short.");
  }
}

async function run() {
  const siteKey = process.argv[2] || "hobbies";

  console.log(`Planning next topic for site: ${siteKey}`);
  const { siteConfig, plan } = planNextTopic(siteKey);
  console.log("Planned topic:", plan);

  console.log("Generating brief...");
  const brief = await generateBrief(siteConfig, plan);
  console.log("Brief title:", brief.title);

  console.log("Generating post...");
  const post = await generatePost(siteConfig, plan, brief);

  validateGeneratedPost(post);

  console.log("Checking duplicate slug...");
  const existing = await findExistingPostBySlug(siteConfig, post.slug);
  if (existing) {
    throw new Error(`Slug already exists in WordPress: ${post.slug}`);
  }

  console.log(`Publishing to WordPress as ${siteConfig.wordpress.defaultStatus}...`);
  const wpResponse = await publishPost(siteConfig, post);

  trackPublishedPost(siteKey, plan, post, wpResponse, siteConfig.wordpress.defaultStatus);

  console.log("Done.");
  console.log("Created URL:", wpResponse?.link);
}

run().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});