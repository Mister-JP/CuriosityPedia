# CuriosityPedia final-product screen atlas

**Status:** Conceptual-UX control document
**Companion:** [Curiosity-learning North Star](./curiosity-learning-north-star.md)
**Purpose:** Define every user-visible screen and materially different state required to visualize CuriosityPedia as a finished product built from the current application.

## 1. How to use this atlas

This is not only a sitemap. A URL can contain several states that require separate conceptual designs. Each numbered item below is therefore a **design frame**: a page, modal, drawer, sheet, expanded state, or recovery state that changes what the user sees or decides.

Use the frames in numerical order when generating conceptual UI. For each frame, provide the current application and North Star document as references. The concept must state what is retained, what changes, and what is introduced. Do not redesign a frame in isolation from the frame before and after it.

Every frame must be shown at desktop width and checked at mobile width. Mobile does not need a separate visual concept when it is a faithful reflow. It does need a separate concept when navigation, spatial interaction, comparison, graph exploration, or a modal changes form.

### Status legend

- **Retain:** The current screen remains substantially recognizable. Improve hierarchy, copy, responsive behavior, and integration.
- **Evolve:** The current screen provides the base, but its purpose or composition expands.
- **Rebuild:** A current screen occupies the right place in the journey, but its interaction model changes substantially.
- **New:** No equivalent screen exists in the current application.
- **Conditional:** Required only if the associated commercial, sharing, child-account, or reward capability ships.
- **System state:** Not a destination in navigation, but still requires an intentional user-visible design.

## 2. Final information architecture

The finished product has seven primary destinations:

1. **Play** — arrival, warm-up, and starting a new discovery.
2. **Current session** — the active Knowledge Session and Curiosity Session.
3. **Atlas** — the user’s graph of Concepts, Sessions, Jumps, paths, and Frontiers.
4. **Library** — Concepts, Sessions, journeys, saved questions, notes, and paused work.
5. **Inquiry book** — the user’s growing repertoire of question forms and Lenses.
6. **Progress** — descriptive reflection on knowledge, inquiry, and game progress.
7. **Account** — preferences, accessibility, privacy, usage, plan, and identity.

“Current session” appears only while work is active. On small screens, primary navigation becomes a compact bottom or menu-based system; it must not compete with images, writing, or graph controls.

The current top-level destinations map forward as follows:

| Current destination | Final role | Decision |
|---|---|---|
| New drive | Play | Rebuild the question-first start as a guided invitation and warm-up. |
| Journey stage | Knowledge Session | Evolve the researched answer into a multi-image learning sequence. |
| Journey map | Atlas / journey path | Evolve the existing graph into one zoom level of the personal atlas. |
| Library | Library | Expand from saved journeys to Concepts, Sessions, paths, and paused work. |
| Bookmarks | Saved items within Library | Retain its useful filtering and timeline patterns; broaden saved object types. |
| Usage | Account → Usage | Retain as an operational screen; separate limits from learning progress. |
| Settings | Account → Preferences | Retain and expand with memory, privacy, curiosity-session, and accessibility controls. |

## 3. Global surfaces

These frames establish the shell in which all later screens live.

### G01 — Application opening

**Status:** Retain · System state
**Entry:** The application is resolving identity, preferences, and saved state.
**Show:** CuriosityPedia wordmark, the warm editorial background, a restrained loading movement, and one precise status line. Do not show an empty dashboard or fake content.
**Exit:** First-visit arrival, returning-player arrival, or recovery.
**Current base:** Existing “Opening your CuriosityPedia library…” fallback.

### G02 — Standard desktop shell

**Status:** Evolve
**Show:** Wordmark; seven-destination navigation; identity/progress affordance; active-session indicator when applicable; global search access; contextual page title. The shell remains quieter than the content.
**Behavior:** The active session survives navigation. Returning to it restores the exact image, note, and prompt position.

### G03 — Standard mobile shell and navigation

**Status:** New composition
**Show:** Compact wordmark, one contextual action, and a bottom navigation or menu containing Play, Session, Atlas, Library, and Account. Inquiry Book and Progress may sit under Library or Account only if they remain one tap away.
**Behavior:** When typing, inspecting an image, or manipulating the graph, navigation recedes without becoming inaccessible.

### G04 — Global search overlay

**Status:** New
**Entry:** Search from any primary destination.
**Searches:** Concepts, Knowledge Sessions, user questions, notes, threads, journeys, image captions, and sources.
**Results:** Group by object type; show the path that produced each result; distinguish “opened before” from “not yet explored.”
**Actions:** Open history, resume a paused Curiosity Session, inspect a Concept, or begin a new session from the result.

### G05 — Notification and action feedback

**Status:** Evolve · System state
**Show:** Compact banners or toasts for saved note, bookmark, snapshot, settings saved, reward earned, session paused, and recoverable synchronization problems.
**Rule:** A notification never covers the primary image, prompt, or commit action. Every destructive or durable result remains discoverable after the toast disappears.

### G06 — Guest-to-account migration

**Status:** Evolve
**Entry:** A signed-in account has a separate guest library.
**Show:** What will move—Concepts, Sessions, notes, graph connections, and progress—not merely “journeys.”
**Actions:** Preview migration, merge, defer, and resolve duplicates.
**Outcome:** Confirmation lists merged and skipped records.

## 4. Arrival and warm-up

The product starts by inviting the user to play. It does not require the user to arrive with a polished question.

### A01 — First-visit invitation

**Status:** Rebuild
**Entry:** A new guest or account with no history.
**Primary copy:** A direct invitation such as “Ready to notice something you have never noticed before?”
**Show:** A small sample of real images or cropped evidence details; one primary action, **Play**; a secondary explanation, **How this works**; sign-in remains secondary.
**Do not show:** A blank question box, configuration controls, usage counters, or a dashboard.

