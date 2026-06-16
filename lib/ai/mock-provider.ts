import type { AIProvider } from "./provider";
import { buildFallbackTopicSearchPlan } from "@/lib/search/topic-search-plan";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockAIProvider: AIProvider = {
  async planTopicSearch(idea) {
    await wait(40);
    return buildFallbackTopicSearchPlan(idea);
  },

  async summarizeBenchmarks(results) {
    await wait(80);

    return {
      summaries: results.map((result) => ({
        url: result.url,
        userPain: "读者真正卡住的是不知道第一步该怎么开始。",
        structurePattern: "先用真实痛点开头，再拆误区，最后给一个最小行动。",
        rhythmNotes: "短段推进，判断句靠前，结尾用开放问题引导互动。",
        commentInsights: ["评论区更关心第一步怎么落地"],
        reusableAngles: [`从「${result.title}」里的具体卡点切入`],
        avoidCopying: ["不要照搬原文经历、数据或作者身份"],
      })),
    };
  },

  async generateTopics({ idea }) {
    await wait(120);

    return {
      topics: [
        {
          id: "topic-strategy",
          title: `${idea} 的增长打法`,
          label: "增长打法",
          angle: "从执行顺序切入，强调可落地性",
          summary: "适合写成方法论文章，突出阶段拆解和行动建议。",
          coreViewpoint: `${idea} 真正的突破口不在堆概念，而在把执行顺序拆清楚。`,
          targetAudience: "正在尝试把想法变成稳定流程的内容创作者与小团队负责人",
          reason: "这个切口既能给方法论，也能带出行动建议，适合沉淀长期流量。",
        },
        {
          id: "topic-mistakes",
          title: `${idea} 最容易踩的三个坑`,
          label: "踩坑预警",
          angle: "从常见误区切入，适合提高打开率",
          summary: "适合痛点型表达，强调反直觉观点和纠偏。",
          coreViewpoint: `${idea} 做不起来，往往不是不够努力，而是先后顺序和判断都错了。`,
          targetAudience: "已经试过一轮、但结果不稳定的执行者",
          reason: "误区切口更容易形成认知反差，适合提高点击和互动。",
        },
        {
          id: "topic-case",
          title: `如何把 ${idea} 做成一个可复用流程`,
          label: "案例复盘",
          angle: "从案例复盘切入，兼顾故事和结构",
          summary: "适合沉淀 SOP 风格内容，突出流程模板。",
          coreViewpoint: `${idea} 最有价值的，不是一次成功，而是把成功拆成可复用流程。`,
          targetAudience: "想把经验沉淀成 SOP 的内容创作者和项目负责人",
          reason: "案例复盘天然带真实感，也容易沉淀成后续可复用内容资产。",
        },
      ],
    };
  },

  async generateBrief({ topicId, topicLabel, topicAngle, coreViewpoint, targetAudience, reason }) {
    await wait(120);

    return {
      brief: {
        objective: `围绕「${topicLabel}」这个方向写出一篇可以直接发布的公众号草稿，重点展开${topicAngle}。`,
        audience: targetAudience,
        persona: "像一个踩过坑、愿意把流程讲透的实战派前辈，陪读者拆清楚问题。",
        tone: "冷静、具体、可信",
        dropOffPoint:
          "让读者真正意识到这件事不能只停留在概念层，并愿意按更稳的顺序开始行动。",
        constraints: [
          "避免空泛口号",
          "保留执行步骤",
          "加入反例提醒",
          `开篇要点明这个选题的核心判断：${coreViewpoint}`,
          `推荐理由要能被正文接住：${reason}`,
          `全文不要偏离选题 ${topicId} 对应的标题方向。`,
        ],
      },
    };
  },

  async generateOutline({
    topicId,
    topicLabel,
    topicAngle,
    coreViewpoint,
    reason,
    structureType,
    briefObjective,
    briefPersona,
    briefDropOffPoint,
    briefConstraints,
  }) {
    await wait(120);

    return {
      outline: [
        {
          id: "hook",
          heading: `先讲清${topicLabel}为什么值得现在做`,
          corePoint: `用真实场景点明为什么这个问题必须现在处理，并承接目标：${briefObjective}`,
          supportSuggestion: `先补一个与 ${topicId} 直接相关的真实痛点场景，再落下核心判断：${coreViewpoint}`,
          sectionRole: "痛点引入",
        },
        {
          id: "framework",
          heading: `再按${structureType}拆出 ${topicAngle} 的核心推进路径`,
          corePoint: `主体部分要层层递进地讲清楚 ${topicAngle} 的核心判断，同时保持 ${briefPersona} 这种真实说话感。`,
          supportSuggestion: `把主体拆成几个关键节点，并满足这些约束：${briefConstraints.join(" / ")}`,
          sectionRole: "核心拆解",
        },
        {
          id: "closing",
          heading: "最后给出结尾与号召信息",
          corePoint: `结尾不能只总结观点，必须围绕这个落脚点收束：${briefDropOffPoint}`,
          supportSuggestion: `收束全文并把“为什么值得做”落回这条理由：${reason}`,
          sectionRole: "结尾号召",
        },
      ],
      materialSlots: [
        {
          id: "slot-case",
          targetOutlineId: "framework",
          label: "案例证据",
          content: `补一个和「${topicLabel}」直接相关的真实操作场景或复盘片段。`,
          placement: "正文核心案例",
          purpose: "让抽象判断落到真实经历，压住 AI 味。",
        },
        {
          id: "slot-quote",
          targetOutlineId: "closing",
          label: "关键金句",
          content: "准备一句能被读者记住的判断。",
          placement: "结尾转化落脚点",
          purpose: "强化文章记忆点，并为结尾号召做承接。",
        },
      ],
    };
  },

  async generateDraft({
    topicId,
    topicLabel,
    topicAngle,
    coreViewpoint,
    reason,
    structureType,
    briefObjective,
    briefPersona,
    briefTone,
    briefDropOffPoint,
    materialSlots,
    outline,
  }) {
    await wait(120);

    return {
      drafts: [
        {
          id: "draft-v1",
          label: "主稿",
          content: `${topicLabel}最值得展开的，不是抽象地谈概念，而是把${topicAngle}这条线拆清楚。\n\n${briefPersona}会先把这件事为什么值得现在做讲透，再顺着${structureType}的结构一点点往下推。\n\n${briefObjective}。如果你总觉得${topicId}很复杂，往往不是因为问题本身太玄，而是没有按正确顺序推进。先从“${outline[0]?.heading ?? "为什么这件事值得做"}”讲起，再把判断、步骤和取舍落到真实工程动作里，读者才能真正看懂它为什么难、又该怎么做。\n\n最核心的判断是：${coreViewpoint}。${outline[0]?.corePoint ?? "这一步最重要的是先讲清核心判断。"} ${outline[0]?.supportSuggestion ?? ""}\n\n${materialSlots[0] ? `【💡需要你补充：${materialSlots[0].content}】` : ""}\n\n最后不要只停在总结上，而是要自然落到这篇文章真正想让读者带走的东西：${briefDropOffPoint}。同时别忘了把这条选题为什么值得做落清楚：${reason}。全文语气保持${briefTone}，但不要说教。`,
        },
      ],
    };
  },

  async completeDraftMaterials({ draft }) {
    await wait(80);
    return {
      drafts: [
        {
          ...draft,
          content: draft.content.replace(
            /【💡需要你补充：[^】]+】/g,
            "设想一个常见场景：团队先用低成本方案验证完整流程，再根据真实反馈决定是否增加投入。"
          ),
        },
      ],
    };
  },

  async formatDraftMarkdown(content) {
    await wait(80);
    return content;
  },

  async generateTitlesAndSummaries({
    topicLabel,
    coreViewpoint,
  }) {
    await wait(120);

    return {
      titles: [
        {
          id: "title-1",
          label: "利益结果型",
          content: `看懂${topicLabel}这 1 点，你就知道真正能打动人的不是表面热闹`,
        },
        {
          id: "title-2",
          label: "场景痛点型",
          content: `为什么你明明很努力推进这件事，结果却总卡在最关键的那一步？`,
        },
        {
          id: "title-3",
          label: "反常识/认知冲突型",
          content: `你以为问题出在执行不够快，其实真正拖慢结果的不是这一点`,
        },
        {
          id: "title-4",
          label: "新机会趋势型",
          content: `当大家都在追表面效率时，真正稀缺的反而是${topicLabel}这种底层判断`,
        },
        {
          id: "title-5",
          label: "个人故事/实录型",
          content: `踩过几次坑之后，我才明白${topicLabel}为什么比想象中更重要`,
        },
      ],
      summaries: [
        {
          id: "summary-1",
          label: "痛点共鸣版",
          content: `如果你也总觉得自己已经很努力了，结果还是卡在关键节点，这篇文章会把真正的问题和解法拆给你看。`,
        },
        {
          id: "summary-2",
          label: "悬念反转版",
          content: `你以为这件事的瓶颈在表面那一步？未必。真正决定结果的，可能恰好是最容易被忽略的那层判断。`,
        },
        {
          id: "summary-3",
          label: "专业克制版",
          content: `这篇文章围绕${coreViewpoint}展开，系统梳理了关键取舍、结构逻辑与可执行判断，适合想把问题真正做深的人。`,
        },
      ],
      coverSuggestion:
        "封面优先用真实工作台截图、流程图或数据界面截图，避免空泛科技感插画；如果没有截图，就用能体现具体场景的实拍图。",
      coverImageConcept: {
        visualConcept: "清晨空荡的办公室，亮屏笔记本与散落便签",
        mood: "冷调晨光，低饱和，胶片质感",
        focalObject: "笔记本屏幕",
        palette: "墨黑 + 暖纸米色 + 一点静默蓝绿",
        titleOverlay: "title",
      },
    };
  },
};
