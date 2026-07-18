"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookmarkSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import { PERFORMERS } from "../../lib/catalog";
import type { JourneyDetail, JourneySummary, PerformerId } from "../../lib/contracts";
import { api } from "../client-api";
import { useI18n } from "../i18n";

type SavedItem = {
  key: string;
  kind: "journey" | "question";
  journeyId: string;
  turnId?: string;
  title: string;
  context: string;
  time: number;
  performerId: PerformerId;
  pinned: boolean;
  sourceCount: number;
};

export function BookmarksView({
  journeys,
  bookmarks,
  onOpen,
  onToggle,
  onPin,
  onNew,
}: {
  journeys: JourneySummary[];
  bookmarks: Record<string, number>;
  onOpen: (journeyId: string, turnId?: string) => void;
  onToggle: (journeyId: string, turnId: string) => void;
  onPin: (journeyId: string, pinned: boolean) => void;
  onNew: () => void;
}) {
  const { locale } = useI18n();
  const [details, setDetails] = useState<Record<string, JourneyDetail>>({});
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<"all" | "questions" | "pinned">("all");
  const [performer, setPerformer] = useState<PerformerId | "all">("all");
  const [sort, setSort] = useState<"recent" | "oldest" | "title">("recent");

  useEffect(() => {
    let cancelled = false;
    const needed = [...new Set(Object.keys(bookmarks).map((key) => key.split("::")[0]))]
      .filter((id) => !details[id] && journeys.some((journey) => journey.id === id));
    if (!needed.length) return;
    void Promise.all(needed.map((id) => api<JourneyDetail>(`/api/journeys/${id}`).then((payload) => payload.data)))
      .then((loaded) => {
        if (!cancelled) setDetails((current) => ({ ...current, ...Object.fromEntries(loaded.map((detail) => [detail.id, detail])) }));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [bookmarks, details, journeys]);

  const items = useMemo(() => {
    const journeyItems: SavedItem[] = journeys.filter((journey) => !journey.hidden).map((journey) => ({
      key: `journey:${journey.id}`,
      kind: "journey",
      journeyId: journey.id,
      title: journey.title,
      context: journey.topicLabels.join(" · ") || "Saved exploration",
      time: journey.updatedAt,
      performerId: journey.performerId,
      pinned: journey.pinned,
      sourceCount: journey.sourceCount,
    }));
    const questionItems: SavedItem[] = Object.entries(bookmarks).flatMap(([key, savedAt]) => {
      const [journeyId, turnId] = key.split("::");
      const journey = journeys.find((item) => item.id === journeyId);
      const turn = details[journeyId]?.turns.find((item) => item.id === turnId);
      if (!journey || !turn) return [];
      return [{
        key: `question:${key}`,
        kind: "question" as const,
        journeyId,
        turnId,
        title: turn.question,
        context: `${journey.title} · ${turn.topicLabel}`,
        time: savedAt,
        performerId: journey.performerId,
        pinned: false,
        sourceCount: turn.sources.length,
      }];
    });
    const normalizedQuery = query.trim().toLowerCase();
    return [...journeyItems, ...questionItems]
      .filter((item) => collection === "all" || (collection === "questions" ? item.kind === "question" : item.pinned))
      .filter((item) => performer === "all" || item.performerId === performer)
      .filter((item) => !normalizedQuery || `${item.title} ${item.context}`.toLowerCase().includes(normalizedQuery))
      .sort((left, right) => sort === "title" ? left.title.localeCompare(right.title) : sort === "oldest" ? left.time - right.time : right.time - left.time);
  }, [bookmarks, collection, details, journeys, performer, query, sort]);

  const grouped = items.reduce<Array<{ label: string; items: SavedItem[] }>>((groups, item) => {
    const label = timelineLabel(item.time);
    const group = groups.find((entry) => entry.label === label);
    if (group) group.items.push(item);
    else groups.push({ label, items: [item] });
    return groups;
  }, []);
  const questionCount = Object.keys(bookmarks).length;
  const formatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <section className="bookmarks-view" aria-labelledby="bookmarks-title">
      <header className="bookmarks-header">
        <div>
          <p className="eyebrow"><span /> Saved for later</p>
          <h1 id="bookmarks-title">Your bookmarks</h1>
          <p>Every trail you kept, plus the exact questions you wanted to find again.</p>
        </div>
        <div className="bookmark-summary" aria-label="Bookmark summary">
          <span><strong>{journeys.filter((journey) => !journey.hidden).length}</strong> journeys</span>
          <span><strong>{questionCount}</strong> questions</span>
          <button type="button" onClick={onNew}>Explore something new <ArrowRight aria-hidden="true" /></button>
        </div>
      </header>

      <div className="bookmark-workspace">
        <aside className="bookmark-collections" aria-label="Collections">
          <p>Collections</p>
          <button type="button" className={collection === "all" ? "active" : ""} onClick={() => setCollection("all")}><span>Everything</span><b>{journeys.length + questionCount}</b></button>
          <button type="button" className={collection === "questions" ? "active" : ""} onClick={() => setCollection("questions")}><span>Saved questions</span><b>{questionCount}</b></button>
          <button type="button" className={collection === "pinned" ? "active" : ""} onClick={() => setCollection("pinned")}><span>Pinned journeys</span><b>{journeys.filter((journey) => journey.pinned).length}</b></button>
          <div className="bookmark-care-note"><BookmarkSimple weight="fill" aria-hidden="true" /><p><strong>A small tip</strong>Save any answer from its question page. It will wait here with the path that led to it.</p></div>
        </aside>

        <div className="bookmark-library">
          <div className="bookmark-tools" aria-label="Find and organize bookmarks">
            <label className="bookmark-search"><MagnifyingGlass aria-hidden="true" /><span className="sr-only">Search bookmarks</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions, journeys, or topics" />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X aria-hidden="true" /></button>}</label>
            <label><span>Performer</span><select value={performer} onChange={(event) => setPerformer(event.target.value as PerformerId | "all")}><option value="all">All performers</option>{PERFORMERS.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="recent">Recently saved</option><option value="oldest">Oldest first</option><option value="title">A–Z</option></select></label>
          </div>

          <div className="bookmark-result-line"><span>{items.length} {items.length === 1 ? "item" : "items"}</span><span>Organized by when you saved or explored them</span></div>
          {items.length ? grouped.map((group) => (
            <section className="bookmark-time-group" key={group.label} aria-labelledby={`group-${group.label.replace(/\s/g, "-")}`}>
              <h2 id={`group-${group.label.replace(/\s/g, "-")}`}>{group.label}</h2>
              <div>
                {group.items.map((item) => {
                  const persona = PERFORMERS.find((entry) => entry.id === item.performerId)!;
                  return (
                    <article className={`bookmark-row ${item.kind}`} key={item.key}>
                      <span className={`bookmark-kind ${persona.accent}`}><BookmarkSimple weight={item.kind === "question" ? "fill" : "regular"} aria-hidden="true" /></span>
                      <div className="bookmark-copy"><p><span>{item.kind === "question" ? "Question" : "Journey"}</span>{item.context}</p><h3>{item.title}</h3><small>{formatter.format(item.time)} · {item.sourceCount} sources · with {persona.name}</small></div>
                      <div className="bookmark-row-actions">
                        {item.kind === "journey" ? <button type="button" className={item.pinned ? "pinned" : ""} onClick={() => onPin(item.journeyId, !item.pinned)}>{item.pinned ? "Pinned" : "Pin"}</button> : <button type="button" onClick={() => onToggle(item.journeyId, item.turnId!)}>Remove</button>}
                        <button type="button" className="open-bookmark" onClick={() => onOpen(item.journeyId, item.turnId)}>Open <ArrowRight aria-hidden="true" /></button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )) : (
            <div className="bookmark-empty"><BookmarkSimple aria-hidden="true" /><h2>Nothing tucked away here yet</h2><p>{query ? "Try a broader search or clear a filter." : "Save a question from any answer, or begin a new journey. We’ll keep its place for you."}</p><button type="button" onClick={query ? () => setQuery("") : onNew}>{query ? "Clear search" : "Start exploring"} <ArrowRight aria-hidden="true" /></button></div>
          )}
        </div>
      </div>
    </section>
  );
}

function timelineLabel(time: number) {
  const now = new Date();
  const then = new Date(time);
  if (then.toDateString() === now.toDateString()) return "Today";
  if (now.getTime() - then.getTime() < 7 * 24 * 60 * 60 * 1000) return "This week";
  return "Earlier";
}
