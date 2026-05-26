import { REDO_PROMPT_VERSION } from "~/domain/generation-prompts/redo-skill";
import type { RedoLocalBundle } from "./schema";
import { parseRedoLocalBundle, REDO_LOCAL_BUNDLE_VERSION, REDO_LOCAL_SOURCE_MODE } from "./schema";

type MarkdownSource = {
  id: string;
  title: string;
  url: string;
  sourceType: RedoLocalBundle["sources"][number]["sourceType"];
  trustLevel: RedoLocalBundle["sources"][number]["trustLevel"];
  retrievedAt: string;
  supportsClaimIds: string[];
  note: string;
};

type ParsedStage = RedoLocalBundle["stages"][number];

export function parseRedoMarkdownToLocalBundle(
  markdown: string,
  params: {
    promptVersion?: string;
    exportedAt?: string;
    language?: "zh" | "en";
  } = {}
): RedoLocalBundle {
  const exportedAt = params.exportedAt || new Date().toISOString();
  const topicDisplayName = parseTopicDisplayName(markdown);
  const debtIdMap = buildDebtIdMap(markdown);
  const stages = parseStages(markdown, debtIdMap);
  const sources = parseSources(markdown, exportedAt);
  const claims = stages.map((stage) => ({
    id: `claim-${stage.id}`,
    statement: `${topicDisplayName} 的 ${stage.title} 阶段由约束“${stage.constraint}”驱动。`,
    claimType: "fact" as const,
    confidence: "medium" as const,
    moduleId: stage.id,
    sourceEvidenceIds: [`evidence-${stage.id}`],
    inferenceBasisClaimIds: [],
    publishable: true,
  }));
  const sourceEvidence = stages.map((stage) => {
    const source = findSourceForStage(sources, stage.number) || sources[0];
    return {
      id: `evidence-${stage.id}`,
      sourceId: source.id,
      excerpt: source.note || source.title,
      locator: `参考来源；阶段 ${stage.number}`,
      retrievedAt: source.retrievedAt,
      contentHash: stableHash(`${source.url}:${stage.id}:${source.note}`),
      supportsClaimIds: [`claim-${stage.id}`],
      evidenceType: "derived_signal" as const,
    };
  });
  const sourceClaimIdsBySource = new Map<string, string[]>();
  for (const evidence of sourceEvidence) {
    const claimIds = sourceClaimIdsBySource.get(evidence.sourceId) || [];
    claimIds.push(...evidence.supportsClaimIds);
    sourceClaimIdsBySource.set(evidence.sourceId, claimIds);
  }

  const bundle = {
    bundleVersion: REDO_LOCAL_BUNDLE_VERSION,
    sourceMode: REDO_LOCAL_SOURCE_MODE,
    promptVersion: params.promptVersion || REDO_PROMPT_VERSION,
    exportedAt,
    language: params.language || "zh",
    topic: {
      slug: slugifyTopic(topicDisplayName),
      displayName: topicDisplayName,
      aliases: topicDisplayName.includes("Kafka") ? ["Apache Kafka"] : [],
      category: "distributed-systems",
    },
    designQuestions: stages.map((stage) => ({
      slug: stage.slug,
      title: stage.title,
      summary: stage.constraint,
    })),
    sources: sources.map((source) => ({
      ...source,
      supportsClaimIds: sourceClaimIdsBySource.get(source.id) || [],
    })),
    sourceEvidence,
    evidenceClaims: claims,
    orientation: parseOrientation(markdown, topicDisplayName),
    stages,
    throughline: parseThroughline(markdown, topicDisplayName),
    transferablePattern: buildTransferablePattern(markdown, topicDisplayName),
    boundaries: buildBoundaries(markdown),
    debtMap: parseDebtMap(markdown, debtIdMap),
    painRanking: parsePainRanking(markdown, debtIdMap, stages),
    causalChain: parseCausalChain(markdown, stages),
  };

  return parseRedoLocalBundle(bundle);
}

