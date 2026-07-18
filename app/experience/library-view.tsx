"use client";

import { useState } from "react";
import { PERFORMERS } from "../../lib/catalog";
import type { JourneySummary, PerformerId, Viewer } from "../../lib/contracts";
import { useI18n } from "../i18n";
import { EmptyStage } from "./empty-stage";

export function Library({
  journeys,
  viewer,
  busy,
  onOpen,
  onDelete,
  onManage,
  onSnapshot,
  onNew,
}: {
  journeys: JourneySummary[];
  viewer: Viewer | null;
  busy: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onManage: (id: string, changes: { title?: string; pinned?: boolean; hidden?: boolean }) => void;
  onSnapshot: (id: string) => void;
  onNew: () => void;
}) {
  const { t } = useI18n();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [performerFilter, setPerformerFilter] = useState<PerformerId | "all">("all");
  const [showHidden, setShowHidden] = useState(false);
  const visibleJourneys = journeys
    .filter((journey) => showHidden || !journey.hidden)
    .filter((journey) => performerFilter === "all" || journey.performerId === performerFilter)
    .filter((journey) => `${journey.title} ${journey.seed} ${journey.topicLabels.join(" ")}`.toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.updatedAt - left.updatedAt);
  return (
    <section className="library-view" aria-labelledby="library-title">
      <header className="view-heading">
        <div><p className="eyebrow"><span /> {t("Saved journeys")}</p><h1 id="library-title">{t("Your saved questions")}</h1></div>
        <div><p>{t("{count} of {limit} journeys saved", { count: journeys.length, limit: viewer?.journeyLimit ?? "—" })}</p><button type="button" className="compact-action" onClick={onNew}>{t("New drive +")}</button></div>
      </header>
      <div className="library-filters" aria-label={t("Library filters")}>
        <label><span>{t("Search")}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Title, question, or topic")} /></label>
        <label><span>{t("Performer")}</span><select value={performerFilter} onChange={(event) => setPerformerFilter(event.target.value as PerformerId | "all")}><option value="all">{t("All performers")}</option>{PERFORMERS.map((performer) => <option value={performer.id} key={performer.id}>{performer.name}</option>)}</select></label>
        <label className="check-setting"><input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} /><span>{t("Show hidden")}</span></label>
      </div>
      {journeys.length ? (
        <div className="library-grid">
          {visibleJourneys.map((journey, index) => {
            const performer = PERFORMERS.find((item) => item.id === journey.performerId)!;
            return (
              <article key={journey.id} className="library-card">
                <div className="library-card-top"><span>{journey.pinned ? t("PINNED") : String(index + 1).padStart(2, "0")}</span><i className={performer.accent}>{performer.mark}</i></div>
                <p>{journey.topicLabels.join(" · ") || t("unclassified journey")}</p>
                <h2>{journey.title}</h2>
                <dl><div><dt>{t("Turns")}</dt><dd>{journey.turnCount}</dd></div><div><dt>{t("Sources")}</dt><dd>{journey.sourceCount}</dd></div><div><dt>{t("Open")}</dt><dd>{journey.openBranchCount}</dd></div></dl>
                <div className="library-actions">
                  <button type="button" disabled={busy !== null} onClick={() => onOpen(journey.id)}>{t("Resume")} <span>↗</span></button>
                  {confirmDelete === journey.id ? (
                    <span className="delete-confirm"><button type="button" disabled={busy !== null} onClick={() => onDelete(journey.id)}>{t("Delete")}</button><button type="button" onClick={() => setConfirmDelete(null)}>{t("Keep")}</button></span>
                  ) : (
                    <button type="button" className="text-button" onClick={() => setConfirmDelete(journey.id)}>{t("Remove")}</button>
                  )}
                </div>
                <div className="library-manage">
                  <button type="button" onClick={() => { const title = window.prompt(t("Rename this journey"), journey.title); if (title) onManage(journey.id, { title }); }}>{t("Rename")}</button>
                  <button type="button" onClick={() => onManage(journey.id, { pinned: !journey.pinned })}>{t(journey.pinned ? "Unpin" : "Pin")}</button>
                  <button type="button" onClick={() => onManage(journey.id, { hidden: !journey.hidden })}>{t(journey.hidden ? "Unhide" : "Hide")}</button>
                  <button type="button" onClick={() => onSnapshot(journey.id)}>{t("Snapshot")}</button>
                  <a href={`/api/journeys/${journey.id}/export`}>{t("Export")}</a>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyStage onOpenLibrary={onNew} label={t("Start the first saved journey")} />
      )}
    </section>
  );
}