### A02 — How the game works

**Status:** New
**Form:** Short overlay or page reached from A01.
**Explain with one concrete loop:** Look closely → learn from evidence → write what you notice → follow one thread → build your atlas.
**Clarify:** There are no right personality answers; research is source-backed; thoughts remain private by default; points reward participation and revision, not conformity.
**Action:** Start playing.

### A03 — Returning-player invitation

**Status:** Rebuild
**Entry:** User has history but no unfinished session.
**Show:** Time since last visit, one specific memory from the last path, current streak only if it does not punish absence, and two actions: **Continue from a frontier** and **Deal me three wonders**.
**Optional prompt:** “Last time, a question about public space led you to ritual. Ready for another turn?”

### A04 — Resume unfinished work

**Status:** New
**Entry:** A Knowledge or Curiosity Session was paused.
**Show:** Concept, last completed step, saved notes, elapsed time, and exactly what resumes.
**Actions:** Resume; start a shorter session; pause and choose something else.
**Rule:** Never discard writing or silently restart research.

### A05 — Readiness and energy check

**Status:** New
**Purpose:** Adjust session shape without turning arrival into a therapeutic mood survey.
**Prompt:** “What kind of attention do you have right now?”
**Choices:** Quick look; follow a story; look closely; surprise me. Optional time choices are 3, 10, or 20+ minutes.
**Effect:** Controls Knowledge Session length and prompt count, not research quality.

### A06 — Starting-material chooser

**Status:** New
**Show as experiential doors:** Images; a place; a song; something happening now; a culture; science and nature; systems and society; something I saw or bought; surprise me.
**Behavior:** Each choice opens a brief follow-up appropriate to the material. Do not present a subject taxonomy as homework.

### A07 — Personal starting-material interview

**Status:** New
**Entry:** User chooses “something I saw, did, bought, or wondered about.”
**Ask one prompt at a time:** What stayed with you? What can you describe without explaining? What part feels unfinished?
**Inputs:** Text, voice, image upload, or skip.
**Outcome:** The system converts the material into three possible discovery doors; it does not grade the response or expose inferred mood labels.

### A08 — Three-wonder deal loading

**Status:** New · System state
**Show:** Three reserved card positions with meaningful status copy: selecting evidence, checking sources, and varying the angles.
**Rule:** Do not reveal cards one-by-one in a way that makes the first card appear recommended.

### A09 — Three-wonder deal

**Status:** New
**Show:** Exactly three visually distinct, equally weighted cards. Each has a real evidence image, a concrete invitation, a domain label, an expected time, and why it fits the current entry context.
**Actions:** Choose one; replace all three; change starting material.
**Do not show:** Quality rankings, hidden personalization claims, scores, or a generic list of questions.

### A10 — Wonder preview

**Status:** New
**Entry:** The user asks for more context before choosing.
**Show:** Larger image, two-sentence premise, source provenance, likely visual sequence, and the first observation invitation.
**Actions:** Begin; return to the same three-card deal.

### A11 — User-proposed topic intake

**Status:** Evolve
**Purpose:** Preserve the current ability to bring a topic without making question-writing the default start.
**Prompt:** “Bring me something you want to look at.”
**Behavior:** Accept a topic, link, image, or rough thought. Ask at most two clarifying questions, then offer three researchable lenses.
**Current base:** Existing freeform question field and recommendations.

## 5. Research preparation

### R01 — Session contract

**Status:** New
**Entry:** A wonder or user-proposed lens is selected.
**Show:** Concept or working topic; incoming context; session length; expected image count range; research freshness; output language.
**Actions:** Begin; adjust length; change selection. Advanced model/provider controls move out of the primary path.

### R02 — Live research in progress

**Status:** Evolve
**Show in the future result layout:** Title region, image sequence skeleton, evidence/status rail, and clear live stages—finding primary evidence, checking image rights/source pages, assembling the explanation, preparing curiosity prompts.
**Actions:** Leave safely; cancel; continue elsewhere while it runs.
**Current base:** Existing buffering stage and event log.

### R03 — Research retrying

**Status:** Retain · System state
**Show:** Attempt count, what failed, whether a different source strategy is being used, and whether any cost or quota was consumed.
**Actions:** Keep trying; shorten the session; cancel.

### R04 — Research cannot complete

**Status:** Evolve · System state
**Variants:** Network/provider failure; quota reached; budget protection; concurrent research in another tab; content-safety block.
**Show:** Cause in user language, what was saved, what was not charged or counted, diagnostic reference when useful, and the appropriate next action.
**Actions by cause:** Retry; use this tab; open Usage; choose another wonder; return to saved work.

### R05 — Insufficient visual evidence

**Status:** Rebuild · System state
**Rule:** A new Knowledge Session does not silently complete with placeholder imagery.
**Show:** What evidence was found, why it is insufficient, and choices to broaden the source window, accept a shorter session with the verified images, or choose another lens.
**Current base:** Existing “Visual evidence required” state for legacy turns.

## 6. Knowledge Session

This is the encyclopedia. It remains authoritative, source-backed, image-led, and beautiful.

### K01 — Knowledge Session opening

**Status:** Evolve
**Show:** Concept title; session-specific question or lens; path provenance (“arrived from…”); session number for this Concept; researched date; length; image count; and a clear **Begin looking** action.
**If revisiting:** State that this is a fresh session generated from a new incoming Jump.

### K02 — Image-led learning sequence

