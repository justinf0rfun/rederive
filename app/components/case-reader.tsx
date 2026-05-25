import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import type { PublishedVersion } from "~/domain/publishing/types";
import type { RedoCaseSnapshot, RedoStage } from "~/domain/redo/contract";

type DebtMapRow = RedoCaseSnapshot["debtMap"]["resolved"][number];

type CaseReaderProps = {
  publishedVersion: PublishedVersion;
  mode: "latest" | "version";
  latestVersionId?: string | null;
};

export function CaseReader({
  publishedVersion,
  mode,
  latestVersionId,
}: CaseReaderProps) {
  const content = publishedVersion.content;
  const [activeSection, setActiveSection] = useState("orientation");
  const [selectedDebt, setSelectedDebt] = useState<string | null>(null);
  const debtRows = useMemo(() => collectDebtRows(content), [content]);
  const topPain = content.painRanking.slice(0, 3);
  const isHistorical =
    mode === "version" && latestVersionId && latestVersionId !== content.version.id;

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-case-section]")
    );
    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);
        const next = visible[0]?.target.getAttribute("id");
        if (next) {
          setActiveSection(next);
        }
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0.1, 0.35, 0.6] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-[100dvh] bg-[#f5f4ef] px-4 py-6 text-zinc-950 md:px-8 lg:px-10">
      <MobileNavigator
        activeSection={activeSection}
        content={content}
        mode={mode}
      />
      <div className="mx-auto grid max-w-[1400px] gap-8 lg:grid-cols-[190px_minmax(0,820px)_320px]">
        <LeftRail content={content} mode={mode} />
        <article className="min-w-0">
          {isHistorical && (
            <div className="mb-6 border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              This is an immutable historical version. A newer reviewed version is available on the latest route.
            </div>
          )}
          <CaseHeader content={content} mode={mode} />
          <OrientationSection content={content} />
          <StagesSection
            activeSection={activeSection}
            feedbackVersionId={content.version.id}
            onDebtSelect={setSelectedDebt}
            selectedDebt={selectedDebt}
            stages={content.stages}
          />
          <AnalyticalSections
            content={content}
            debtRows={debtRows}
            onDebtSelect={setSelectedDebt}
            selectedDebt={selectedDebt}
          />
          <SourcesSection content={content} />
        </article>
        <RightRail
          activeSection={activeSection}
          content={content}
          debtRows={debtRows}
          onDebtSelect={setSelectedDebt}
          selectedDebt={selectedDebt}
          topPain={topPain}
        />
      </div>
    </main>
  );
}

function CaseHeader({
  content,
  mode,
}: {
  content: RedoCaseSnapshot;
  mode: "latest" | "version";
}) {
  return (
    <header className="grid gap-8 border-b border-zinc-300 pb-10 pt-10 md:pt-16 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-emerald-800">
          {mode === "latest" ? "latest reviewed version" : "fixed immutable version"}
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[0.98] tracking-tight text-zinc-950 md:text-6xl">
          {content.topic.displayName}
        </h1>
        <p className="mt-6 max-w-[62ch] text-lg leading-8 text-zinc-700">
          {content.orientation.oneSentenceVersion}
        </p>
        <div className="mt-8 grid gap-4 text-sm leading-6 text-zinc-700 md:grid-cols-3">
          <p>
            <span className="block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
              what it is
            </span>
            {content.orientation.whatItIs}
          </p>
          <p>
            <span className="block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
              pressure
            </span>
            {content.orientation.centralPressure}
          </p>
          <p>
            <span className="block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
              trade-off
            </span>
            {content.orientation.tradeoffTheme}
          </p>
        </div>
      </div>
      <TrustPanel content={content} />
    </header>
  );
}

