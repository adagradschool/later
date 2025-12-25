# Later - Implementation Plan

Vertical slices, each delivering working end-to-end functionality.

---

## Slice 1: Proof of Concept

**Goal**: Schedule a URL from the browser, have it open at the scheduled time.

### Daemon
- [ ] Project setup: `pyproject.toml` with FastAPI, uvicorn, orjson, aiosqlite
- [ ] SQLite database with single `schedules` table
- [ ] `POST /schedules` - create a schedule
- [ ] `GET /health` - verify daemon is running
- [ ] Background thread that checks every 30s and opens due URLs via `open` command
- [ ] Run with `uvicorn later.main:app --port 7432`

### Extension
- [ ] Basic manifest (Chrome first)
- [ ] Popup with current tab title/URL displayed
- [ ] Simple time input (native `<input type="datetime-local">`)
- [ ] "Schedule" button that POSTs to daemon
- [ ] Success/error feedback

### Milestone
Can schedule a URL to open in 2 minutes and watch it happen.

---

## Slice 2: View Scheduled Items

**Goal**: See what's already scheduled.

### Daemon
- [ ] `GET /schedules` - list all pending schedules
- [ ] Filter by date query param

### Extension
- [ ] Show list of today's scheduled items below the time picker
- [ ] Each item shows time + title

### Milestone
Schedule multiple items, see them in the popup.

---

## Slice 3: Visual Timeline

**Goal**: Replace time input with clickable timeline.

### Extension
- [ ] Day timeline component (9am - 11pm, hourly slots)
- [ ] Existing scheduled items shown as markers (●)
- [ ] Click time slot to select it
- [ ] Day navigation (prev/next day, Today button)
- [ ] Selected time shown in Schedule button

### Milestone
Visual, intuitive scheduling by clicking on timeline.

---

## Slice 4: Quick Presets

**Goal**: One-click scheduling for common times.

### Extension
- [ ] "In 1hr" button
- [ ] "Tonight" button (8pm today, or tomorrow if past 8pm)
- [ ] "Tomorrow AM" button (9am tomorrow)
- [ ] Clicking preset immediately schedules (no extra click needed)

### Milestone
Schedule something for tonight in one click.

---

## Slice 5: Delete & Reschedule

**Goal**: Manage existing schedules.

### Daemon
- [ ] `DELETE /schedules/:id` - cancel a schedule
- [ ] `PATCH /schedules/:id` - update scheduled time

### Extension
- [ ] Click scheduled item to select it
- [ ] Delete button (X) on selected item
- [ ] Drag item to new time slot (stretch goal)

### Milestone
Remove something you scheduled by mistake.

---

## Slice 6: Keyboard Shortcut

**Goal**: `Option+L` (Mac) / `Alt+Shift+L` (Windows/Linux) opens popup.

### Extension
- [ ] Add `commands` to manifest with shortcut
- [ ] Ensure popup opens on shortcut

### Milestone
Press `Option+L`, schedule page, never touch mouse.

---

## Slice 7: Context Menu

**Goal**: Schedule any link, not just current tab.

### Extension
- [ ] Register context menu item "Schedule with Later"
- [ ] Right-click link → opens popup pre-filled with that URL
- [ ] Handle case where it's not the current tab's URL

### Milestone
Right-click a link in an article, schedule it for later.

---

## Slice 8: Badge & Polish

**Goal**: Visual polish and status info.

### Extension
- [ ] Badge shows count of items scheduled for today
- [ ] Update badge on schedule/delete
- [ ] Poll daemon periodically to sync badge
- [ ] Better styling (colors, spacing, icons)
- [ ] Loading states
- [ ] Error handling (daemon not running)

### Milestone
Glance at extension icon, see you have 3 things scheduled today.

---

## Slice 9: Firefox Support

**Goal**: Extension works in Firefox/Zen.

### Extension
- [ ] Create `firefox.json` manifest
- [ ] `build.sh` script to generate dist/chrome and dist/firefox
- [ ] Test in Firefox/Zen
- [ ] Fix any API differences

### Milestone
Same extension works in both Arc and Zen.

---

## Slice 10: System Integration

**Goal**: Daemon runs automatically on boot.

### Daemon
- [ ] `launchd/com.later.daemon.plist`
- [ ] Install script to copy plist to `~/Library/LaunchAgents`
- [ ] Daemon logs to file for debugging
- [ ] Graceful shutdown handling

### Milestone
Restart computer, daemon is already running.

---

## Out of Scope (Future)

- Duration/time blocking
- Google Calendar sync
- Recurring schedules
- Notifications before opening
- Menu bar app
- Auto-infer duration from content

---

## Suggested Order

```
Slice 1 (PoC)
    ↓
Slice 2 (View)
    ↓
Slice 6 (Keyboard) ← do early, improves dev experience
    ↓
Slice 3 (Timeline)
    ↓
Slice 4 (Presets)
    ↓
Slice 5 (Delete)
    ↓
Slice 8 (Badge)
    ↓
Slice 7 (Context Menu)
    ↓
Slice 9 (Firefox)
    ↓
Slice 10 (launchd)
```

Start with Slice 1. Get it working. Ship it to yourself. Use it. Then iterate.