**Status:** Rebuild from the current answer stage
**Show:** Six to twelve strong images when evidence supports them. The selected image dominates; the remaining sequence stays visible as thumbnails or a filmstrip. Every image has a role, caption, source, commentary, and “what to notice.” Short text blocks sit beside the evidence they explain.
**Actions:** Next/previous image; jump within sequence; enlarge; open source; save image or note; change reading depth; enter Curiosity Session.
**Continuity:** Preserve the current editorial card, evidence gallery, source citations, real-image contract, and warm visual language.

### K03 — Glance session variant

**Status:** New composition
**Use:** Low-energy or 3-minute choice.
**Show:** Three to five verified images, one concise explanation per visual beat, and one synthesis. It still ends in a Curiosity Session; it is not a lower-quality answer.

### K04 — Explore session variant

**Status:** New composition
**Use:** Default.
**Show:** Six to nine images across context, detail, comparison, process, human scale, and consequence where applicable.

### K05 — Immerse session variant

**Status:** New composition
**Use:** 20+ minute choice or explicit deeper exploration.
**Show:** Eight to twelve images, sections, richer source context, historical or systems comparison, and optional primary-source excerpts within quotation limits.

### K06 — Expanded image inspection

**Status:** Evolve
**Form:** Full-screen lightbox on desktop; full-screen sheet on mobile.
**Show:** Highest useful image resolution, pan/zoom, caption, date, creator, location, source, evidence role, and related note markers.
**Actions:** Mark an area; dictate or type a note; compare with another image; return to the same reading position.

### K07 — Two-image comparison

**Status:** New
**Show:** Images side by side or swipe-linked on mobile, synchronized metadata, and optional difference prompts.
**Actions:** Swap either image; write what changed; save comparison as a note.

### K08 — Evidence and research details

**Status:** Retain
**Form:** The current deep-dive dialog evolves into a dedicated drawer or page on small screens.
**Show:** Full answer, all sources, source-to-claim mapping, research summary, model/provider metadata where appropriate, researched time, and media provenance.
**Rule:** Operational metadata never dominates the default encyclopedia view.

### K09 — Source detail

**Status:** New
**Entry:** Select a citation or evidence source.
**Show:** Publisher, title, author, date, source type, claims supported, associated images, external link, and why it was included.
**Actions:** Open original; save; report a problem; return.

### K10 — Knowledge Session contents and progress

**Status:** New
**Form:** Collapsible rail or sheet.
**Show:** Visual beats, completed beats, saved notes, current position, and estimated remaining time.
**Rule:** Progress reports location, not performance.

### K11 — Session completion threshold

**Status:** New
**Entry:** The user has viewed enough evidence to begin reflection, or chooses to stop early.
**Show:** Images viewed, sections skipped, saved notes, and choices: start curiosity; revisit an unseen image; pause.
**Rule:** Curiosity is invited, not locked behind 100% scrolling.

## 7. Curiosity Session

The Curiosity Session is a guided thinking and note-taking workspace about the evidence just encountered. The system asks questions to help the user produce questions.

### C01 — Transition from learning to looking again

**Status:** New
**Show:** A quiet visual reset using selected images from the Knowledge Session and the line “Now let’s look again.”
**Explain once:** Nothing here is graded for correctness; notes can be incomplete.
**Action:** Begin.

### C02 — Observation workspace

**Status:** New
**Prompt family:** What are you seeing? What did you miss at first? What detail keeps pulling your attention?
**Show:** One or more images, current prompt, spacious scratch pad, image-selection strip, note tools, and a visible path back to the relevant encyclopedia section.
**Inputs:** Text, voice, drawing/marking, selection from the image, or “I’m not sure.”

### C03 — Interpretation workspace

**Status:** New
**Prompt family:** What might be happening? What makes you say that? What else could explain it?
**Behavior:** The system refers to the user’s actual observation and asks for evidence. It does not replace the user’s thought with a polished answer.

### C04 — Feeling and significance workspace

**Status:** New
**Prompt family:** What feeling or tension is present? Why might this matter to someone here? What value appears to be in conflict?
**Rule:** Feeling prompts are optional and tied to the material; the system does not diagnose the user.

### C05 — Confusion and contradiction workspace

**Status:** New
**Prompt family:** What does not fit? Which two pieces seem to conflict? What would you need to know to resolve this?
**Show:** Relevant evidence excerpts side by side when possible.

### C06 — Perspective and Lens workspace

**Status:** New
**Prompt family:** Who sees this differently? What changes at another scale, time, place, or role?
**Show:** Suggested Lens chips only after the user has offered an initial thought. Each Lens explains what kind of question it opens.

### C07 — Question-building workspace

**Status:** New
**Purpose:** Turn notes into the user’s own inquiries.
**Show:** Note fragments on one side; a question workbench on the other. Offer transformations such as observation → cause, detail → system, present → history, person → institution, pattern → exception.
**Actions:** Draft; test; revise; save multiple questions.
**Rule:** Suggestions are scaffolds, not the only valid formulations.

### C08 — Inquiry feedback and revision

**Status:** New
**Show descriptive feedback:** What the question opens, what assumption it contains, which evidence it connects to, whether it is answerable, and one possible strengthening move.
**Actions:** Revise; keep the original; explain why the original matters.
**Do not show:** Curiosity score, percentile, grade, or comparison with other children.

### C09 — Open scratch pad

**Status:** New
**Entry:** User chooses to think without the current prompt.
**Show:** Free canvas/list, draggable image references, text/voice notes, links back to evidence, and prompt drawer.
**Behavior:** Autosave continuously and preserve roughness.

### C10 — Return to knowledge and back

