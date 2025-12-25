const browser = globalThis.browser || globalThis.chrome;

const elements = {
  pageTitle: document.getElementById("pageTitle"),
  pageUrl: document.getElementById("pageUrl"),
  scheduledTime: document.getElementById("scheduledTime"),
  scheduleBtn: document.getElementById("scheduleBtn"),
  status: document.getElementById("status"),
  statusMessage: document.getElementById("statusMessage"),
  scheduledList: document.getElementById("scheduledList"),
  scheduleItems: document.getElementById("scheduleItems"),
};

let currentTab = null;

async function init() {
  // Get current tab info
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  elements.pageTitle.textContent = tab.title || "Untitled";
  elements.pageUrl.textContent = tab.url;

  // Set default time to 1 hour from now
  const defaultTime = new Date(Date.now() + 60 * 60 * 1000);
  elements.scheduledTime.value = formatDateTimeLocal(defaultTime);
  elements.scheduleBtn.disabled = false;

  // Check if daemon is running
  const daemonOk = await LaterAPI.checkHealth();
  if (!daemonOk) {
    showStatus("Daemon not running. Start it with: uv run python -m later.main", "error");
    elements.scheduleBtn.disabled = true;
    return;
  }

  // Load today's schedules
  await loadTodaySchedules();
}

function formatDateTimeLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getTodayDate() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

async function loadTodaySchedules() {
  try {
    const data = await LaterAPI.getSchedules(getTodayDate());

    if (data.schedules.length === 0) {
      elements.scheduledList.hidden = true;
      return;
    }

    elements.scheduleItems.innerHTML = data.schedules
      .map(
        (s) => `
        <li data-id="${s.id}" data-url="${encodeURIComponent(s.url)}" data-title="${encodeURIComponent(s.title || '')}" data-scheduled="${s.scheduled_at}">
          <span class="schedule-time">${formatTime(s.scheduled_at)}</span>
          <span class="schedule-title">${s.title || new URL(s.url).hostname}</span>
          <button class="edit-btn" title="Reschedule">✎</button>
          <button class="delete-btn" title="Delete">×</button>
        </li>
      `
      )
      .join("");

    // Add click handlers to open URLs
    elements.scheduleItems.querySelectorAll("li").forEach((li) => {
      li.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-btn") || e.target.classList.contains("edit-btn")) return;
        const url = decodeURIComponent(li.dataset.url);
        browser.tabs.create({ url });
      });
    });

    // Add edit handlers - switch to reschedule mode
    elements.scheduleItems.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const li = btn.closest("li");
        enterRescheduleMode(
          li.dataset.id,
          decodeURIComponent(li.dataset.url),
          decodeURIComponent(li.dataset.title) || decodeURIComponent(li.dataset.url),
          li.dataset.scheduled
        );
      });
    });

    // Add delete handlers
    elements.scheduleItems.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const li = btn.closest("li");
        const id = li.dataset.id;
        try {
          await LaterAPI.deleteSchedule(id);
          li.remove();
          const remaining = elements.scheduleItems.querySelectorAll("li").length;
          if (remaining === 0) {
            elements.scheduledList.hidden = true;
          }
        } catch (err) {
          console.error("Failed to delete:", err);
        }
      });
    });

    elements.scheduledList.hidden = false;
  } catch (err) {
    console.error("Failed to load schedules:", err);
  }
}

function showStatus(message, type) {
  elements.status.hidden = false;
  elements.status.className = `status ${type}`;
  elements.statusMessage.textContent = message;
}

function closeWithAnimation(delay = 3000) {
  setTimeout(() => {
    document.querySelector(".container").classList.add("fade-out");
    setTimeout(() => window.close(), 200);
  }, delay);
}

let rescheduleId = null;

function enterRescheduleMode(id, url, title, scheduledAt) {
  rescheduleId = id;

  // Update header to show reschedule target
  elements.pageTitle.textContent = title || "Link";
  elements.pageUrl.textContent = url;

  // Update datetime picker to current scheduled time
  if (scheduledAt) {
    elements.scheduledTime.value = formatDateTimeLocal(new Date(scheduledAt));
  }
  elements.scheduleBtn.disabled = false;

  // Add highlight animation to page info and datetime picker
  document.querySelector(".page-info").classList.add("highlight");
  elements.scheduledTime.classList.add("highlight");
  setTimeout(() => {
    document.querySelector(".page-info").classList.remove("highlight");
    elements.scheduledTime.classList.remove("highlight");
  }, 600);

  // Update current tab reference for presets
  currentTab = { url, title };
}

