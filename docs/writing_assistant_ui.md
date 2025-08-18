# Writing Assistant UI Design (Google Sheets-like)

Overview

- Goal: add an "Assist" button on each entry which opens a persistent right-side panel (similar to Google Sheets side pane).
- Focus: content expansion / suggestion for improving brief thoughts into detailed entries.

UX Principles

- Non-intrusive: assistance must be optional and clearly user-initiated.
- Explicit control: users choose Insert / Save as new / Dismiss actions.
- Familiar layout: side-panel behavior should feel like Google Sheets add-on panels.

High-level components

- [`client/src/components/journal/EntryList.tsx`](client/src/components/journal/EntryList.tsx:1): entry rows show existing buttons and the new Assist button
- [`client/src/components/journal/ExpandSuggestionPanel.tsx`](client/src/components/journal/ExpandSuggestionPanel.tsx:1): side panel component that holds suggestions and actions
- [`client/src/components/journal/AssistButton.tsx`](client/src/components/journal/AssistButton.tsx:1): small reusable assist button component

Visual layout

- Entries list occupies central area.
- Right-side sliding panel (width 340–420px) overlays content with slight shadow; full-screen on mobile.
- Panel header: entry title/snippet, created date, Close button, and quick actions (Insert / Save as new / Pin).
- Panel body: Context (original snippet), Suggestions (editable), Actions, and small history of prior suggestions.

Interaction flow

1. User clicks Assist on an entry row.
2. Panel opens and shows "Generating suggestion..." loading state.
3. Suggested expanded content appears (editable); optionally show 2–3 variants or previous suggestions.
4. Actions:
   - Insert: append or replace entry content (UI prompts mode choice if ambiguous).
   - Save as new entry: create a new entry containing the suggestion.
   - Copy: copy suggestion text to clipboard.
   - Close: keep suggestion draft in local session (so reopening restores it).
5. Panel persists drafts locally per-entry until user discards.

States

- closed
- loading (show skeleton + spinner)
- ready (suggestion displayed)
- error (retry CTA)
- saving (show progress when writing back to server)

Accessibility & keyboard

- Keyboard shortcut to open assist for focused entry (e.g., Ctrl/Cmd+Shift+A).
- All buttons should have aria-labels; panel should be dismissible by Esc.
- Do not trap focus permanently — allow screen reader users to navigate.

Data flow & APIs

- Client-side call: POST /chat/expand
  - Body: { entry_id?: number, text_content: string, mode?: 'expand' }
  - Response: { suggestion: string, variants?: string[], model?: string }
- Streaming: prefer streaming responses to show progressive content (if available).
- Fallback: return a single suggestion string if streaming not available.

UI behavior details

- Panel sections:
  - Header: snippet, date, model badge, close
  - Context: original entry text (read-only)
  - Suggestions: main editable region (rich text)
  - Controls: Insert, Save as new, Copy, Retry
  - Footer: small provenance (model name) and "Feedback" link
- Show suggestion history for the entry as chips (last 3), with ability to re-apply past suggestions.

Minimal client-only mock for UX validation

- Implement ExpandSuggestionPanel to call a local mock function that returns placeholder expanded content after ~600–900ms to simulate latency.
- This allows rapid UX iteration without server changes.

Component props and contract

- EntryList passes entry object to AssistButton and an onOpen callback.
- AssistButton props: { entryId: number, entryText: string, onOpen: (entryId) => void }
- ExpandSuggestionPanel props: {
  entryId: number,
  entryText: string,
  onInsert: (suggestion: string, options?: { mode: 'append' | 'replace' }) => Promise<void>,
  onSaveAsNew: (suggestion: string) => Promise<void>,
  onClose: () => void
  }

Acceptance criteria

- Assist button visible on every entry row and keyboard accessible.
- Clicking Assist opens panel within 300ms (loading state acceptable).
- Insert updates the entry in the UI and persists via existing save flows.
- Save as new creates a new entry and it appears in the list.

Visual design tokens & CSS

- Panel width: 380px on desktop; full width on mobile.
- Use existing theme tokens from [`client/src/lib/theme.tsx`](client/src/lib/theme.tsx:1).
- Suggestion editor should reuse the project's rich-text editor component (Yoopta editor) used in entries for consistent behavior.

Error handling & fallback

- On API failure: show helpful error message and a Retry button.
- Provide Copy to clipboard as a fallback when persistence fails.
- Offer "Use previous suggestion" if available locally.

Local draft persistence

- Persist drafts in localStorage keyed by `ya:suggestion:{entryId}` so the panel can restore when reopened.

Testing scenarios

- Unit: AssistButton click toggles panel state.
- Integration: Accepting suggestion triggers save API and entry updates in list.
- E2E: Open panel, generate suggestion, Save as new, verify new entry present.

Developer implementation plan (phases)

- Phase 1 (UI-only mock, 1–2 days)
  - Add AssistButton to [`client/src/components/journal/EntryList.tsx`](client/src/components/journal/EntryList.tsx:1)
  - Create [`client/src/components/journal/ExpandSuggestionPanel.tsx`](client/src/components/journal/ExpandSuggestionPanel.tsx:1) rendering mock suggestion
  - Wire open/close state in parent component (e.g., [`client/src/components/journal/EnhancedJournal.tsx`](client/src/components/journal/EnhancedJournal.tsx:1) or similar)
- Phase 2 (Server integration, 1–2 days)
  - Add endpoint POST /chat/expand in [`server/src/routes/ai.ts`](server/src/routes/ai.ts:100) or a new route
  - Replace mock with real API call; add streaming support
- Phase 3 (Polish & metrics, 1–2 days)
  - Add telemetry for suggestions shown/accepted
  - Prompt tuning and UX copy improvements

Prompt template suggestion

- "Expand the following journal note into a detailed entry with context and bullets. Preserve names, dates, and any decisions: {text}"

Example UI flows

- Quick expand: click Assist -> Insert -> entry updated
- Detailed edit: click Assist -> edit suggestion -> Save as new -> new entry created

Acceptance testcases (explicit)

- Given entry "Met Sarah re: project", when clicking Assist, panel shows expanded text referencing "Sarah" and "project"; after Insert, entry contains expanded text persisted on server.

Accessibility checklist

- Contrast ratios ok, aria-labels present, Esc dismisses panel, focus returned to entry after close.

Notes & integration points

- Reuse existing entry save/update in [`client/src/components/journal/EntryForm.tsx`](client/src/components/journal/EntryForm.tsx:1) to persist Insert operations.

Next steps I can take (pick one)

- Implement Phase 1 UI-only changes (I will switch to code mode) — adds AssistButton and ExpandSuggestionPanel with client mock.
- Produce PR checklist and code plan for Phase 1 (stay in architect mode).
- Implement Phase 1 + 2 (I will switch to code mode).

End of design doc.