**Status:** New state
**Behavior:** Reopening the Knowledge Session highlights the image or claim that triggered the current note. Returning restores the scratch pad and prompt exactly.
**Design need:** Show the visual relationship between “zoom in to evidence” and “zoom out to think.”

### C11 — Curiosity Session progress drawer

**Status:** New
**Show:** Completed prompt families, not a completion percentage; current notes; questions drafted; optional next families; and session length.
**Actions:** Continue; skip a family; finish now; pause.

### C12 — Pause and resume confirmation

**Status:** New
**Show:** What is saved and the exact resume point.
**Actions:** Pause; keep thinking; finish with current notes.

### C13 — Fatigue adaptation

**Status:** New · System state
**Trigger:** User repeatedly skips, writes very short responses, or explicitly asks to stop.
**Offer:** One final visual prompt; save and pause; switch to a three-minute close.
**Rule:** Never label the user disengaged or reduce future challenge permanently.

### C14 — No meaningful thread yet

**Status:** New · Recovery state
**Show:** Existing observations without criticism and three concrete recovery moves: compare two images, inspect one detail, or choose a different Lens.
**Actions:** Try one move; finish without a Jump; return later.

## 8. From thoughts to the next Jump

### J01 — Thought field / zoomed-out brainstorm

**Status:** New
**Entry:** The user has enough notes or chooses to synthesize.
**Show:** Images, notes, marked details, drafted questions, and Lens labels arranged by relationship. The current Concept remains the visual center.
**Behavior:** Connections are suggested but visibly distinguish system suggestions from user-created links.

### J02 — Curiosity threads

**Status:** New
**Show:** Three to seven thread cards derived from the user’s work. Each card includes the user’s originating words, linked evidence, question, Lens, possible destination, and how it differs from other threads.
**Actions:** Open; edit; merge; discard; create a thread manually.

### J03 — Thread detail and refinement

**Status:** New
**Show:** Full provenance from image → note → interpretation → question; system explanation of the proposed next inquiry; editable wording.
**Actions:** Choose this path; revise; return.

### J04 — Thread selection

**Status:** New
**Show:** The chosen thread alone, with its origin and expected inquiry. Ask for commitment only after the user understands the path.
**Action:** Find where this leads.

### J05 — Concept resolution in progress

**Status:** New · System state
**Rule:** Resolution happens after thread selection to avoid anchoring.
**Show:** The chosen question and a restrained indication that CuriosityPedia is checking the user’s existing atlas.

### J06 — New-Concept reveal

**Status:** New
**Show:** Proposed Concept name, plain definition, relation to the current Concept, and the user’s incoming question.
**Actions:** Begin fresh Knowledge Session; rename the Concept; correct the interpretation; choose a different thread.

### J07 — Existing-Concept reveal

**Status:** New
**Primary message:** “You have been here before—but never from here.”
**Show:** Concept name; previous visit count; previous incoming paths; what this new Jump changes; thumbnails of earlier sessions; unresolved Frontiers.
**Actions:** Begin fresh session from this new context; inspect history first; compare incoming Lenses; choose another thread.

### J08 — Ambiguous Concept match

**Status:** New · Recovery state
**Show:** Two or more possible existing Concepts with definitions and prior context, plus **This is a new Concept**.
**Actions:** Select; merge only with explanation; rename.
**Rule:** The system never silently merges semantically different Concepts.

### J09 — Jump confirmation

**Status:** New
**Show:** From Concept, selected evidence/note, Lens, question, destination Concept, and session length.
**Actions:** Start research; adjust length; return to threads.
**Outcome:** Committing creates a Jump record and then a new Knowledge Session. Merely opening history does not.

### J10 — Jump research loading

**Status:** New composition
**Show:** The existing Concept, prior sessions, and the new incoming path as context around the loading skeleton. Make it clear that new images and content are being researched for this route, not replayed from history.

## 9. Concepts and repeated visits

### P01 — Concept overview

**Status:** New
**Show:** Concept name and definition; hero evidence mosaic; all Knowledge Sessions; incoming and outgoing Jumps; questions asked; notes; Lens coverage; unresolved Frontiers; last visited.
**Primary actions:** Begin a fresh session; continue a Frontier; compare sessions; open neighborhood in Atlas.

### P02 — Concept session history

**Status:** New
**Show:** Immutable session cards ordered by date or path. Each card contains incoming Concept, Jump question, Lens, image mosaic, research date, notes count, and resulting outgoing Jump.
**Actions:** Open; compare; branch from this older session.

### P03 — Historical Knowledge Session

**Status:** Evolve from historical turn
**Show:** The complete old images, content, sources, Curiosity Session, questions, notes, and outgoing path as they existed. A persistent notice identifies it as history.
**Actions:** Reopen its brainstorm; compare; create a new Jump from it; generate a fresh session.
**Rule:** Never overwrite or silently refresh old evidence.

### P04 — Historical Curiosity Session

**Status:** New
**Show:** Prompt sequence, original responses, revisions, notes, image marks, resulting threads, and selected Jump.
**Actions:** Read only by default; copy a note into current work; reopen as a new reflection version; compare with a newer Curiosity Session.

### P05 — Session comparison selector

**Status:** New
**Show:** Sessions for one Concept with incoming paths, dates, Lens labels, and image mosaics.
**Action:** Select two; optionally add a third only on wide screens.

### P06 — Session comparison

**Status:** New
**Compare:** Incoming Jump, core question, image set, evidence changes, explanation changes, user observations, questions, Lenses, and outgoing choices.
**Show:** Side-by-side on desktop; locked synchronized sections or swipe comparison on mobile.
**Purpose:** Reveal how the user’s way of seeing changed without declaring one session better.