function exitRescheduleMode() {
  rescheduleId = null;
}

async function handleReschedule(preset) {
  if (!rescheduleId) return;

  const newTime = getPresetTime(preset);

  try {
    await LaterAPI.updateSchedule(rescheduleId, formatDateTimeLocal(newTime));

    // Update the list item
    const li = document.querySelector(`li[data-id="${rescheduleId}"]`);
    if (li) {
      li.querySelector(".schedule-time").textContent = formatTime(newTime.toISOString());
      li.classList.add("highlight");
      setTimeout(() => li.classList.remove("highlight"), 600);
    }

    showStatus("Rescheduled!", "success");

    // Reset to current tab
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    elements.pageTitle.textContent = tab.title || "Untitled";
    elements.pageUrl.textContent = tab.url;

    exitRescheduleMode();
  } catch (err) {
    showStatus(`Failed: ${err.message}`, "error");
  }
}

async function handleSchedule() {
  const scheduledAt = elements.scheduledTime.value;
  if (!scheduledAt) {
    showStatus("Please select a time", "error");
    return;
  }

  elements.scheduleBtn.disabled = true;
  elements.scheduleBtn.textContent = rescheduleId ? "Rescheduling..." : "Scheduling...";

  try {
    if (rescheduleId) {
      // Reschedule existing
      await LaterAPI.updateSchedule(rescheduleId, scheduledAt);

      // Update the list item
      const li = document.querySelector(`li[data-id="${rescheduleId}"]`);
      if (li) {
        li.querySelector(".schedule-time").textContent = formatTime(new Date(scheduledAt).toISOString());
        li.dataset.scheduled = scheduledAt;
        li.classList.add("highlight");
        setTimeout(() => li.classList.remove("highlight"), 600);
      }

      showStatus("Rescheduled!", "success");

      // Reset to current tab
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      currentTab = tab;
      elements.pageTitle.textContent = tab.title || "Untitled";
      elements.pageUrl.textContent = tab.url;
      elements.scheduledTime.value = formatDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000));

      exitRescheduleMode();
      elements.scheduleBtn.disabled = false;
      elements.scheduleBtn.textContent = "Schedule";
    } else {
      // Create new
      await LaterAPI.createSchedule(
        currentTab.url,
        scheduledAt,
        currentTab.title
      );

      showStatus("Scheduled!", "success");
      await loadTodaySchedules();
      closeWithAnimation(3000);
    }
  } catch (err) {
    showStatus(`Failed: ${err.message}`, "error");
    elements.scheduleBtn.disabled = false;
    elements.scheduleBtn.textContent = "Schedule";
  }
}

elements.scheduleBtn.addEventListener("click", handleSchedule);
elements.scheduledTime.addEventListener("change", () => {
  elements.scheduleBtn.disabled = false;
});

// Firefox: clicking the input doesn't always open the picker, so try to force it
elements.scheduledTime.addEventListener("click", () => {
  try {
    elements.scheduledTime.showPicker();
  } catch (e) {
    // showPicker() not supported or blocked, ignore
  }
});

// Preset buttons - schedule immediately
function getPresetTime(preset) {
  const now = new Date();

  switch (preset) {
    case "1hr":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "tonight":
      const tonight = new Date(now);
      tonight.setHours(21, 0, 0, 0); // 9 PM
      // If it's already past 9pm, set for tomorrow
      if (tonight <= now) {
        tonight.setDate(tonight.getDate() + 1);
      }
      return tonight;
    case "tomorrow":
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
      return tomorrow;
    default:
      return new Date(now.getTime() + 60 * 60 * 1000);
  }
}

async function handlePreset(preset) {
  const scheduledAt = getPresetTime(preset);

  try {
    await LaterAPI.createSchedule(
      currentTab.url,
      formatDateTimeLocal(scheduledAt),
      currentTab.title
    );

    showStatus("Scheduled!", "success");
    await loadTodaySchedules();
    closeWithAnimation(3000);
  } catch (err) {
    showStatus(`Failed: ${err.message}`, "error");
  }
}

document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (rescheduleId) {
      handleReschedule(btn.dataset.preset);
    } else {
      handlePreset(btn.dataset.preset);
    }
  });
});

init();
