# Later

A browser extension + background daemon for scheduling URLs to open at specific times.

## Problem

- You find an interesting article but don't have time to read it now
- You want to auto-join meetings without manually clicking calendar links
- You forget to watch scheduled livestreams or videos
- Context switching to set reminders breaks your flow

## Solution

**Later** lets you schedule any webpage to open at a specific time, directly from your browser. A lightweight daemon handles the scheduling and opens URLs when the time comes.

## Architecture

```
┌─────────────────────────┐       HTTP (localhost:7432)       ┌────────────────────────┐
│   Browser Extension     │  ────────────────────────────────▶│   Background Daemon    │
│                         │                                   │                        │
│  - Schedule current tab │                                   │  - REST API server     │
│  - Datetime picker      │  ◀────────────────────────────────│  - SQLite storage      │
│  - View/manage queue    │                                   │  - Scheduler thread    │
│  - Badge with count     │                                   │  - Opens URLs via OS   │
└─────────────────────────┘                                   └────────────────────────┘
```

## UX Design

### Principles
- **Start times only**: No duration tracking. Pick when to open, that's it.
- **One decision**: Minimize cognitive load - just pick a time
- **Visual timeline**: See existing scheduled items as markers
- **Multiple OK**: Several URLs at the same time? They all open. No conflicts.

### Keyboard Shortcut
`Alt+Shift+L` (or `Option+L` on Mac) opens the popup for the current tab.

### Popup Interface

```
┌─────────────────────────────────────────┐
│  "How to Build a Compiler" - youtube    │
├─────────────────────────────────────────┤
│  ◀  Thu 26  ▶      [Today] [Tomorrow]   │
├─────────────────────────────────────────┤
│  9am  ·······                           │
│ 10am  ·······  ● Team standup           │
│ 11am  ·······                           │
│ 12pm  ·······                           │  ← click to select
│  1pm  ·······                           │
│  2pm  ·······  ● Article: React 19      │
│  3pm  ·······                           │
│  ...                                    │
├─────────────────────────────────────────┤
│  ⏱️  [In 1hr] [Tonight] [Tomorrow AM]   │  ← quick presets
│                                         │
│  [ Schedule for 12:00 PM ]              │
└─────────────────────────────────────────┘
```

### Interaction Flow
1. User presses `Option+L` (or `Alt+Shift+L`) or clicks extension icon
2. Popup shows current tab's title and URL
3. Day timeline displays with existing scheduled items as markers (●)
4. User either:
   - Clicks a time slot on the timeline, or
   - Clicks a quick preset button
5. "Schedule" button activates with selected time
6. Click Schedule → done, popup closes
7. Badge updates with today's count

### Quick Presets
- **In 1hr**: Current time + 1 hour
- **Tonight**: 8:00 PM today (or tomorrow if past 8pm)
- **Tomorrow AM**: 9:00 AM tomorrow

### Context Menu
Right-click any link → "Schedule with Later" → same popup flow

## Core Features

### Browser Extension
- **Quick schedule**: `Option+L` or click icon, pick time, done
- **Visual timeline**: Day view showing scheduled items as markers
- **Quick presets**: One-click scheduling for common times
- **Context menu**: Right-click any link to schedule it
- **Badge**: Shows count of items scheduled for today
- **Day navigation**: Browse and schedule for any day

### Background Daemon
- **REST API**: Add, list, update, delete scheduled items
- **Persistent storage**: SQLite database survives restarts
- **Reliable scheduling**: Opens URLs at the exact scheduled time
- **Auto-start**: Runs on system boot via launchd (macOS)

## API Contract

### Base URL
`http://localhost:7432/api/v1`

### Endpoints

#### `POST /schedules`
Create a new scheduled URL.

```json
Request:
{
  "url": "https://meet.google.com/abc-xyz",
  "scheduled_at": "2025-12-26T14:00:00",
  "title": "Team Standup"
}

Response: 201 Created
{
  "id": "uuid",
  "url": "https://meet.google.com/abc-xyz",
  "scheduled_at": "2025-12-26T14:00:00",
  "title": "Team Standup",
  "status": "pending",
  "created_at": "2025-12-25T10:30:00"
}
```