### P07 — Fresh-session setup from an existing Concept

**Status:** New
**Entry:** “Begin fresh session” on Concept history.
**Show:** What is intentionally new—current date, selected incoming context, unexplored Lenses, repeated-content exclusions, and desired length.
**Actions:** Start; change Lens; include or exclude selected prior sources.

### P08 — Repeated-content warning

**Status:** New · Recovery state
**Show:** Which proposed images or explanations substantially overlap a prior session and what alternative angle can replace them.
**Actions:** Regenerate the repeated section; accept with explanation; return to setup.

## 10. Atlas and spatial views

### M01 — Personal atlas, maximum zoom-out

**Status:** Rebuild from Journey Map
**Show:** All Concepts as durable nodes; Knowledge Sessions as visit stacks or rings; Jumps as directed edges; Frontiers as open marks; current path highlighted.
**Controls:** Pan; zoom; search; filter by domain, date, Lens, completion, or path; recenter; accessible outline.
**Rule:** Spatial position conveys stable relationships. The layout must not reshuffle unpredictably on every visit.

### M02 — Concept neighborhood

**Status:** New semantic zoom level
**Show:** One Concept, neighboring Concepts, incoming/outgoing Jumps, session versions, repeated visits, and Frontiers.
**Actions:** Inspect edge; open Concept; start from Frontier; zoom in to session; zoom out to atlas.

### M03 — Journey/path view

**Status:** Evolve
**Show:** The selected chronological route through Concepts and Sessions, including branches not taken. Preserve current tree controls, search, node inspector, graph/outline modes, and branch preview where they remain useful.
**Difference from atlas:** A path is a subset of the personal graph, not the user’s entire knowledge world.

### M04 — Atlas search results

**Status:** Evolve
**Show:** Matches in context on the graph and in a readable result list. Result types include Concept, session, question, note, source, and Frontier.
**Actions:** Focus on graph; open detail; add to comparison.

### M05 — Node inspector

**Status:** Evolve
**Desktop:** Right inspector.
**Mobile:** Bottom sheet.
**Show by node type:** Definition and session count for Concepts; incoming context and image mosaic for Sessions; question and Lens for Jumps; unasked question for Frontiers.
**Actions:** Open, focus neighborhood, compare, or continue.

### M06 — Jump/edge inspector

**Status:** New
**Show:** Origin, destination, user note and evidence that produced the Jump, question, Lens, date, and resulting session.
**Actions:** Open either Concept; open resulting session; compare with another route.

### M07 — Frontier explorer

**Status:** New
**Show:** Unexplored questions and relationships grouped by Concept and Lens, with provenance and age.
**Actions:** Continue; archive; combine; ask CuriosityPedia for a different Frontier.
**Rule:** Frontiers are invitations, not an obligation backlog.

### M08 — Accessible atlas outline

**Status:** Evolve
**Show:** The same graph as a navigable hierarchy/list with Concepts, sessions, and Jumps in reading order. Support keyboard traversal, expansion, filtering, and all core actions.
**Current base:** Existing Journey Map outline mode.

### M09 — Atlas mobile focus mode

**Status:** New composition
**Show:** One neighborhood or path at a time, breadcrumb back to the full atlas, pinch/zoom where reliable, list fallback, and a bottom-sheet inspector. Avoid shrinking the desktop graph into illegibility.

## 11. Library and personal memory

### L01 — Library home

**Status:** Rebuild
**Show:** Continue section; recent Concepts; paused Sessions; active Frontiers; saved items; journeys/paths; and search.
**Purpose:** Resume meaningful work, not merely manage storage.

### L02 — Concept library

**Status:** New
**Show:** Concept cards with visual mosaic, visits, last incoming Lens, notes, Frontiers, and last activity.
**Controls:** Search; sort; filter by domain, Lens, date, repeat visits, or Frontier status.

### L03 — Session library

**Status:** New
**Show:** All Knowledge Sessions as immutable records with Concept, path provenance, image mosaic, length, date, and Curiosity Session state.
**Actions:** Open; compare; resume curiosity; save; export.

### L04 — Journey/path library

**Status:** Evolve
**Show:** Existing journey cards with title, Concepts traversed, session count, sources, open Frontiers, last activity, and path preview.
**Actions:** Resume; rename; pin; hide; snapshot; export; remove with confirmation.
**Current base:** Existing Library screen.

### L05 — Saved items

**Status:** Evolve
**Objects:** Questions, notes, images, sources, Concepts, Sessions, and paths.
**Show:** Timeline grouping, object type, originating path, source count, search, collections, and filters.
**Current base:** Existing Bookmarks screen.

### L06 — Notes archive

**Status:** New
**Show:** Notes grouped by Concept, image, session, or time. Distinguish observation, interpretation, feeling, confusion, question, and synthesis without forcing labels.
**Actions:** Open in context; combine into thread; export; correct Lens label; archive.

### L07 — Question history

**Status:** New
**Show:** Every user-authored question, its drafts, feedback, linked evidence, Lens, resulting Jump, and whether it remains a Frontier.
**Actions:** Revisit; revise into a new version; compare formulations; start a session.

### L08 — Paused work

**Status:** New
**Show:** Incomplete Knowledge Sessions, Curiosity Sessions, thread selections, and research jobs with exact resume state.
**Actions:** Resume; finish in short mode; archive safely.

### L09 — Empty library

**Status:** Evolve · Empty state
**Show:** What will eventually live here, one concrete sample card, and **Play your first session**.
**Do not show:** An empty grid with management filters.

### L10 — Filtered library with no results

**Status:** Retain · Empty state
**Show:** Active filters and search phrase.
**Actions:** Clear one filter; clear all; return to recent items.

