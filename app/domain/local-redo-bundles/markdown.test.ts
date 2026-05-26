import { describe, expect, it } from "vitest";

import { parseRedoMarkdownToLocalBundle } from "./markdown";

describe("redo markdown import", () => {
  it("converts redo markdown into a validated local bundle", () => {
    const bundle = parseRedoMarkdownToLocalBundle(`
# Apache Kafka：逆向学习

**它是什么：** 一个分布式、分区化、可复制提交日志。

**核心压力：** LinkedIn 需要统一管道服务批处理和实时消费者。

**反复出现的权衡：** 用追加式日志换取吞吐量，把复杂度推到日志本身。

## 阶段 1：日志作为核心抽象（2010–2011）

**当时约束：** 多个生产者和消费者需要独立扩展。

| 候选方案 | 代价 | 为何胜选或落选 |
|---|---|---|
| A. 扩展传统队列 | 单节点吞吐量有限 | 无法长期保留数据并服务多个消费者 |
| B. 日志聚合器 | 缺少消费者组 | 只能采集，不能协调消费 |
| C. **分布式提交日志** | 消费者需要管理偏移量 | 顺序 I/O 带来高吞吐并解耦生产消费 |

**核心权衡：** 用可重放日志换取水平扩展。

**埋下的雷：** D1 - 偏移量管理变成消费者责任。

## 阶段 2：复制与 ISR（2012–2013）

**当时约束：** 硬件故障下不能丢数据。

| 候选方案 | 代价 | 为何胜选或落选 |
|---|---|---|
| A. 多数派共识 | 延迟高 | 会损害吞吐优势 |
| B. 同步所有副本 | 慢副本拖慢写入 | 尾延迟不可控 |
| C. **动态 ISR** | 高水位线复杂 | 动态副本集平衡吞吐和持久性 |

**核心权衡：** 用动态 ISR 换取吞吐和可用性。

**埋下的雷：** D2 - ISR 和控制器逻辑复杂。

## 阶段 3：粘性重平衡（2019）

**当时约束：** 急切重平衡造成消费暂停。

| 候选方案 | 代价 | 为何胜选或落选 |
|---|---|---|
| A. 不处理 | 用户体验差 | 只是转移负担 |
| B. 完全服务端分配 | 工程量太大 | 当时无法一次完成 |
| C. **合作式粘性重平衡** | 协议更复杂 | 减少重平衡影响范围 |

**核心权衡：** 用更复杂协议缓解暂停。

**埋下的雷：** D3b - 粘性重平衡是补丁而非根治。

## 贯穿主线

Kafka 的反复哲学是：让追加式日志成为通用原语。

代价是 Kafka 不是通用数据库或通用流处理器。

| 反复的选择 | 避免了什么 | 增加了什么难度 | 结果 |
|---|---|---|---|
| 追加式日志 > 队列语义 | 消费者耦合 | 偏移量管理 | 多消费者独立读取 |

**能在设计评审中引用的一句话：** "能不能把这个东西也变成日志？"

## 技术债地图

### 已偿还

| 雷的编号 | 技术债 | 引入于 | 解决于 | 解决方式 |
|---|---|---|---|---|
| D1 | 偏移量存在外部系统 | 阶段 1 | 阶段 3 | 移入内部 Topic |

### 未偿还

| 雷的编号 | 痛点 | 为何仍然困难 | 当前表现 |
|---|---|---|---|
| D2 | ISR 调优复杂 | 多种故障模式交织 | 配置错误会丢数据或不可用 |
| D3b | 粘性重平衡只是补丁 | 根本分配模型未改 | 非 Java 客户端实现困难 |
| D2-4 | 复合债务写法 | Markdown 里可能出现非标准范围 ID | 转换时归并到 D2 |

## 痛点排行

| 排名 | 痛点 | 一句话解释 | 竞争攻击角度 |
|---|---|---|---|
| 1 | 重平衡风暴 | 消费者组变动会暂停消费 | Pulsar 可用 Broker 端游标攻击 |
| 2 | 大状态恢复时间 | 状态恢复依赖日志重放 | Flink 用增量检查点攻击 |

## 因果链

\`\`\`text
数据爆炸 -> 追加式日志 -> 埋雷 D1
\`\`\`

**一句话总结：** Kafka 每一步都在尝试把新问题变成日志问题。

## 参考来源

- **原始论文：** [Kafka paper](https://example.com/kafka-paper) — 支持阶段 1 日志抽象
- **阶段 2 复制设计：** [Kafka replication design](https://example.com/kafka-replication) — 支持阶段 2 ISR
`);

    expect(bundle.topic.slug).toBe("kafka");
    expect(bundle.stages).toHaveLength(3);
    expect(bundle.sources.some((source) => source.sourceType === "paper")).toBe(
      true
    );
    expect(bundle.stages[2].debtsIntroduced[0]?.debtId).toBe("D3");
    expect(bundle.debtMap.unresolved[1]?.debt).toContain("原 D3b");
    expect(bundle.debtMap.unresolved[2]?.debtId).toBe("D2");
    expect(bundle.transferablePattern.siblings[0]?.system).toBe("Pulsar");
  });
});
