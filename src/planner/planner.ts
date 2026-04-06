import fs from "fs";
import path from "path";

export type ClusterConfig = {
  cluster: string;
  pillar: string;
  topics: string[];
};

export type SiteConfig = {
  siteKey: string;
  siteName: string;
  baseUrl: string;
  language: string;
  countryTargets: string[];
  timezone: string;
  wordpress: {
    username: string;
    defaultStatus: "draft" | "publish";
    defaultAuthorId: number;
    defaultCategoryId: number;
    postEndpoint: string;
    mediaEndpoint: string;
  };
  contentRules: {
    minWords: number;
    maxWords: number;
    includeFaq: boolean;
    includeProsCons: boolean;
    includeTable: boolean;
    maxParagraphLength: number;
    minHeadings: number;
    tone: string;
    readingLevel: string;
    avoidClaims: string[];
  };
  seoRules: {
    keywordInTitle: boolean;
    keywordInIntro: boolean;
    keywordInH2: boolean;
    metaDescriptionMax: number;
    slugMaxLength: number;
    maxInternalLinks: number;
    minInternalLinks: number;
    maxExternalLinks: number;
  };
  scheduler: {
    postsPerWeek: number;
    refreshPostsPerWeek: number;
    publishDays: string[];
    publishHour: number;
  };
  imageGeneration: {
    enabled: boolean;
    style: string;
    aspectRatio: string;
    avoidText: boolean;
  };
  clusters: ClusterConfig[];
  internalLinking: {
    strategy: string;
    maxLinksPerArticle: number;
    linkOnlySameCluster: boolean;
  };
  duplicateControl: {
    checkExistingSlug: boolean;
    checkSimilarTitle: boolean;
    similarityThreshold: number;
  };
  tracking: {
    trackPublishedPosts: boolean;
    trackKeyword: boolean;
    trackCluster: boolean;
  };
};

export type PlannedTopic = {
  cluster: string;
  pillar: string;
  topic: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
};

function loadSiteConfig(siteKey: string): SiteConfig {
  const filePath = path.resolve(process.cwd(), `src/sites/${siteKey}.json`);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as SiteConfig;
}

function getUsedTopics(siteKey: string): string[] {
  const filePath = path.resolve(process.cwd(), `data/published/${siteKey}-topics.json`);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as Array<{ topic: string }>;
  return data.map((x) => x.topic.toLowerCase());
}

function buildSecondaryKeywords(topic: string, cluster: string): string[] {
  const common: Record<string, string[]> = {
    "indoor hobbies": [
      "hobbies for adults at home",
      "relaxing hobbies at home",
      "beginner indoor hobbies"
    ],
    "collecting": [
      "collecting hobby for beginners",
      "best collecting hobbies",
      "how to start collecting"
    ],
    "craft hobbies": [
      "craft hobbies for adults",
      "easy DIY hobbies",
      "creative hobbies at home"
    ]
  };

  return common[cluster] ?? [topic, `${topic} for beginners`];
}

export function planNextTopic(siteKey: string): { siteConfig: SiteConfig; plan: PlannedTopic } {
  const siteConfig = loadSiteConfig(siteKey);
  const usedTopics = getUsedTopics(siteKey);

  for (const cluster of siteConfig.clusters) {
    for (const topic of cluster.topics) {
      if (!usedTopics.includes(topic.toLowerCase())) {
        return {
          siteConfig,
          plan: {
            cluster: cluster.cluster,
            pillar: cluster.pillar,
            topic,
            primaryKeyword: topic,
            secondaryKeywords: buildSecondaryKeywords(topic, cluster.cluster)
          }
        };
      }
    }
  }

  throw new Error(`No pending topics found for site "${siteKey}"`);
}