#### `GET /schedules`
List all scheduled URLs.

```json
Query params:
  - status: pending | opened | cancelled
  - date: YYYY-MM-DD (filter by day)

Response: 200 OK
{
  "schedules": [...],
  "total": 42
}
```

#### `GET /schedules/:id`
Get a specific scheduled item.

#### `PATCH /schedules/:id`
Update a scheduled item.

```json
Request:
{
  "scheduled_at": "2025-12-26T15:00:00"
}
```

#### `DELETE /schedules/:id`
Delete a scheduled item.

#### `GET /health`
Health check endpoint.

```json
Response: 200 OK
{
  "status": "ok",
  "version": "0.1.0",
  "uptime_seconds": 3600,
  "pending_count": 5
}
```

## Data Model

### Schedule

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| url | TEXT | URL to open |
| title | TEXT | User-provided or auto-fetched page title |
| scheduled_at | DATETIME | When to open the URL |
| status | TEXT | pending, opened, cancelled |
| created_at | DATETIME | When the schedule was created |
| opened_at | DATETIME | When the URL was actually opened |

## Technical Stack

### Daemon (Python)
- **FastAPI**: REST API server
- **SQLite**: Storage via `aiosqlite`
- **APScheduler**: Job scheduling
- **orjson**: Fast JSON serialization
- **uvicorn**: ASGI server

### Browser Extension
- **Manifest V3**: Chrome and Firefox compatible
- **Dual-browser build**: Shared source, separate manifests
- **Vanilla JS**: Keep it simple, no framework needed
- **Popup**: HTML/CSS for the scheduling UI

### Browser Compatibility
| Browser | Engine | Status |
|---------|--------|--------|
| Chrome | Chromium | Supported |
| Arc | Chromium | Supported |
| Firefox | Gecko | Supported |
| Zen | Gecko | Supported |
| Edge | Chromium | Supported |

**Namespace shim** (works in both):
```js
const browser = globalThis.browser || globalThis.chrome;
```

### System Integration (macOS)
- **launchd**: Auto-start daemon on boot
- **`open` command**: Open URLs in default browser
- **Notification Center**: Optional pre-open notifications

## Directory Structure

```
later/
├── daemon/
│   ├── later/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI app, entry point
│   │   ├── api.py           # Route handlers
│   │   ├── models.py        # Pydantic models
│   │   ├── db.py            # SQLite operations
│   │   ├── scheduler.py     # APScheduler setup
│   │   └── opener.py        # URL opening logic
│   ├── pyproject.toml
│   └── README.md
├── extension/
│   ├── src/                 # Shared source (both browsers)
│   │   ├── popup/
│   │   │   ├── popup.html
│   │   │   ├── popup.css
│   │   │   └── popup.js
│   │   ├── background.js
│   │   ├── lib/
│   │   │   └── api.js       # Daemon communication
│   │   └── icons/
│   ├── manifests/
│   │   ├── chrome.json      # Chrome/Arc/Edge manifest
│   │   └── firefox.json     # Firefox/Zen manifest
│   ├── dist/                # Built extensions
│   │   ├── chrome/
│   │   └── firefox/
│   ├── build.sh             # Build script
│   └── README.md
├── launchd/
│   └── com.later.daemon.plist
├── SPEC.md
└── README.md
```

## Future Ideas

- **Duration/time blocking**: Add optional duration for calendar-like blocking
- **Google Calendar sync**: Auto-import meetings with video links
- **Auto-infer duration**: Detect YouTube video length, meeting duration, etc.
- **Recurring schedules**: Daily standups, weekly reading time
- **Smart scheduling**: "Read this when I'm free" using calendar data
- **Safari extension**: Native macOS experience
- **Menu bar app**: Quick access without opening browser
- **Focus mode integration**: Respect macOS Focus/DND settings
- **Reading queue**: Batch open articles in sequence with breaks
- **Analytics**: Track what you scheduled vs. actually engaged with
- **Tags**: Categorize scheduled items (meeting, article, video, etc.)
