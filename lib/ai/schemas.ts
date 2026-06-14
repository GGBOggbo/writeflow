import { z } from "zod";

const searchStatusSchema = z.enum(["success", "degraded", "empty"]).optional();
const searchSourceSchema = z.enum(["wechat", "xiaohongshu", "hotlist", "generic"]);
const searchFreshnessSchema = z.enum([
  "noLimit",
  "pastDay",
  "pastWeek",
  "pastMonth",
  "past6Months",
]);
const searchIntentSchema = z.enum(["topics", "brief", "outline", "meta"]);
const searchEngagementMetricsSchema = z.object({
  readCount: z.number().optional(),
  likeCount: z.number().optional(),
  lookingCount: z.number().optional(),
  shareCount: z.number().optional(),
  collectCount: z.number().optional(),
  commentCount: z.number().optional(),
});
const searchArticleCommentSchema = z.object({
  content: z.string(),
  likeCount: z.number().optional(),
  isTop: z.boolean().optional(),
  createdAt: z.string().optional(),
});
const searchQualitySignalsSchema = z.object({
  candidateScore: z.number().optional(),
  stableScore: z.number().optional(),
  anomalyScore: z.number().optional(),
  reasons: z.array(z.string()).optional(),
});
const searchBenchmarkSummarySchema = z.object({
  userPain: z.string(),
  structurePattern: z.string(),
  rhythmNotes: z.string(),
  commentInsights: z.array(z.string()),
  reusableAngles: z.array(z.string()),
  avoidCopying: z.array(z.string()),
});
export const benchmarkSummaryItemSchema = searchBenchmarkSummarySchema.extend({
  url: z.string().trim().min(1),
});
export const benchmarkSummaryResponseSchema = z.object({
  summaries: z.array(benchmarkSummaryItemSchema),
});
const searchResultSchema = z.object({
  title: z.string().trim().min(1),
  snippet: z.string(),
  url: z.string().trim().min(1),
  publishedAt: z.string().optional(),
  source: searchSourceSchema,
  engagementMetrics: searchEngagementMetricsSchema.optional(),
  articleHtml: z.string().optional(),
  comments: z.array(searchArticleCommentSchema).optional(),
  qualitySignals: searchQualitySignalsSchema.optional(),
  benchmarkSummary: searchBenchmarkSummarySchema.optional(),
  seoKeywords: z.array(z.string()).optional(),
  crowdedness: z.enum(["low", "medium", "high"]).optional(),
  staleBuzzwords: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
});
export const searchReferenceBundleSchema = z.object({
  status: z.enum(["success", "degraded", "empty"]),
  query: z.string(),
  intent: searchIntentSchema,
  freshness: searchFreshnessSchema,
  results: z.array(searchResultSchema),
  seoKeywords: z.array(z.string()),
  crowdedness: z.enum(["low", "medium", "high"]),
  staleBuzzwords: z.array(z.string()),
  notes: z.array(z.string()),
});

function inferSectionRole(heading: string) {
  if (heading.includes("结尾") || heading.includes("号召")) {
    return "结尾号召";
  }
  if (heading.includes("为什么") || heading.includes("痛点")) {
    return "痛点引入";
  }
  return "正文模块";
}

function inferMaterialPlacement(label: string) {
  if (label.includes("案例")) {
    return "正文核心案例";
  }
  if (label.includes("开头") || label.includes("场景")) {
    return "开头场景引入";
  }
  if (label.includes("金句") || label.includes("转化")) {
    return "结尾转化落脚点";
  }
  return "正文补充说明";
}

export const topicOptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  angle: z.string(),
  summary: z.string(),
  label: z.string().optional(),
  coreViewpoint: z.string().optional(),
  targetAudience: z.string().optional(),
  reason: z.string().optional(),
}).transform((topic) => ({
  id: topic.id,
  title: topic.title,
  label: topic.label ?? topic.title,
  angle: topic.angle,
  summary: topic.summary,
  coreViewpoint: topic.coreViewpoint ?? topic.summary,
  targetAudience: topic.targetAudience ?? "对这个话题有明确兴趣、正在寻找判断或方法的人",
  reason: topic.reason ?? topic.summary,
}));

export const briefSchema = z.object({
  objective: z.string().trim().min(1),
  audience: z.string().trim().min(1),
  persona: z.string().trim().min(1),
  tone: z.string().trim().min(1),
  dropOffPoint: z.string().trim().min(1),
  constraints: z.array(z.string().trim().min(1)).min(1),
}).transform((brief) => ({
  objective: brief.objective,
  audience: brief.audience,
  persona: brief.persona,
  tone: brief.tone,
  dropOffPoint: brief.dropOffPoint,
  constraints: brief.constraints,
}));

export const outlineSectionSchema = z
  .object({
    id: z.string(),
    heading: z.string(),
    corePoint: z.string().optional(),
    supportSuggestion: z.string().optional(),
    sectionRole: z.string().optional(),
    notes: z.string().optional(),
  })
  .transform((section) => ({
    id: section.id,
    heading: section.heading,
    corePoint: section.corePoint ?? section.notes ?? "请围绕这个节点写出核心判断。",
    supportSuggestion:
      section.supportSuggestion ?? section.notes ?? "补充一个真实案例、步骤或对比支撑。",
    sectionRole: section.sectionRole ?? inferSectionRole(section.heading),
    notes:
      section.notes ??
      `${section.corePoint ?? "请围绕这个节点写出核心判断。"} ${section.supportSuggestion ?? "补充一个真实案例、步骤或对比支撑。"}`,
  }));

