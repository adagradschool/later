const browser = globalThis.browser || globalThis.chrome;
const API_BASE = "http://127.0.0.1:7432/api/v1";

// Create context menu on install
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: "schedule-later",
    title: "Schedule for Later (1hr)",
    contexts: ["link"],
  });
});

function formatDateTimeLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "schedule-later") return;

  const url = info.linkUrl;
  const title = info.selectionText || url;
  const scheduledAt = formatDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000));

  try {
    const response = await fetch(`${API_BASE}/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, scheduled_at: scheduledAt, title }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // Show success
    browser.action.setBadgeText({ text: "✓", tabId: tab.id });
    browser.action.setBadgeBackgroundColor({ color: "#2d6a4f", tabId: tab.id });
    setTimeout(() => browser.action.setBadgeText({ text: "", tabId: tab.id }), 2000);
  } catch (err) {
    console.error("Failed to schedule:", err);
    browser.action.setBadgeText({ text: "!", tabId: tab.id });
    browser.action.setBadgeBackgroundColor({ color: "#c53030", tabId: tab.id });
    setTimeout(() => browser.action.setBadgeText({ text: "", tabId: tab.id }), 2000);
  }
});