### L11 — Rename, organize, and remove

**Status:** Evolve · Overlay state
**Show:** In-product dialog rather than a browser prompt. Explain whether the operation affects a display title, Concept identity, path, or only library visibility.
**Destructive confirmation:** Name the record, dependent records, recoverability, and what remains intact.

## 12. Inquiry Book

### I01 — Inquiry Book home

**Status:** New
**Show:** The user’s active question-making repertoire, recently used Lenses, suggested next practice, and examples drawn from their own work.
**Rule:** This is a field guide, not a course catalog or score dashboard.

### I02 — Lens family index

**Status:** New
**Families:** Observation, evidence, cause, mechanism, comparison, perspective, scale, time, systems, values, possibility, and metacognition.
**Show:** Plain purpose, sample question stems, and count of contexts in which the user has tried each Lens.

### I03 — Lens detail

**Status:** New
**Show:** What the Lens reveals, when it helps, common weak forms, examples from multiple subjects, and the user’s own prior uses.
**Actions:** Practice on a saved image; apply to current session; browse related Lenses.

### I04 — Guided Lens practice

**Status:** New
**Show:** One saved or novel image, a brief scaffold, user response, descriptive feedback, and mandatory revision opportunity.
**Outcome:** Practice is recorded separately from game points and subject knowledge.

### I05 — Question-word tool

**Status:** New
**Show:** What, why, how, when, where, who, which, what-if, and how-might with examples of what each tends to open or prematurely assume.
**Behavior:** Demonstrate that question quality depends on purpose, evidence, and framing—not on starting word alone.

### I06 — Inquiry transfer check

**Status:** New
**Show:** A new topic or image from a different domain and invite the user to reuse a Lens without step-by-step scaffolding.
**Feedback:** Describe transfer and offer a later recheck; never issue a permanent mastery badge after one attempt.

## 13. Progress, reflection, and game

### D01 — Progress home

**Status:** New
**Separate three sections:** What I have explored; how my inquiry is changing; game progress.
**Rule:** No single composite curiosity score.

### D02 — Knowledge progress

**Status:** New
**Show:** Concepts visited, repeated visits, paths, images inspected, sources opened, domains, and durable connections. Emphasize breadth and revisiting without equating volume with understanding.

### D03 — Inquiry reflection

**Status:** New
**Show narrative evidence:** Questions becoming more specific, increased evidence use, new Lens use, revisions, contradictions noticed, and examples from the user’s own history.
**Copy form:** “Earlier you often asked X. Recently you also…” followed by inspectable examples.

### D04 — Lens coverage

**Status:** New
**Show:** Contexts in which each Lens was attempted, revisited, transferred, or not yet explored.
**Rule:** Coverage is a map, not a radar-chart verdict about the child.

### D05 — Topic-angle history

**Status:** New
**Show:** How the same Concept was approached through different paths, scales, time periods, perspectives, and systems. Link each angle to its session and questions.

### D06 — Periodic reflection

**Status:** New
**Entry:** After a meaningful interval or set of sessions, not every visit.
**Ask:** What kind of detail are you noticing now? Which question changed your mind? What do you want to notice next?
**Show:** Selected historical examples and allow correction of the system’s interpretation.

### D07 — Game progress

**Status:** New
**Show:** Points or equivalent currency, completed milestones, next small reward, and long-term experiential prize path.
**Eligible actions:** Completing reflection, revising a question, returning after spacing, transferring a Lens, completing a path, or contributing an optional reflection.
**Do not reward:** Clicks, words, time spent, API spend, correct opinion, or comparison with peers.

### D08 — Milestone celebration

**Status:** New · Overlay state
**Show:** The exact meaningful action completed and what it unlocked. Use restrained delight, real visual references, and an immediate return to the user’s work.
**Actions:** Continue; view reward path. No forced sharing.

### D09 — Reward path

**Status:** Conditional
**Show:** Near-term experiential rewards, requirements, availability, safeguards, and the ultimate prize as a long but reachable path for every eligible user.
**Rule:** Do not imply scarcity between users unless operationally true.

### D10 — Experience reward detail

**Status:** Conditional
**Show:** Place or experience, people involved, dates or flexibility, guardian requirements, accessibility, what is included, cancellation rules, and progress needed.
**Actions:** Save as goal; redeem when eligible; ask a guardian; choose an alternative.

### D11 — Reward redemption and confirmation

**Status:** Conditional
**Show:** Eligibility, identity/guardian verification, logistics, privacy disclosure, and final confirmation. Keep commercial fees or taxes explicit.
**Outcome:** Confirmation, next steps, support contact, and reversible cancellation where possible.

### D12 — Points/activity ledger

**Status:** Conditional
**Show:** Every earning and spending event with reason and associated session.
**Actions:** Report a problem; understand rules.
**Rule:** Learning data and financial/reward accounting remain distinguishable.

## 14. Sharing, snapshots, and exports

### S01 — Save/share menu

**Status:** Evolve
**Show:** Save question, save image, save note, snapshot session, export private archive, and create share card. Explain visibility before sharing.

### S02 — Share-card composer

**Status:** New
**Show:** Selected image, question, short insight, source credit, CuriosityPedia mark, and privacy preview.
**Actions:** Choose layout; remove personal notes; copy link; download image; cancel.

### S03 — Public shared view

**Status:** Conditional
**Show:** Shared session/question with evidence and source attribution, but no private graph, identity details, reward data, or unrelated history.
**Actions:** Explore this topic as a new private session; report; open sources.

### S04 — Snapshot history

