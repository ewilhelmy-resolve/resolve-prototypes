# Knowledge Base Card UI Update — Design & Behavior Brief

## Goals
- Simplify the card so the **whole card opens the doc**.
- **Align icons and labels clearly** in a single top row.
- **Remove redundant status** and the **View** button.

## Current vs. Proposed (at a glance)
- **Document icon:** move to **top-left**, inline with the title.  
- **Title:** stays on the top row, truncates if long.  
- **Delete icon:** **top-right** of the same row.  
- **“View” button:** **remove**. Clicking anywhere on the card opens the document.  
- **Status (“Ready”):** show **once** (pick either a subtle label on the second row or a small chip; not both).  

## Layout & Alignment
- **Top row (header):**  
  `[doc icon]  [Title …truncated] ........................................... [delete icon]`
  - Doc icon and title are **baseline-aligned**.
  - Delete icon is right-aligned on the same row.
- **Second row (meta):** optional single **status** (“Ready”). No duplicates.
- **Card padding:** consistent internal padding (e.g., 12–16 px all sides).
- **Truncation:** title is single-line with ellipsis; full title on hover tooltip.

## Interactions
- **Primary action:**  
  - **Click anywhere on the card** → open document in the existing “view” experience.
- **Secondary action (delete):**  
  - Clicking the **delete icon** opens a confirmation (prevent accidental deletion).  
  - Clicking delete **must not** trigger the card’s open action.
- **Hover:** card gains a subtle elevation/border change to indicate clickability.
- **Focus/keyboard:**  
  - Card is focusable; **Enter/Space** opens the document.  
  - Delete icon is separately focusable; **Enter/Space** triggers delete confirm.
- **Cursor:** pointer for the card area; default/appropriate cursor over the delete icon depending on platform standards.

## Accessibility
- **ARIA label** on the card: `Open <document title>`.
- **ARIA label** on delete: `Delete <document title>`.
- Maintain **visible focus** styles for both card and delete.
- Ensure **color contrast** for status and icons meets WCAG AA.

## Status Rules
- Show **one** status only. Recommended: a small, subdued label or chip on the second row (e.g., “Ready”).  
- No duplicate “READY/Ready”. Choose a single style (case, color, component) and use it consistently.
- If additional states exist (Draft/Processing/Error), the same single-status slot should display them.

## Error & Edge Cases
- **Long titles:** ellipsis + tooltip.  
- **Missing status:** hide the status row entirely (avoid empty space).  
- **Disabled/archived:** card remains non-clickable; show a distinct status (e.g., “Archived”) with reduced emphasis.

## Telemetry (if applicable)
- Track **Card Opened** (source = card) and **Delete Confirmed** events with document ID.

## Acceptance Criteria (testable)
1. **Card click opens view:** Clicking anywhere except the delete icon opens the document view.  
2. **Delete isolation:** Clicking the delete icon opens a confirmation and does **not** open the document.  
3. **Single status:** Only one “Ready” indicator appears on the card.  
4. **Alignment:** Doc icon and title are left-aligned on the same row; delete is right-aligned on that row.  
5. **No View button:** The “View” button is not rendered.  
6. **Keyboard support:** Tab focuses the card; Enter/Space opens it. Tab focuses delete; Enter/Space triggers delete confirm.  
7. **A11y labels:** Screen reader announces “Open <title>” for the card and “Delete <title>” for the delete icon.  
8. **Truncation:** Overlong titles truncate with ellipsis and show full title on hover/tooltips.
