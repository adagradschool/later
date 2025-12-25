const API_BASE = "http://127.0.0.1:7432/api/v1";

const LaterAPI = {
  async createSchedule(url, scheduledAt, title) {
    const response = await fetch(`${API_BASE}/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        scheduled_at: scheduledAt,
        title,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create schedule: ${response.status}`);
    }

    return response.json();
  },

  async getSchedules(date = null) {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    params.set("status", "pending");

    const response = await fetch(`${API_BASE}/schedules?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to get schedules: ${response.status}`);
    }

    return response.json();
  },

  async updateSchedule(id, scheduledAt) {
    const response = await fetch(`${API_BASE}/schedules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_at: scheduledAt }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update schedule: ${response.status}`);
    }

    return response.json();
  },

  async deleteSchedule(id) {
    const response = await fetch(`${API_BASE}/schedules/${id}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete schedule: ${response.status}`);
    }

    return true;
  },

  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE}/health`);
      return response.ok;
    } catch {
      return false;
    }
  },
};