function parseTopicDisplayName(markdown: string): string {
  const title = markdown.match(/^#\s+(.+?)(?:[:：].*)?$/m)?.[1]?.trim();
  return stripMarkdown(title || "redo-topic");
}

function parseOrientation(markdown: string, topicDisplayName: string) {
  return {
    whatItIs:
      parseBoldField(markdown, "它是什么") ||
      `${topicDisplayName} 是一个成熟技术系统。`,
    centralPressure:
      parseBoldField(markdown, "核心压力") ||
      `${topicDisplayName} 的演化由核心工程约束推动。`,
    tradeoffTheme:
      parseBoldField(markdown, "反复出现的权衡") ||
      `${topicDisplayName} 反复在能力、复杂度和运行成本之间做取舍。`,
    oneSentenceVersion: parseOneSentence(markdown, topicDisplayName),
  };
}

function parseStages(
  markdown: string,
  debtIdMap: Map<string, string>
): ParsedStage[] {
  const matches = [...markdown.matchAll(/^##\s+阶段\s+(\d+)[:：]\s*(.+)$/gm)];
  return matches.map((match, index) => {
    const number = Number(match[1]);
    const rawTitle = match[2].trim();
    const nextIndex =
      index + 1 < matches.length ? matches[index + 1].index || markdown.length : markdown.indexOf("\n## 贯穿主线");
    const section = markdown.slice(match.index || 0, nextIndex > -1 ? nextIndex : markdown.length);
    const titleMatch = rawTitle.match(/^(.+?)\s*[（(](.+)[)）]\s*$/);
    const title = stripMarkdown(titleMatch?.[1] || rawTitle);
    const period = stripMarkdown(titleMatch?.[2] || "unknown");
    const debtsIntroduced = parseDebtLine(section, "埋下的雷", debtIdMap).map(
      ({ debtId, summary }) => ({ debtId, summary })
    );

    return {
      id: `stage-${number}`,
      number,
      slug: `stage-${number}`,
      title,
      period,
      constraint:
        parseBoldField(section, "当时约束") ||
        parseBoldField(section, "约束") ||
        `${title} 阶段的工程约束。`,
      options: parseOptions(section),
      keyTradeoff:
        parseBoldField(section, "核心权衡") ||
        `${title} 阶段的核心取舍。`,
      debtsIntroduced,
      debtsRepaid: parseDebtLine(section, "偿还的雷", debtIdMap).map(
        ({ debtId, summary }) => ({
          debtId,
          repaymentType: "mitigated" as const,
          summary,
        })
      ),
      claimIds: [`claim-stage-${number}`],
      inferenceNoteIds: [],
    };
  });
}

function parseOptions(section: string): ParsedStage["options"] {
  const table = section.match(
    /\|\s*候选方案\s*\|\s*代价\s*\|\s*为何胜选或落选\s*\|[\s\S]+?(?=\n\n\*\*)/
  )?.[0];
  if (!table) {
    return fallbackOptions();
  }

  const rows = table
    .split("\n")
    .filter((line) => line.trim().startsWith("|"))
    .slice(2);

  const parsed = rows.map((row) => {
    const cells = row
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    const labelMatch = stripMarkdown(cells[0] || "").match(/^([A-Z])\.\s*(.+)$/);
    return {
      label: labelMatch?.[1] || "A",
      name: labelMatch?.[2] || stripMarkdown(cells[0] || "Option"),
      cost: stripMarkdown(cells[1] || "Unknown cost."),
      outcome: cells[0]?.includes("**") ? ("chosen" as const) : ("rejected" as const),
      why: stripMarkdown(cells[2] || "No reason provided."),
    };
  });

  if (parsed.filter((option) => option.outcome === "chosen").length !== 1) {
    parsed.forEach((option, index) => {
      option.outcome = index === parsed.length - 1 ? "chosen" : "rejected";
    });
  }

  return parsed.length >= 3 ? parsed : fallbackOptions();
}

function parseThroughline(markdown: string, topicDisplayName: string) {
  const section = sectionBetween(markdown, "贯穿主线", "技术债地图");
  const paragraphs = section
    .split("\n\n")
    .map((paragraph) => stripMarkdown(paragraph.trim()))
    .filter(Boolean);
  const tableRows = parseMarkdownTable(section);
  const sentence =
    section.match(/\*\*能在设计评审中引用的一句话：\*\*\s*["“](.+?)["”]/)?.[1] ||
    `${topicDisplayName} 的演化是一串围绕核心抽象的取舍。`;

  return {
    summary:
      paragraphs.find((paragraph) => !paragraph.startsWith("代价")) ||
      `${topicDisplayName} 的主线是围绕核心抽象持续吸收系统复杂度。`,
    cost:
      paragraphs.find((paragraph) => paragraph.startsWith("代价")) ||
      "代价是系统边界内的复杂度持续上升。",
    repeatedChoices: tableRows.map((row) => ({
      repeatedChoice: row[0] || "重复选择",
      whatItAvoided: row[1] || "避免外部复杂度",
      whatItMadeHarder: row[2] || "增加内部复杂度",
      outcome: row[3] || "形成可复用但有代价的设计",
    })),
    designReviewSentence: sentence,
  };
}

function buildTransferablePattern(markdown: string, topicDisplayName: string) {
  const painSection = sectionBetween(markdown, "痛点排行", "因果链");
  const rows = parseMarkdownTable(painSection);
  const siblings = rows
    .flatMap((row) => extractKnownSystems(row[3] || ""))
    .filter(unique)
    .slice(0, 5)
    .map((system) => ({
      system,
      sameIdea:
        system === "Flink"
          ? "将状态恢复和流处理能力做成专用运行时。"
          : "围绕一个更窄的系统边界重新分配 Kafka 承担的复杂度。",
      sharedConstraint: "都在处理吞吐、持久性、协调或状态恢复压力。",
      differentPrice:
        system === "Flink"
          ? "需要运行专门的流处理集群。"
          : "减少 Kafka 兼容性负担，但付出迁移或生态成熟度成本。",
    }));

  return {
    name: "日志作为通用协调原语",
    summary: `${topicDisplayName} 的可迁移模式是把事件历史、复制、偏移量、事务和元数据尽可能收敛到日志抽象上。`,
    siblings:
      siblings.length > 0
        ? siblings
        : [
            {
              system: "Event sourcing",
              sameIdea: "用事件历史重建状态。",
              sharedConstraint: "需要可重放、可审计的事实序列。",
              differentPrice: "应用层 schema 演化和查询路径更复杂。",
            },
          ],
  };
}

function buildBoundaries(markdown: string) {
  const rows = parseMarkdownTable(sectionBetween(markdown, "痛点排行", "因果链"));
  return [
    {
      counterexample: "低 RTO 的大状态流处理",
      oppositeChoice: "使用带增量检查点和专用调度的流处理引擎。",
      boundaryRule:
        rows.find((row) => row.join(" ").includes("Flink"))?.[2] ||
        "当状态恢复时间比日志复用更重要时，不要把 Kafka Streams 当作主处理引擎。",
    },
    {
      counterexample: "需要存算彻底分离的云原生消息系统",
      oppositeChoice: "从第一天就把存储段和计算节点拆开。",
      boundaryRule:
        rows.find((row) => row.join(" ").includes("AutoMQ"))?.[2] ||
        "当保留期和弹性伸缩是主压力时，单纯复制 Kafka 本地盘模型会放大成本。",
    },
  ];
}

function parseDebtMap(markdown: string, debtIdMap: Map<string, string>) {
  const resolvedRows = parseMarkdownTable(sectionBetween(markdown, "已偿还", "未偿还"));
  const unresolvedRows = parseMarkdownTable(sectionBetween(markdown, "未偿还", "痛点排行"));

  return {
    resolved: resolvedRows.map((row) => ({
      debtId: normalizeDebtId(row[0], debtIdMap),
      debt: withOriginalDebtId(row[0], row[1], debtIdMap),
      introducedInStage: stageRef(row[2]),
      resolvedOrMitigatedInStage: stageRef(row[3]),
      resolution: row[4] || "已在后续阶段偿还。",
    })),
    mitigated: [],
    unresolved: unresolvedRows.map((row) => ({
      debtId: normalizeDebtId(row[0], debtIdMap),
      debt: withOriginalDebtId(row[0], row[1], debtIdMap),
      introducedInStage: inferIntroducedStage(row[0], markdown),
      whyItRemainsHard: row[2] || "仍需要跨系统协调。",
      currentManifestation: row[3] || "在生产使用中仍然可见。",
    })),
  };
}

function parsePainRanking(
  markdown: string,
  debtIdMap: Map<string, string>,
  stages: ParsedStage[]
) {
  const introducedDebtIds = stages.flatMap((stage) =>
    stage.debtsIntroduced.map((debt) => debt.debtId)
  );
  return parseMarkdownTable(sectionBetween(markdown, "痛点排行", "因果链")).map(
    (row, index) => ({
      rank: Number(row[0]) || index + 1,
      painPoint: stripMarkdown(row[1] || `痛点 ${index + 1}`),
      oneLineExplanation: row[2] || "该痛点来自历史设计取舍。",
      competitiveAttackAngle: row[3] || "N/A",
      relatedDebtIds:
        extractDebtIds(row.join(" "), debtIdMap).length > 0
          ? extractDebtIds(row.join(" "), debtIdMap)
          : [introducedDebtIds[index] || introducedDebtIds[0] || "D1"],
    })
  );
}

function parseCausalChain(markdown: string, stages: ParsedStage[]) {
  const section = sectionBetween(markdown, "因果链", "参考来源");
  const story = section.match(/```(?:text)?\n([\s\S]+?)```/)?.[1]?.trim();
  return {
    story: story || "因果链未提供。",
    oneSentenceVersion: parseOneSentence(markdown, "该系统"),
    stageRefs: stages.map((stage) => stage.id),
    debtRefs: stages.flatMap((stage) =>
      stage.debtsIntroduced.map((debt) => debt.debtId)
    ),
  };
}

function parseSources(markdown: string, retrievedAt: string): MarkdownSource[] {
  const section = sectionAfter(markdown, "参考来源");
  const matches = [
    ...section.matchAll(
      /^-\s+\*\*(.+?)：\*\*\s+\[(.+?)\]\((.+?)\)\s*(?:\((.+?)\))?\s*—\s*(.+)$/gm
    ),
  ];
  const sources = matches.map((match, index) => ({
    id: `source-${index + 1}`,
    title: stripMarkdown(match[2]),
    url: match[3],
    sourceType: classifySource(`${match[1]} ${match[2]} ${match[5]}`),
    trustLevel: classifyTrust(`${match[1]} ${match[2]}`),
    retrievedAt,
    supportsClaimIds: [],
    note: stripMarkdown(`${match[1]}：${match[5]}`),
  }));

  if (sources.length === 0) {
    throw new Error("Markdown import requires a reference source list.");
  }

  return sources;
}

function buildDebtIdMap(markdown: string): Map<string, string> {
  const rawIds = [
    ...new Set(
      [...markdown.matchAll(/\bD[0-9]+(?:[A-Za-z]+|-\d+)?\b/g)].map(
        (match) => match[0]
      )
    ),
  ];
  const cleanIds = rawIds.filter((id) => /^D[1-9]\d*$/.test(id));
  let next = Math.max(0, ...cleanIds.map((id) => Number(id.slice(1)))) + 1;
  const map = new Map<string, string>();
  for (const id of rawIds) {
    if (/^D[1-9]\d*$/.test(id)) {
      map.set(id, id);
    } else if (/^D[1-9]\d*-\d+$/.test(id)) {
      map.set(id, id.match(/^D[1-9]\d*/)?.[0] || "D1");
    } else {
      map.set(id, `D${next}`);
      next += 1;
    }
  }
  return map;
}

function parseDebtLine(
  section: string,
  label: string,
  debtIdMap: Map<string, string>
): Array<{ debtId: string; summary: string }> {
  const value = parseBoldField(section, label);
  if (!value) {
    return [];
  }
  const ids = extractRawDebtIds(value);
  if (ids.length === 0) {
    return [];
  }
  const summary = value.replace(/^\s*D[^\s]+\s*[-—:：]?\s*/, "").trim();
  return ids.map((id) => ({
    debtId: normalizeDebtId(id, debtIdMap),
    summary: withOriginalDebtId(id, summary || value, debtIdMap),
  }));
}

function parseBoldField(markdown: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`\\*\\*${escaped}[:：]\\*\\*\\s*([^\\n]+)`));
  return match ? stripMarkdown(match[1].trim()) : null;
}

function parseOneSentence(markdown: string, fallbackSubject: string): string {
  return (
    parseBoldField(markdown, "一句话总结") ||
    `${fallbackSubject} 的演化可以理解为一串围绕核心约束的理性取舍。`
  );
}

function sectionBetween(markdown: string, startHeading: string, endHeading: string): string {
  const start = markdown.search(new RegExp(`^#{2,3}\\s+${startHeading}`, "m"));
  if (start < 0) {
    return "";
  }
  const rest = markdown.slice(start);
  const end = rest.search(new RegExp(`\\n#{2,3}\\s+${endHeading}`, "m"));
  return end < 0 ? rest : rest.slice(0, end);
}

function sectionAfter(markdown: string, startHeading: string): string {
  const start = markdown.search(new RegExp(`^#{2,3}\\s+${startHeading}`, "m"));
  return start < 0 ? "" : markdown.slice(start);
}

function parseMarkdownTable(section: string): string[][] {
  const tableLines = section
    .split("\n")
    .filter((line) => line.trim().startsWith("|"));
  if (tableLines.length < 3) {
    return [];
  }
  return tableLines.slice(2).map((line) =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => stripMarkdown(cell.trim()))
  );
}

