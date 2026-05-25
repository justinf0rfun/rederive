import { REDO_CONTRACT_VERSION, type RedoCaseSnapshot } from "./contract";

export function createValidRedoCaseSnapshot(): RedoCaseSnapshot {
  return {
    contractVersion: REDO_CONTRACT_VERSION,
    language: "zh",
    topic: {
      id: "topic-kafka",
      slug: "kafka",
      displayName: "Kafka",
      aliases: ["Apache Kafka"],
      category: "distributed-systems",
    },
    version: {
      id: "version-kafka-1",
      number: 1,
      publishedAt: "2026-05-23T00:00:00.000Z",
      revisionNote: "Initial reviewed seed.",
    },
    trust: {
      reviewed: true,
      sourceCount: 3,
      paperOrDesignDocCount: 1,
      claimCount: 2,
      inferenceCount: 1,
      controversialJudgmentCount: 0,
    },
    orientation: {
      whatItIs: "A distributed event streaming platform.",
      centralPressure: "Durable ordered event movement across many consumers.",
      tradeoffTheme: "Make the log central to simplify replay and distribution.",
      oneSentenceVersion:
        "Kafka repeatedly trades local simplicity for log-centered operational discipline.",
    },
    designQuestions: [
      {
        slug: "why-logs-become-core-abstractions",
        title: "为什么日志会变成系统核心抽象？",
        summary: "Append-only history can make replay and fan-out tractable.",
      },
    ],
    stages: [
      {
        id: "stage-1",
        number: 1,
        slug: "durable-log",
        title: "Make durable history the center",
        period: "early design",
        constraint:
          "Many consumers needed independent replay without coupling producers to every downstream system.",
        options: [
          {
            label: "A",
            name: "Direct service fan-out",
            cost: "Producer complexity",
            outcome: "rejected",
            why: "It couples producers to every downstream consumer.",
          },
          {
            label: "B",
            name: "Queue per consumer",
            cost: "Storage duplication",
            outcome: "rejected",
            why: "It makes replay and fan-out expensive.",
          },
          {
            label: "C",
            name: "Append-only partitioned log",
            cost: "Operational discipline around retention and ordering",
            outcome: "chosen",
            why: "It lets consumers replay independently from shared durable history.",
          },
        ],
        keyTradeoff:
          "Replay becomes simple, but users inherit log retention and ordering constraints.",
        debtsIntroduced: [
          {
            debtId: "D1",
            summary: "Retention and replay semantics become operational concerns.",
          },
        ],
        claimIds: ["claim-log-core", "claim-log-inference"],
        inferenceNoteIds: ["inference-1"],
      },
    ],
    throughline: {
      summary:
        "Kafka keeps making the log the stable center and pushes coordination to operators and later control-plane features.",
      cost: "The cost is that operational correctness becomes visible to users.",
      repeatedChoices: [
        {
          repeatedChoice: "Preserve replayable ordered history",
          whatItAvoided: "Tight producer-consumer coupling",
          whatItMadeHarder: "Retention, ordering, and rebalance behavior",
          outcome: "A strong event backbone with visible operational trade-offs",
        },
      ],
      designReviewSentence:
        "Use a log when replayable history matters more than hiding operational state.",
    },
    transferablePattern: {
      name: "Log as shared durable history",
      summary:
        "Use append-only history as the coordination surface between producers and consumers.",
      siblings: [
        {
          system: "Event sourcing",
          sameIdea: "State is reconstructed from an ordered event history.",
          sharedConstraint: "Consumers need replayable facts.",
          differentPrice: "Application-level schema evolution becomes harder.",
        },
      ],
    },
    boundaries: [
      {
        counterexample: "Low-latency mutable key-value state",
        oppositeChoice:
          "Direct indexed mutation can be rational when latest value lookup dominates.",
        boundaryRule:
          "Do not copy log-centered design when random mutation is the primary access path.",
      },
    ],
    debtMap: {
      resolved: [],
      mitigated: [],
      unresolved: [
        {
          debtId: "D1",
          debt: "Retention and replay semantics are operational concerns.",
          introducedInStage: "stage-1",
          whyItRemainsHard:
            "The architecture exposes history management as a product-level choice.",
          currentManifestation:
            "Teams must plan retention, compaction, and consumer replay behavior.",
        },
      ],
    },
    painRanking: [
      {
        rank: 1,
        painPoint: "Retention/replay surprises",
        oneLineExplanation:
          "Consumers can discover too late that the history they need has expired.",
        competitiveAttackAngle:
          "Managed event platforms can hide more policy, but pay with less direct control.",
        relatedDebtIds: ["D1"],
      },
    ],
    causalChain: {
      story: "consumer replay pressure -> append-only log -> solved fan-out, but introduced D1",
      oneSentenceVersion:
        "Kafka makes history reusable, then asks users to operate that history carefully.",
      stageRefs: ["stage-1"],
      debtRefs: ["D1"],
    },
    sources: [
      {
        id: "source-paper",
        title: "Kafka design paper",
        url: "https://example.com/kafka-paper",
        sourceType: "paper",
        trustLevel: "primary",
        retrievedAt: "2026-05-23T00:00:00.000Z",
        supportsClaimIds: ["claim-log-core"],
      },
      {
        id: "source-docs",
        title: "Kafka official documentation",
        url: "https://example.com/kafka-docs",
        sourceType: "official_docs",
        trustLevel: "primary",
        retrievedAt: "2026-05-23T00:00:00.000Z",
        supportsClaimIds: ["claim-log-core"],
      },
      {
        id: "source-post",
        title: "Kafka engineering retrospective",
        url: "https://example.com/kafka-retrospective",
        sourceType: "engineering_blog",
        trustLevel: "high",
        retrievedAt: "2026-05-23T00:00:00.000Z",
        supportsClaimIds: ["claim-log-inference"],
      },
    ],
    sourceEvidence: [
      {
        id: "evidence-log-core",
        sourceId: "source-paper",
        excerpt: "Kafka stores messages in persistent append-only logs.",
        locator: "section 3",
        retrievedAt: "2026-05-23T00:00:00.000Z",
        contentHash: "hash-log-core",
        supportsClaimIds: ["claim-log-core"],
      },
    ],
    evidenceClaims: [
      {
        id: "claim-log-core",
        statement: "Kafka uses an append-only log as a central abstraction.",
        claimType: "fact",
        confidence: "high",
        moduleId: "stage-1",
        sourceEvidenceIds: ["evidence-log-core"],
        inferenceBasisClaimIds: [],
        publishable: true,
      },
      {
        id: "claim-log-inference",
        statement:
          "This design makes retention and replay an operational concern.",
        claimType: "inference",
        confidence: "medium",
        moduleId: "stage-1",
        sourceEvidenceIds: [],
        inferenceBasisClaimIds: ["claim-log-core"],
        publishable: true,
      },
    ],
    inferenceNotes: [
      {
        id: "inference-1",
        moduleId: "stage-1",
        note: "The operational debt is inferred from the log-centered design and retention behavior.",
        basisClaimIds: ["claim-log-core"],
        confidence: "medium",
      },
    ],
    socialCards: [
      {
        id: "card-cover",
        cardType: "cover",
        moduleKey: "orientation",
        status: "pending",
      },
    ],
  };
}