export const materialSlotSchema = z
  .object({
    id: z.string(),
    targetOutlineId: z.string().trim().min(1),
    label: z.string(),
    content: z.string(),
    placement: z.string().optional(),
    purpose: z.string().optional(),
  })
  .transform((slot) => ({
    id: slot.id,
    targetOutlineId: slot.targetOutlineId,
    label: slot.label,
    content: slot.content,
    placement: slot.placement ?? inferMaterialPlacement(slot.label),
    purpose: slot.purpose ?? "补充真实案例、数据、经历或关键表达，增强文章真实感。",
  }));

export const draftVersionSchema = z.object({
  id: z.string(),
  label: z.string(),
  content: z.string(),
});

export const metaCardSchema = z.object({
  id: z.string(),
  label: z.string(),
  content: z.string(),
});

const operationIdSchema = z.string().uuid();

export const topicRequestSchema = z.object({
  operationId: operationIdSchema,
  idea: z.string().trim().min(1),
  searchEnabled: z.boolean().optional(),
  searchMode: z.enum(["default", "manual"]).optional(),
});

export const topicResponseSchema = z.object({
  topics: z.array(topicOptionSchema).min(1),
  searchStatus: searchStatusSchema,
  searchContext: searchReferenceBundleSchema.optional(),
});

export const briefRequestSchema = z.object({
  operationId: operationIdSchema,
  topicId: z.string().trim().min(1),
  topicLabel: z.string().trim().min(1),
  topicAngle: z.string().trim().min(1),
  coreViewpoint: z.string().trim().min(1),
  targetAudience: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  structureType: z.string().trim().min(1),
  searchEnabled: z.boolean().optional(),
  searchMode: z.enum(["default", "manual"]).optional(),
  searchContext: searchReferenceBundleSchema.nullable().optional(),
});

export const briefResponseSchema = z.object({
  brief: briefSchema,
  searchStatus: searchStatusSchema,
});

export const outlineRequestSchema = z.object({
  operationId: operationIdSchema,
  topicId: z.string().trim().min(1),
  topicLabel: z.string().trim().min(1),
  topicAngle: z.string().trim().min(1),
  coreViewpoint: z.string().trim().min(1),
  targetAudience: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  structureType: z.string().trim().min(1),
  briefObjective: z.string().trim().min(1),
  briefAudience: z.string().trim().min(1),
  briefPersona: z.string().trim().min(1),
  briefTone: z.string().trim().min(1),
  briefDropOffPoint: z.string().trim().min(1),
  briefConstraints: z.array(z.string().trim().min(1)).min(1),
  searchEnabled: z.boolean().optional(),
  searchMode: z.enum(["default", "manual"]).optional(),
  searchContext: searchReferenceBundleSchema.nullable().optional(),
});

export const outlineResponseSchema = z.object({
  outline: z.array(outlineSectionSchema).min(1),
  materialSlots: z.array(materialSlotSchema),
  searchStatus: searchStatusSchema,
});

export const draftRequestSchema = z.object({
  operationId: operationIdSchema,
  topicId: z.string().trim().min(1),
  topicLabel: z.string().trim().min(1),
  topicAngle: z.string().trim().min(1),
  coreViewpoint: z.string().trim().min(1),
  targetAudience: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  structureType: z.string().trim().min(1),
  briefObjective: z.string().trim().min(1),
  briefAudience: z.string().trim().min(1),
  briefPersona: z.string().trim().min(1),
  briefTone: z.string().trim().min(1),
  briefDropOffPoint: z.string().trim().min(1),
  briefConstraints: z.array(z.string().trim().min(1)).min(1),
  outline: z.array(outlineSectionSchema).min(1),
  materialSlots: z.array(materialSlotSchema),
  searchEnabled: z.boolean().optional(),
  searchMode: z.enum(["default", "manual"]).optional(),
  searchContext: searchReferenceBundleSchema.nullable().optional(),
});

export const draftResponseSchema = z.object({
  drafts: z.array(draftVersionSchema).min(1),
  searchContext: searchReferenceBundleSchema.optional(),
});

export const humanizeDraftRequestSchema = z.object({
  operationId: operationIdSchema,
  draft: draftVersionSchema,
  coreViewpoint: z.string().trim().min(1),
  briefPersona: z.string().trim().min(1),
  briefTone: z.string().trim().min(1),
  briefDropOffPoint: z.string().trim().min(1),
});

export const humanizeDraftResponseSchema = z.object({
  draft: draftVersionSchema,
});

export const humanizedDraftResponseSchema = z.object({
  drafts: z.array(draftVersionSchema).min(1),
});

export const metaRequestSchema = z.object({
  operationId: operationIdSchema,
  topicLabel: z.string().trim().min(1),
  coreViewpoint: z.string().trim().min(1),
  topicAngle: z.string().trim().min(1),
  structureType: z.string().trim().min(1),
  briefObjective: z.string().trim().min(1),
  briefAudience: z.string().trim().min(1),
  briefPersona: z.string().trim().min(1),
  briefDropOffPoint: z.string().trim().min(1),
  draftContent: z.string().trim().min(1),
  searchEnabled: z.boolean().optional(),
  searchMode: z.enum(["default", "manual"]).optional(),
  searchContext: searchReferenceBundleSchema.nullable().optional(),
});

export const coverImageConceptSchema = z.object({
  visualConcept: z.string().trim().min(1),
  mood: z.string().trim().min(1),
  focalObject: z.string().trim().min(1),
  palette: z.string().trim().min(1),
  titleOverlay: z.enum(["none", "tag", "title"]),
  customNegatives: z.string().trim().min(1).optional(),
});

export const metaResponseSchema = z.object({
  titles: z.array(metaCardSchema).length(5),
  summaries: z.array(metaCardSchema).length(3),
  coverSuggestion: z.string().trim().min(1),
  coverImageConcept: coverImageConceptSchema.optional(),
  searchStatus: searchStatusSchema,
});