function fallbackOptions(): ParsedStage["options"] {
  return [
    {
      label: "A",
      name: "保持现状",
      cost: "无法处理新增约束。",
      outcome: "rejected",
      why: "没有解决阶段核心压力。",
    },
    {
      label: "B",
      name: "采用更重的通用方案",
      cost: "复杂度和迁移成本过高。",
      outcome: "rejected",
      why: "在当时约束下过度设计。",
    },
    {
      label: "C",
      name: "选择局部可演进方案",
      cost: "留下后续技术债。",
      outcome: "chosen",
      why: "在当前约束下平衡了交付速度和后续演进。",
    },
  ];
}

function findSourceForStage(sources: MarkdownSource[], stageNumber: number) {
  return sources.find((source) => source.note.includes(`阶段 ${stageNumber}`));
}

function classifySource(text: string): MarkdownSource["sourceType"] {
  if (/论文/.test(text)) return "paper";
  if (/KIP|proposal|协议/.test(text)) return "proposal";
  if (/设计/.test(text)) return "design_doc";
  if (/Blog|博客/.test(text)) return "engineering_blog";
  return "secondary_context";
}

function classifyTrust(text: string): MarkdownSource["trustLevel"] {
  if (/论文|KIP|设计|Apache Kafka Wiki/.test(text)) return "primary";
  if (/Confluent|LinkedIn/.test(text)) return "high";
  return "medium";
}