**Status:** Evolve
**Show:** Immutable snapshots by date with included Concepts, Sessions, questions, and graph state.
**Actions:** Inspect; export; compare; restore only through a new copy, never destructive replacement.

### S05 — Data export preparation and completion

**Status:** Evolve · System state
**Show:** Included records, format, estimated size, preparation status, expiration time, and download.
**Formats:** Human-readable archive and structured data export.

## 15. Account, preferences, safety, and commerce

### T01 — Account overview

**Status:** Evolve
**Show:** Identity mode, synchronization, saved-record counts, plan, privacy shortcuts, child/guardian state when applicable, and sign-in/out.
**Current base:** Existing Settings account card.

### T02 — Experience preferences

**Status:** Evolve
**Controls:** Interface language, output language, default session length, answer depth, image density, prompt pace, voice input, text size, reduced motion, contrast, captions/transcripts, and notification choices.
**Rule:** State clearly which choices alter presentation versus research scope.

### T03 — Personalization and memory controls

**Status:** New
**Show:** What the system uses: history, saved interests, recent paths, preferred Lenses, session length patterns, and explicitly provided personal starting material.
**Actions:** Inspect; correct; disable a category; clear recommendations without deleting the underlying private archive.

### T04 — Privacy center

**Status:** New
**Show:** Visibility defaults, stored data categories, retention, training/use policy, sharing history, connected identity, and child protections.
**Actions:** Export; delete selected records; delete account/session; manage consent; contact support.

### T05 — Delete data or account

**Status:** New · Destructive flow
**Show:** Exact scope—notes, sessions, graph, rewards, account, guest browser state—plus irreversibility and any legally retained transaction records.
**Steps:** Select scope; review dependencies; confirm identity; final confirmation; completion receipt.

### T06 — Child and guardian setup

**Status:** Conditional
**Show:** Age-appropriate explanation, guardian consent where required, privacy defaults, content filters, reward/travel permissions, communication limits, and who can view progress.
**Rule:** Do not expose inferred emotional or cognitive profiles to guardians as scores.

### T07 — Guardian overview

**Status:** Conditional
**Show:** Consent and safety controls, high-level activity, upcoming experiential reward requirements, support, and privacy settings.
**Do not show:** Private note text by default, comparative curiosity rankings, or behavioral diagnoses.

### T08 — Usage and limits

**Status:** Retain
**Show:** Research runs, rolling reset schedule, saved-library capacity, provider spend where appropriate, and account scope. Keep this operational and separate from points and learning progress.
**Current base:** Existing Usage page.

### T09 — Usage loading, error, and quota reached

**Status:** Retain · System states
**Loading:** Preserve the page structure.
**Error:** Retry without losing navigation.
**Quota reached:** State the next returning slot, work still available without research, and plan options if offered.

### T10 — Plan and pricing

**Status:** Conditional
**Show:** Fixed infrastructure/product layer and variable API/research use in plain terms; included limits; child/household rules; reward-program relation; cancellation.
**Rule:** Payment never improves the evaluation of a user’s curiosity or buys inquiry status.

### T11 — Upgrade checkout

**Status:** Conditional
**Show:** Selected plan, billing interval, taxes, renewal, immediate effects, payment method, cancellation, and consent.
**Outcome:** Confirmation returns to the blocked action.

### T12 — Settings saved and settings failure

**Status:** Evolve · System states
**Success:** Identify synchronized versus device-only changes.
**Failure:** Preserve draft settings, explain which preview remains temporary, and allow retry.

## 16. Authentication and identity states

### U01 — Sign-in handoff

**Status:** Evolve · System state
**Show before external handoff:** Why sign-in helps, what will sync, and that play can continue as a guest. Preserve return destination.

### U02 — Sign-in returning

**Status:** Evolve · System state
**Show:** Restoring account, reconciling guest work, and returning to the prior screen. Do not drop the user at a generic homepage.

### U03 — Sign-in failure or cancellation

**Status:** New · Recovery state
**Show:** Nothing was lost; guest state remains; retry and continue-as-guest actions.

### U04 — Session expired

**Status:** New · Recovery state
**Show:** Whether local work is recoverable, which records require sign-in, and the exact consequences of continuing as a new guest.

## 17. Universal empty, error, and safety states

These states must inherit the page they belong to instead of replacing the entire application with a generic error.

### E01 — Offline

**Status:** New · System state
**Show:** Saved material that remains readable; queued notes; research actions disabled; reconnection status.
**Actions:** Keep writing offline; retry; return to downloaded/saved sessions.

### E02 — Synchronization conflict

**Status:** New · System state
**Show:** Both note/session versions, timestamps, and differences.
**Actions:** Keep both; merge; choose one. Never silently discard a child’s writing.

### E03 — Content unavailable or removed

**Status:** New · Recovery state
**Variants:** Source image removed; source page unavailable; session deleted; shared item revoked.
**Show:** What remains in the immutable record, why live evidence is missing when known, and alternate verified sources if available.

### E04 — Content-safety boundary

**Status:** New · Safety state
**Show:** Age-appropriate reason the requested path cannot be researched as asked, without exposing harmful detail.
**Actions:** Reframe the inquiry; return to threads; seek guardian/support help where appropriate.

### E05 — Not found or invalid route

**Status:** New · Recovery state
**Show:** CuriosityPedia shell, plain explanation, and context-aware destinations: active session, Library, Atlas, or Play. Do not display an empty active-session fallback for malformed URLs.

### E06 — No active session

**Status:** Evolve · Empty state
**Show:** Continue a recent session if one exists; otherwise Play.
**Current base:** Existing empty stage shown when a journey view has no active turn.

### E07 — Library or research capacity blocked