function TrustPanel({ content }: { content: RedoCaseSnapshot }) {
  const facts = [
    ["version", `v${content.version.number}`],
    ["published", content.version.publishedAt.slice(0, 10)],
    ["sources", String(content.trust.sourceCount)],
    ["papers/docs", String(content.trust.paperOrDesignDocCount)],
    ["claims", String(content.trust.claimCount)],
    ["inferences", String(content.trust.inferenceCount)],
  ];

  return (
    <aside className="h-fit border border-zinc-300 bg-[#fbfaf6] p-4 shadow-[0_18px_40px_-28px_rgba(39,39,42,0.45)]">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
          reviewed
        </span>
        <span className="rounded-sm border border-emerald-700/20 bg-emerald-50 px-2 py-1 font-mono text-xs text-emerald-900">
          human approved
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        {facts.map(([label, value]) => (
          <div key={label} title={trustExplanation(label)}>
            <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-500">
              {label}
            </dt>
            <dd className="mt-1 font-mono text-sm text-zinc-950">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-200 pt-3">
        <CopyButton label="Copy case link" target="case" />
        {content.socialCards.find((card) => card.cardType === "cover")?.url ? (
          <a
            className="rounded-sm border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-900 transition hover:border-zinc-500 active:translate-y-px"
            href={content.socialCards.find((card) => card.cardType === "cover")?.url}
            target="_blank"
            rel="noreferrer"
          >
            Open share image
          </a>
        ) : (
          <span className="rounded-sm border border-dashed border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-500">
            Share image unavailable
          </span>
        )}
        <a
          className="rounded-sm border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-900 transition hover:border-zinc-500 active:translate-y-px"
          href="#sources"
        >
          Sources
        </a>
      </div>
    </aside>
  );
}

function OrientationSection({ content }: { content: RedoCaseSnapshot }) {
  return (
    <section
      className="scroll-mt-24 border-b border-zinc-300 py-12"
      data-case-section
      id="orientation"
    >
      <SectionKicker label="orientation" />
      <div className="mt-5 grid gap-8 md:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
            The case in one pressure line
          </h2>
          <p className="mt-4 max-w-[68ch] text-base leading-8 text-zinc-700">
            {content.orientation.centralPressure}
          </p>
          <p className="mt-4 max-w-[68ch] text-base leading-8 text-zinc-700">
            {content.orientation.tradeoffTheme}
          </p>
        </div>
        <div className="border border-zinc-300 bg-[#fbfaf6] p-4">
          <div className="grid gap-3 font-mono text-xs text-zinc-700">
            <MapStep label="pressure" value="constraint hardens" />
            <MapStep label="choice" value="local optimum wins" />
            <MapStep label="debt" value="future coordination cost" />
          </div>
        </div>
      </div>
    </section>
  );
}

function StagesSection({
  activeSection,
  feedbackVersionId,
  onDebtSelect,
  selectedDebt,
  stages,
}: {
  activeSection: string;
  feedbackVersionId: string;
  onDebtSelect: (debtId: string | null) => void;
  selectedDebt: string | null;
  stages: RedoStage[];
}) {
  return (
    <section className="border-b border-zinc-300 py-12" id="stages">
      <SectionKicker label="stages" />
      <div className="mt-6 grid gap-12">
        {stages.map((stage) => (
          <StageModule
            active={activeSection === stage.id}
            feedbackVersionId={feedbackVersionId}
            key={stage.id}
            onDebtSelect={onDebtSelect}
            selectedDebt={selectedDebt}
            stage={stage}
          />
        ))}
      </div>
    </section>
  );
}

function StageModule({
  active,
  feedbackVersionId,
  onDebtSelect,
  selectedDebt,
  stage,
}: {
  active: boolean;
  feedbackVersionId: string;
  onDebtSelect: (debtId: string | null) => void;
  selectedDebt: string | null;
  stage: RedoStage;
}) {
  const stageDebtIds = [
    ...stage.debtsIntroduced.map((debt) => debt.debtId),
    ...(stage.debtsRepaid || []).map((debt) => debt.debtId),
  ];
  const focused = selectedDebt ? stageDebtIds.includes(selectedDebt) : false;

  return (
    <section
      className={[
        "scroll-mt-24 border-l-2 pl-4 transition-colors duration-300 md:pl-6",
        active || focused ? "border-emerald-700" : "border-zinc-300",
      ].join(" ")}
      data-case-section
      id={stage.id}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
            stage {stage.number} · {stage.period}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            {stage.title}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton label="Share stage" target={stage.id} />
          <Link
            className="rounded-sm border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-900 transition hover:border-zinc-500 active:translate-y-px"
            to={`/zh/feedback?versionId=${feedbackVersionId}&module=${stage.id}`}
          >
            Submit correction/source
          </Link>
          <span className="font-mono text-[11px] text-zinc-500">
            share image pending
          </span>
        </div>
      </div>
      <p className="mt-5 border-l border-zinc-400 pl-4 text-base leading-8 text-zinc-800">
        {stage.constraint}
      </p>
      <div className="mt-6 overflow-x-auto border border-zinc-300 bg-[#fbfaf6]">
        <table className="min-w-[680px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-300 font-mono text-xs uppercase tracking-[0.12em] text-zinc-500">
              <th className="px-4 py-3 font-medium">option</th>
              <th className="px-4 py-3 font-medium">cost</th>
              <th className="px-4 py-3 font-medium">why</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {stage.options.map((option) => (
              <tr
                className={
                  option.outcome === "chosen"
                    ? "bg-emerald-50/70"
                    : "bg-transparent"
                }
                key={option.label}
              >
                <td className="px-4 py-3 align-top">
                  <span className="font-mono text-xs text-zinc-500">
                    {option.label}
                  </span>
                  <span className="ml-2 font-medium text-zinc-950">
                    {option.name}
                  </span>
                  <span className="ml-2 rounded-sm border border-zinc-300 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
                    {option.outcome}
                  </span>
                </td>
                <td className="px-4 py-3 align-top text-zinc-700">
                  {option.cost}
                </td>
                <td className="px-4 py-3 align-top text-zinc-700">
                  {option.why}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-5 max-w-[68ch] text-sm leading-7 text-zinc-700">
        <span className="font-medium text-zinc-950">Key trade-off: </span>
        {stage.keyTradeoff}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {stage.debtsIntroduced.map((debt) => (
          <DebtChip
            active={selectedDebt === debt.debtId}
            debtId={debt.debtId}
            key={debt.debtId}
            onSelect={onDebtSelect}
          />
        ))}
        {stage.claimIds.map((claimId) => (
          <a
            className="rounded-sm border border-zinc-300 px-2 py-1 font-mono text-xs text-zinc-600 transition hover:border-zinc-500"
            href={`#claim-${claimId}`}
            key={claimId}
          >
            {claimId}
          </a>
        ))}
      </div>
    </section>
  );
}

function AnalyticalSections({
  content,
  debtRows,
  onDebtSelect,
  selectedDebt,
}: {
  content: RedoCaseSnapshot;
  debtRows: Array<DebtMapRow & { status: string }>;
  onDebtSelect: (debtId: string | null) => void;
  selectedDebt: string | null;
}) {
  return (
    <>
      <section
        className="scroll-mt-24 border-b border-zinc-300 py-12"
        data-case-section
        id="throughline"
      >
        <SectionKicker label="throughline" />
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">
          {content.throughline.designReviewSentence}
        </h2>
        <p className="mt-4 max-w-[68ch] text-base leading-8 text-zinc-700">
          {content.throughline.summary}
        </p>
        <div className="mt-6 grid gap-3">
          {content.throughline.repeatedChoices.map((choice) => (
            <div className="border-t border-zinc-300 pt-3" key={choice.repeatedChoice}>
              <p className="font-medium text-zinc-950">{choice.repeatedChoice}</p>
              <p className="mt-1 text-sm leading-6 text-zinc-700">
                Avoided: {choice.whatItAvoided} Made harder: {choice.whatItMadeHarder}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section
        className="scroll-mt-24 border-b border-zinc-300 py-12"
        data-case-section
        id="pattern"
      >
        <SectionKicker label="transferable pattern" />
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">
          {content.transferablePattern.name}
        </h2>
        <p className="mt-4 max-w-[68ch] text-base leading-8 text-zinc-700">
          {content.transferablePattern.summary}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {content.transferablePattern.siblings.map((sibling) => (
            <div className="border border-zinc-300 bg-[#fbfaf6] p-4" key={sibling.system}>
              <p className="font-medium text-zinc-950">{sibling.system}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-700">
                {sibling.sameIdea}
              </p>
              <p className="mt-2 font-mono text-xs text-zinc-500">
                {sibling.sharedConstraint}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section
        className="scroll-mt-24 border-b border-zinc-300 py-12"
        data-case-section
        id="boundaries"
      >
        <SectionKicker label="where it stops" />
        <div className="mt-5 grid gap-4">
          {content.boundaries.map((boundary) => (
            <div className="border-l border-zinc-400 pl-4" key={boundary.counterexample}>
              <p className="font-medium text-zinc-950">{boundary.counterexample}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-700">
                {boundary.boundaryRule}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section
        className="scroll-mt-24 border-b border-zinc-300 py-12"
        data-case-section
        id="debt-map"
      >
        <SectionKicker label="debt map" />
        <div className="mt-5 overflow-x-auto border border-zinc-300 bg-[#fbfaf6]">
          <table className="min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-300 font-mono text-xs uppercase tracking-[0.12em] text-zinc-500">
                <th className="px-4 py-3 font-medium">debt</th>
                <th className="px-4 py-3 font-medium">status</th>
                <th className="px-4 py-3 font-medium">introduced</th>
                <th className="px-4 py-3 font-medium">current meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {debtRows.map((row) => (
                <tr
                  className={
                    selectedDebt === row.debtId ? "bg-emerald-50/70" : undefined
                  }
                  id={`debt-${row.debtId}`}
                  key={`${row.status}-${row.debtId}`}
                >
                  <td className="px-4 py-3 align-top">
                    <button
                      className="font-mono text-xs font-semibold text-emerald-800 underline decoration-emerald-800/30 underline-offset-4"
                      onClick={() => onDebtSelect(row.debtId)}
                      type="button"
                    >
                      {row.debtId}
                    </button>
                    <p className="mt-1 text-zinc-800">{row.debt}</p>
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-xs text-zinc-600">
                    {row.status}
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-700">
                    {row.introducedInStage}
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-700">
                    {row.whatImproved || row.whatRemains || row.resolution || row.whyItRemainsHard}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section
        className="scroll-mt-24 border-b border-zinc-300 py-12"
        data-case-section
        id="pain-ranking"
      >
        <SectionKicker label="pain ranking" />
        <div className="mt-5 grid gap-3">
          {content.painRanking.map((pain) => (
            <div
              className={[
                "grid gap-3 border-t border-zinc-300 pt-4 md:grid-cols-[56px_minmax(0,1fr)]",
                pain.relatedDebtIds.includes(selectedDebt || "")
                  ? "bg-emerald-50/50"
                  : "",
              ].join(" ")}
              key={pain.rank}
            >
              <span className="font-mono text-2xl text-zinc-400">
                {String(pain.rank).padStart(2, "0")}
              </span>
              <div>
                <p className="font-medium text-zinc-950">{pain.painPoint}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-700">
                  {pain.oneLineExplanation}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pain.relatedDebtIds.map((debtId) => (
                    <DebtChip
                      active={selectedDebt === debtId}
                      debtId={debtId}
                      key={debtId}
                      onSelect={onDebtSelect}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section
        className="scroll-mt-24 border-b border-zinc-300 py-12"
        data-case-section
        id="causal-chain"
      >
        <SectionKicker label="causal chain" />
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">
          {content.causalChain.oneSentenceVersion}
        </h2>
        <p className="mt-4 max-w-[68ch] text-base leading-8 text-zinc-700">
          {content.causalChain.story}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {content.causalChain.debtRefs.map((debtId) => (
            <DebtChip
              active={selectedDebt === debtId}
              debtId={debtId}
              key={debtId}
              onSelect={onDebtSelect}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function SourcesSection({ content }: { content: RedoCaseSnapshot }) {
  return (
    <section
      className="scroll-mt-24 py-12"
      data-case-section
      id="sources"
    >
      <SectionKicker label="sources and inference notes" />
      <Link
        className="mt-4 inline-block rounded-sm border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-900 transition hover:border-zinc-500 active:translate-y-px"
        to={`/zh/feedback?versionId=${content.version.id}&module=sources`}
      >
        Submit source correction
      </Link>
      <div className="mt-5 grid gap-6">
        <div className="grid gap-3">
          {content.sources.map((source) => (
            <article className="border-t border-zinc-300 pt-4" key={source.id}>
              <div className="flex flex-wrap items-center gap-2">
                {source.url ? (
                  <a
                    className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4"
                    href={source.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {source.title}
                  </a>
                ) : (
                  <span className="font-medium text-zinc-950">{source.title}</span>
                )}
                <span className="rounded-sm border border-zinc-300 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
                  {source.sourceType}
                </span>
                <span className="rounded-sm border border-zinc-300 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
                  {source.trustLevel}
                </span>
              </div>
              <p className="mt-2 font-mono text-xs text-zinc-500">
                retrieved {source.retrievedAt} · supports {source.supportsClaimIds.length} claims
              </p>
            </article>
          ))}
        </div>
        <div className="border border-zinc-300 bg-[#fbfaf6] p-4">
          <h3 className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
            evidence claims
          </h3>
          <div className="mt-3 grid gap-3">
            {content.evidenceClaims.map((claim) => (
              <article
                className="border-t border-zinc-200 pt-3 first:border-t-0 first:pt-0"
                id={`claim-${claim.id}`}
                key={claim.id}
              >
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-sm border border-zinc-300 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
                    {claim.claimType}
                  </span>
                  <span className="rounded-sm border border-zinc-300 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
                    {claim.confidence}
                  </span>
                  <span className="rounded-sm border border-zinc-300 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
                    {claim.moduleId}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-700">
                  {claim.statement}
                </p>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  evidence {claim.sourceEvidenceIds.length} · basis{" "}
                  {claim.inferenceBasisClaimIds.length}
                </p>
              </article>
            ))}
          </div>
        </div>
        <div className="border border-zinc-300 bg-[#fbfaf6] p-4">
          <h3 className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
            inference notes
          </h3>
          <div className="mt-3 grid gap-3">
            {content.inferenceNotes.map((note) => (
              <p
                className="text-sm leading-6 text-zinc-700"
                key={note.id}
              >
                <span className="font-mono text-xs text-zinc-500">
                  {note.confidence} · {note.moduleId}
                </span>{" "}
                {note.note}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LeftRail({
  content,
  mode,
}: {
  content: RedoCaseSnapshot;
  mode: "latest" | "version";
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-8 pt-8">
        <Link className="font-mono text-xs text-zinc-500" to="/zh">
          rederive
        </Link>
        <h2 className="mt-5 text-sm font-medium leading-5 text-zinc-950">
          {content.topic.displayName}
        </h2>
        <dl className="mt-5 grid gap-3 border-y border-zinc-300 py-4">
          <RailFact label="mode" value={mode} />
          <RailFact label="version" value={`v${content.version.number}`} />
          <RailFact label="sources" value={String(content.trust.sourceCount)} />
          <RailFact label="claims" value={String(content.trust.claimCount)} />
        </dl>
        <nav className="mt-5 grid gap-2 font-mono text-xs text-zinc-500">
          <a className="hover:text-zinc-950" href="#orientation">orientation</a>
          <a className="hover:text-zinc-950" href="#stages">stages</a>
          <a className="hover:text-zinc-950" href="#debt-map">debt map</a>
          <a className="hover:text-zinc-950" href="#sources">sources</a>
        </nav>
      </div>
    </aside>
  );
}

function RightRail({
  activeSection,
  content,
  debtRows,
  onDebtSelect,
  selectedDebt,
  topPain,
}: {
  activeSection: string;
  content: RedoCaseSnapshot;
  debtRows: Array<DebtMapRow & { status: string }>;
  onDebtSelect: (debtId: string | null) => void;
  selectedDebt: string | null;
  topPain: RedoCaseSnapshot["painRanking"];
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-8 max-h-[calc(100dvh-4rem)] overflow-y-auto border border-zinc-300 bg-[#fbfaf6] p-4">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3">
          <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
            decision map
          </h2>
          {selectedDebt && (
            <button
              className="font-mono text-xs text-zinc-500 underline decoration-zinc-300 underline-offset-4"
              onClick={() => onDebtSelect(null)}
              type="button"
            >
              clear
            </button>
          )}
        </div>
        <ol className="mt-4 grid gap-2">
          {content.stages.map((stage) => {
            const debtIds = stage.debtsIntroduced.map((debt) => debt.debtId);
            const active = activeSection === stage.id;
            const focused = selectedDebt ? debtIds.includes(selectedDebt) : false;
            return (
              <li key={stage.id}>
                <a
                  className={[
                    "grid gap-1 border-l-2 py-1 pl-3 transition-colors",
                    active || focused
                      ? "border-emerald-700 text-zinc-950"
                      : "border-zinc-300 text-zinc-500 hover:text-zinc-950",
                  ].join(" ")}
                  href={`#${stage.id}`}
                >
                  <span className="font-mono text-xs">
                    {String(stage.number).padStart(2, "0")} {stage.title}
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {debtIds.map((debtId) => (
                      <span
                        className="rounded-sm border border-zinc-300 px-1 py-0.5 font-mono text-[10px]"
                        key={debtId}
                      >
                        {debtId}
                      </span>
                    ))}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
        <div className="mt-5 border-t border-zinc-200 pt-4">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
            debt focus
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {debtRows.map((row) => (
              <DebtChip
                active={selectedDebt === row.debtId}
                debtId={row.debtId}
                key={`${row.status}-${row.debtId}`}
                onSelect={onDebtSelect}
              />
            ))}
          </div>
        </div>
        <div className="mt-5 border-t border-zinc-200 pt-4">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
            top pain
          </p>
          <ol className="mt-3 grid gap-2 text-xs leading-5 text-zinc-700">
            {topPain.map((pain) => (
              <li key={pain.rank}>
                <span className="font-mono text-zinc-500">{pain.rank}</span>{" "}
                {pain.painPoint}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </aside>
  );
}

function MobileNavigator({
  activeSection,
  content,
  mode,
}: {
  activeSection: string;
  content: RedoCaseSnapshot;
  mode: "latest" | "version";
}) {
  return (
    <nav className="sticky top-0 z-[1] -mx-4 mb-4 overflow-x-auto border-b border-zinc-300 bg-[#f5f4ef]/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex min-w-max items-center gap-2 font-mono text-xs">
        <span className="mr-2 text-zinc-500">
          {mode} · v{content.version.number}
        </span>
        {["orientation", ...content.stages.map((stage) => stage.id), "debt-map", "sources"].map(
          (id) => (
            <a
              className={[
                "rounded-sm border px-2 py-1",
                activeSection === id
                  ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                  : "border-zinc-300 text-zinc-600",
              ].join(" ")}
              href={`#${id}`}
              key={id}
            >
              {id.replace("stage-", "s")}
            </a>
          )
        )}
      </div>
    </nav>
  );
}

function DebtChip({
  active,
  debtId,
  onSelect,
}: {
  active: boolean;
  debtId: string;
  onSelect: (debtId: string | null) => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={[
        "rounded-sm border px-2 py-1 font-mono text-xs transition active:translate-y-px",
        active
          ? "border-emerald-700 bg-emerald-50 text-emerald-900"
          : "border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:text-zinc-950",
      ].join(" ")}
      onClick={() => onSelect(active ? null : debtId)}
      type="button"
    >
      {debtId}
    </button>
  );
}

function CopyButton({ label, target }: { label: string; target: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (typeof window === "undefined" || !navigator.clipboard) {
      return;
    }

    const base = `${window.location.origin}${window.location.pathname}`;
    const value = target === "case" ? base : `${base}#${target}`;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button
      className="rounded-sm border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-900 transition hover:border-zinc-500 active:translate-y-px"
      onClick={copy}
      type="button"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function SectionKicker({ label }: { label: string }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
      {label}
    </p>
  );
}

function MapStep({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[86px_minmax(0,1fr)] items-center gap-3">
      <span className="text-zinc-500">{label}</span>
      <span className="border-l border-zinc-300 pl-3 text-zinc-950">{value}</span>
    </div>
  );
}

function RailFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-xs text-zinc-950">{value}</dd>
    </div>
  );
}

function collectDebtRows(
  content: RedoCaseSnapshot
): Array<DebtMapRow & { status: string }> {
  return [
    ...content.debtMap.resolved.map((row) => ({ ...row, status: "resolved" })),
    ...content.debtMap.mitigated.map((row) => ({
      ...row,
      status: "mitigated",
    })),
    ...content.debtMap.unresolved.map((row) => ({
      ...row,
      status: "unresolved",
    })),
  ];
}

function trustExplanation(label: string): string {
  const explanations: Record<string, string> = {
    version: "Immutable published version number.",
    published: "Date this reviewed snapshot was frozen.",
    sources: "Non-rejected sources included in the published snapshot.",
    "papers/docs": "Paper, design document, proposal, or standard coverage.",
    claims: "Evidence-backed claims preserved in the snapshot.",
    inferences: "Claims that rely on basis claims rather than direct factual evidence.",
  };
  return explanations[label] || label;
}
