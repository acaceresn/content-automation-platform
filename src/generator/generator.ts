import OpenAI from "openai";
import type { PlannedTopic, SiteConfig } from "../planner/planner";

export type GeneratedBrief = {
  title: string;
  angle: string;
  audience: string;
  outline: string[];
  faq: string[];
};

export type GeneratedPost = {
  title: string;
  slug: string;
  excerpt: string;
  meta_description: string;
  content_html: string;
  tags: string[];
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateBrief(
  siteConfig: SiteConfig,
  plannedTopic: PlannedTopic
): Promise<GeneratedBrief> {
  const prompt = `
You are an SEO content strategist for a hobby website.

Return valid JSON only with this exact structure:
{
  "title": "...",
  "angle": "...",
  "audience": "...",
  "outline": ["...", "..."],
  "faq": ["...", "..."]
}

Site context:
- Site name: ${siteConfig.siteName}
- Language: ${siteConfig.language}
- Tone: ${siteConfig.contentRules.tone}
- Reading level: ${siteConfig.contentRules.readingLevel}

Topic context:
- Cluster: ${plannedTopic.cluster}
- Pillar page: ${plannedTopic.pillar}
- Topic: ${plannedTopic.topic}
- Primary keyword: ${plannedTopic.primaryKeyword}
- Secondary keywords: ${plannedTopic.secondaryKeywords.join(", ")}

Rules:
- Make the article useful for beginners.
- Avoid generic filler.
- Keep SEO natural.
- Outline should be practical and specific.
- FAQ should match search intent.
`;

  const response = await client.responses.create({
    model: "gpt-5.4",
    input: prompt
  });

  const text = response.output_text;
  return JSON.parse(text) as GeneratedBrief;
}

export async function generatePost(
  siteConfig: SiteConfig,
  plannedTopic: PlannedTopic,
  brief: GeneratedBrief
): Promise<GeneratedPost> {
  const prompt = `
You are a senior SEO content writer for a hobby website.

Return valid JSON only with this exact structure:
{
  "title": "...",
  "slug": "...",
  "excerpt": "...",
  "meta_description": "...",
  "content_html": "...",
  "tags": ["...", "...", "..."]
}

Site context:
- Site name: ${siteConfig.siteName}
- Language: ${siteConfig.language}
- Tone: ${siteConfig.contentRules.tone}
- Reading level: ${siteConfig.contentRules.readingLevel}
- Min words: ${siteConfig.contentRules.minWords}
- Max words: ${siteConfig.contentRules.maxWords}
- Include FAQ: ${siteConfig.contentRules.includeFaq}
- Include pros/cons: ${siteConfig.contentRules.includeProsCons}
- Include comparison table: ${siteConfig.contentRules.includeTable}

SEO context:
- Primary keyword: ${plannedTopic.primaryKeyword}
- Secondary keywords: ${plannedTopic.secondaryKeywords.join(", ")}
- Keyword must appear naturally in title, intro, and at least one H2.
- Meta description max length: ${siteConfig.seoRules.metaDescriptionMax}

Brief:
- Title direction: ${brief.title}
- Angle: ${brief.angle}
- Audience: ${brief.audience}
- Outline: ${brief.outline.join(" | ")}
- FAQ: ${brief.faq.join(" | ")}

Rules:
- Write in clean HTML.
- Use <h2> and <h3>.
- Include an intro and conclusion.
- Include specific practical advice.
- Do not invent scientific claims, financial promises, or fake statistics.
- Avoid vague filler sentences.
- Make the content feel human and editorial.
`;

  const response = await client.responses.create({
    model: "gpt-5.4",
    input: prompt
  });

  const text = response.output_text;
  return JSON.parse(text) as GeneratedPost;
}