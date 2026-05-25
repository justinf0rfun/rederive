import { Link } from "react-router";

import type { Route } from "./+types/zh-method";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "redo method - rederive" },
    {
      name: "description",
      content: "redo 如何用证据、约束、取舍和技术债重新推导成熟系统。",
    },
  ];
}

export default function MethodPage() {
  const loop = [
    "constraint",
    "options",
    "chosen path",
    "trade-off",
    "debt",
    "mitigation",
    "unresolved pain",
    "transferable pattern",
    "boundary",
  ];

  return (
    <main className="min-h-[100dvh] bg-[#f5f4ef] px-4 py-8 text-zinc-950 md:px-8 lg:px-12">
      <article className="mx-auto max-w-[1200px]">
        <header className="grid gap-8 border-b border-zinc-300 pb-12 pt-12 md:pt-20 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-emerald-800">
              method
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-tight md:text-6xl">
              redo 是一种工程反推框架。
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-700 md:text-lg">
              它从成熟系统的结果倒推到当时的约束和选择，解释为什么一个看起来不完美的方案在当时是理性的，以及它后来留下了什么债。
            </p>
          </div>
          <div className="border border-zinc-300 bg-[#fbfaf6] p-5">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
              not this
            </p>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-zinc-700">
              <li>不是教程。</li>
              <li>不是功能巡礼。</li>
              <li>不是 release timeline。</li>
              <li>不是源码导读。</li>
              <li>不是泛泛的 AI 摘要。</li>
            </ul>
          </div>
        </header>

        <section className="grid gap-8 border-b border-zinc-300 py-12 lg:grid-cols-[280px_minmax(0,1fr)]">
          <SectionIntro
            label="core loop"
            title="一条选择链"
            body="每个案例都必须保留选择前的压力、没有选择的方案、选择后的代价，以及后续如何修复或隔离。"
          />
          <ol className="grid gap-3 md:grid-cols-3">
            {loop.map((item, index) => (
              <li className="border border-zinc-300 bg-[#fbfaf6] p-4" key={item}>
                <span className="font-mono text-xs text-zinc-500">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="mt-3 text-lg font-medium">{item}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-8 border-b border-zinc-300 py-12 lg:grid-cols-[280px_minmax(0,1fr)]">
          <SectionIntro
            label="evidence discipline"
            title="证据不是装饰"
            body="事实、推理和有争议判断必须分开。论文、设计文档、提案和标准是一等资料。"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Rule title="事实要有来源" body="核心事实必须能追到 source evidence，不能只靠二手复述。" />
            <Rule title="推理要标注" body="动机、权衡和因果链如果不是来源直接陈述，就必须绑定 basis claim。" />
            <Rule title="判断要有边界" body="有争议的评价必须保留反例、相反选择和适用边界。" />
            <Rule title="弱资料不能撑核心结论" body="SEO 教程和泛文章只能做背景，不能支撑历史主张。" />
          </div>
        </section>

        <section className="grid gap-8 py-12 lg:grid-cols-[280px_minmax(0,1fr)]">
          <SectionIntro
            label="how to read"
            title="读的时候盯住债务流动"
            body="不要只看最后选了什么。更重要的是，某个债在什么时候被引入、什么时候被缓解、为什么仍然留在今天。"
          />
          <div className="border-l border-zinc-400 pl-5">
            <p className="max-w-[70ch] text-base leading-8 text-zinc-700">
              用 redo 读自己的系统时，先列出当前痛点，再倒推这些痛点最早在哪个约束下被合理化。然后问：当时的候选方案有哪些，今天是否有新的边界条件让旧选择不再成立。
            </p>
            <Link
              className="mt-6 inline-block rounded-sm bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition active:translate-y-px"
              to="/zh/submit-topic"
            >
              提交一个系统
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}

function SectionIntro({
  body,
  label,
  title,
}: {
  body: string;
  label: string;
  title: string;
}) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-700">{body}</p>
    </div>
  );
}

function Rule({ body, title }: { body: string; title: string }) {
  return (
    <div className="border border-zinc-300 bg-[#fbfaf6] p-4">
      <h3 className="font-medium text-zinc-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-700">{body}</p>
    </div>
  );
}
