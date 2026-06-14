import { mockAIProvider } from "@/lib/ai/mock-provider";
import type {
  Brief,
  DraftVersion,
  MaterialSlot,
  MetaCard,
  OutlineSection,
  TopicOption,
} from "@/types/workflow";

export async function generateTopics(idea: string): Promise<TopicOption[]> {
  return (await mockAIProvider.generateTopics({ idea })).topics;
}

export async function generateBrief(
  topicId: string,
  topicLabel = topicId,
  topicAngle = "从最小可运行流程切入",
  coreViewpoint = `围绕 ${topicId} 组织一篇可执行的写作说明。`,
  targetAudience = "内容创作者与小团队负责人",
  reason = `说明为什么 ${topicId} 这个切口值得现在做。`,
  structureType = "痛点拆解型"
): Promise<Brief> {
  return (
    await mockAIProvider.generateBrief({
      topicId,
      topicLabel,
      topicAngle,
      coreViewpoint,
      targetAudience,
      reason,
      structureType,
    })
  ).brief;
}

export async function generateOutline(
  topicId: string,
  topicLabel = topicId,
  topicAngle = "从最小可运行流程切入",
  coreViewpoint = `围绕 ${topicId} 组织文章结构。`,
  targetAudience = "内容创作者与小团队负责人",
  reason = `说明为什么 ${topicId} 这个切口值得现在做。`,
  structureType = "痛点拆解型",
  briefObjective = `围绕 ${topicId} 形成可执行文章大纲。`,
  briefAudience = "内容创作者与小团队负责人",
  briefPersona = "一个踩过坑、愿意把流程讲透的实战派前辈",
  briefTone = "冷静、具体、可信",
  briefDropOffPoint = `让读者记住围绕 ${topicId} 最关键的判断，并愿意开始下一步行动。`,
  briefConstraints = ["避免空泛口号", "保留执行步骤"]
): Promise<{ outline: OutlineSection[]; materialSlots: MaterialSlot[] }> {
  return mockAIProvider.generateOutline({
    topicId,
    topicLabel,
    topicAngle,
    coreViewpoint,
    targetAudience,
    reason,
    structureType,
    briefObjective,
    briefAudience,
    briefPersona,
    briefTone,
    briefDropOffPoint,
    briefConstraints,
  });
}

export async function generateDraftVersions(
  topicId: string,
  topicLabel = topicId,
  topicAngle = "从最小可运行流程切入",
  coreViewpoint = `围绕 ${topicId} 组织正文内容。`,
  targetAudience = "内容创作者与小团队负责人",
  reason = `说明为什么 ${topicId} 这个切口值得现在做。`,
  structureType = "痛点拆解型",
  briefObjective = `围绕 ${topicId} 产出一篇可直接继续修改的高质量初稿。`,
  briefAudience = "内容创作者与小团队负责人",
  briefPersona = "一个踩过坑、愿意把流程讲透的实战派前辈",
  briefTone = "冷静、具体、可信",
  briefDropOffPoint = `让读者记住围绕 ${topicId} 最关键的判断，并愿意开始下一步行动。`,
  briefConstraints = ["避免空泛口号", "保留执行步骤"],
  outline: OutlineSection[] = [],
  materialSlots: MaterialSlot[] = []
): Promise<DraftVersion[]> {
  return (
    await mockAIProvider.generateDraft({
      topicId,
      topicLabel,
      topicAngle,
      coreViewpoint,
      targetAudience,
      reason,
      structureType,
      briefObjective,
      briefAudience,
      briefPersona,
      briefTone,
      briefDropOffPoint,
      briefConstraints,
      outline,
      materialSlots,
    })
  ).drafts;
}

export async function generateMeta(
  topicId: string,
  draftId: string,
  topicLabel = topicId,
  topicAngle = "从最小可运行流程切入",
  coreViewpoint = `围绕 ${topicId} 提炼标题摘要。`,
  structureType = "痛点拆解型",
  briefObjective = `帮助读者理解围绕 ${topicId} 的关键判断。`,
  briefAudience = "内容创作者与小团队负责人",
  briefPersona = "一个踩过坑、愿意把流程讲透的实战派前辈",
  briefDropOffPoint = `让读者记住围绕 ${topicId} 最关键的判断，并愿意开始下一步行动。`,
  draftContent = `围绕 ${topicId} 讲清楚为什么先跑通主流程。`
) : Promise<{ titles: MetaCard[]; summaries: MetaCard[]; coverSuggestion: string; coverImageConcept?: import("@/types/ai").CoverImageConcept }> {
  return mockAIProvider.generateTitlesAndSummaries({
    topicLabel,
    coreViewpoint,
    topicAngle,
    structureType,
    briefObjective,
    briefAudience,
    briefPersona,
    briefDropOffPoint,
    draftContent,
  });
}