function extractKnownSystems(text: string): string[] {
  return ["Pulsar", "Flink", "AutoMQ", "Redpanda", "NATS JetStream", "Redis Streams"].filter(
    (system) => text.includes(system)
  );
}

function extractDebtIds(text: string, debtIdMap: Map<string, string>): string[] {
  return extractRawDebtIds(text).map((id) => normalizeDebtId(id, debtIdMap)).filter(unique);
}

function extractRawDebtIds(text: string): string[] {
  return [
    ...new Set(
      [...text.matchAll(/\bD[0-9]+(?:[A-Za-z]+|-\d+)?\b/g)].map(
        (match) => match[0]
      )
    ),
  ];
}

function normalizeDebtId(id: string, debtIdMap: Map<string, string>): string {
  return debtIdMap.get(id) || (id.match(/^D[1-9]\d*$/) ? id : "D1");
}

function withOriginalDebtId(
  originalId: string,
  text: string,
  debtIdMap: Map<string, string>
): string {
  const normalized = normalizeDebtId(originalId, debtIdMap);
  return normalized === originalId ? text : `(原 ${originalId}) ${text}`;
}

function inferIntroducedStage(rawDebtId: string, markdown: string): string {
  const debtIndex = markdown.indexOf(rawDebtId);
  if (debtIndex < 0) {
    return "stage-1";
  }
  const headings = [...markdown.matchAll(/^##\s+阶段\s+(\d+)[:：]/gm)];
  const heading = headings
    .filter((match) => (match.index || 0) <= debtIndex)
    .at(-1);
  return heading ? `stage-${heading[1]}` : "stage-1";
}

function stageRef(value: string | undefined): string {
  const match = value?.match(/阶段\s*(\d+)/);
  return match ? `stage-${match[1]}` : "stage-1";
}

function slugifyTopic(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/^apache\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "redo-topic";
}

function stripMarkdown(value: string): string {
  return value
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function stableHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return `hash-${hash.toString(16)}`;
}

function unique<T>(value: T, index: number, array: T[]): boolean {
  return array.indexOf(value) === index;
}