**Status:** Evolve · Recovery state
**Show:** Exact limit; what action triggered it; saved work; next availability; and safe choices. Library capacity offers archive/export/remove. Research capacity offers non-research activities and next reset.

### E08 — Concurrent research in another tab

**Status:** Retain · Recovery state
**Show:** Which question is running when known, when it began, and choices: return to that tab, take over here, or cancel. Explain that takeover may stop the other run.

### E09 — Unexpected application failure

**Status:** Evolve · System state
**Show:** What was autosaved, diagnostic reference, reconnect, download local notes when possible, and support route. Preserve global navigation if safe.

## 18. Design-production queue

Generating all 133 frames independently would create inconsistency and waste. Produce concepts in the following **screen families**; within each family, include the listed variants as separate frames or annotated states.

1. **Shell family:** G02, G03, G04.
2. **First arrival family:** A01, A02, A05, A06.
3. **Returning arrival family:** A03, A04.
4. **Discovery deal family:** A08, A09, A10, A11.
5. **Research family:** R01–R05 and J10.
6. **Knowledge family:** K01, K02, K06, K07, K08, K10, K11; annotate Glance, Explore, and Immerse behavior.
7. **Curiosity family:** C01–C11; use one coherent workspace and show the materially different prompt/work modes.
8. **Curiosity recovery family:** C12–C14.
9. **Thread and Jump family:** J01–J09.
10. **Concept family:** P01–P08.
11. **Atlas desktop family:** M01–M07.
12. **Atlas accessible/mobile family:** M08, M09.
13. **Library family:** L01–L11.
14. **Inquiry Book family:** I01–I06.
15. **Progress family:** D01–D08.
16. **Reward family:** D09–D12, only after the economy is approved.
17. **Sharing family:** S01–S05, only after sharing scope is approved.
18. **Account family:** T01–T05, T08, T09, T12.
19. **Child/guardian family:** T06, T07, only after legal and privacy requirements are defined.
20. **Commerce family:** T10, T11, only after the business model is approved.
21. **Identity family:** U01–U04 and G06.
22. **Universal states family:** G01, G05, E01–E09.

The first conceptual-UX milestone should complete families 1–12. Those families express the North Star’s core product. Families 13–22 complete memory, teaching support, operations, safety, and commercialization.

## 19. Mandatory prompt contract for every conceptual screen

Every screen-generation prompt must include:

1. The North Star document and this atlas.
2. Current screenshots of the equivalent route or nearest existing component at the same viewport.
3. The exact frame ID and its preceding and following frame IDs.
4. The screen’s entry condition, information shown, primary action, secondary actions, and exit state.
5. A list of existing elements to retain and current problems to solve.
6. Desktop dimensions; mobile dimensions when interaction changes.
7. Realistic content from one continuous example journey, not lorem ipsum.
8. The current visual language: warm cream paper, near-black green ink, editorial serif headlines, sans-serif controls, coral/sky/acid accents, tactile print-like composition, real sourced imagery, and restrained playful movement.
9. Explicit exclusions: dark AI dashboard, glassmorphism, neon science-fiction styling, generic children’s UI, chat transcript as the main interface, fake evidence, emoji icons, and unexplained scores.
10. A request for the generated concept to label what is retained, changed, removed, and new relative to the current screen.

## 20. Continuity rules across all concepts

- Use one continuous fictional user journey across concepts so notes, Concepts, images, Jumps, and revisits remain traceable.
- A Knowledge Session belongs to one Concept and one incoming Jump context.
- Every committed Jump creates a new Knowledge Session, including a Jump to an existing Concept.
- Opening Concept history alone never creates research or a new session.
- Old Knowledge and Curiosity Sessions remain immutable and viewable.
- The user selects a thread before Concept resolution is revealed.
- The system asks questions before expecting the user to formulate one.
- The encyclopedia remains useful even if the user skips or pauses curiosity work.
- The Curiosity Session always retains access to the evidence that triggered the thought.
- Progress is descriptive and inspectable; game currency is separate; neither becomes a curiosity score.
- Real images function as evidence and carry source metadata. Generated visuals may decorate but never impersonate evidence.
- Operational limits, provider spend, rewards, and learning reflection remain separate information systems.

## 21. Completeness checklist

The final conceptual set is incomplete unless a reviewer can see:

- A first-time user entering without asking a question.
- A returning user resuming and starting fresh.
- A user bringing personal starting material.
- A three-wonder deal and preview.
- Research loading, retry, insufficient evidence, and failure.
- Glance, Explore, and Immerse Knowledge Sessions.
- A six-to-twelve-image session with source and detail inspection.
- The full Curiosity Session from first observation through revision.
- Back-and-forth movement between evidence and scratch pad.
- Pause, fatigue, and no-thread recovery.
- Thought field, threads, selection, Concept resolution, and Jump confirmation.
- A Jump to a new Concept.
- A Jump to an existing Concept that produces a new context-aware session.
- Old Knowledge and Curiosity Sessions, session comparison, and branching from history.
- Concept overview, session history, personal atlas, neighborhood, path, node inspector, Frontier, mobile graph, and accessible outline.
- Library views for Concepts, Sessions, paths, saved items, notes, questions, and paused work.
- Inquiry Book, Lens detail, guided practice, and transfer check.
- Knowledge progress, narrative inquiry reflection, Lens coverage, and game progress as separate views.
- Authentication, guest migration, personalization controls, privacy, deletion, usage, quota, offline, conflict, safety, and not-found behavior.
- Conditional reward, guardian, sharing, and commerce views when those capabilities enter scope.

If any item above exists only as prose inside another screen and the user must make a distinct decision there, it needs its own frame.
