export function shouldPollOpsBoard(dateRange = "today") {
  return dateRange === "today";
}

export function buildQrImageUrl(url = "") {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
}

function isSameLocalDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

export function buildPatientTodayTasks({
  visit = {},
  formsStatus = {},
  now = new Date().toISOString(),
} = {}) {
  const tasks = [];
  const nowDate = new Date(now);
  const visitDate = visit?.visit_date ? new Date(visit.visit_date) : null;
  const isTodayVisit = visitDate ? isSameLocalDate(visitDate, nowDate) : false;

  if (isTodayVisit && !visit?.patient_arrived_at) {
    tasks.push({
      key: "arrival",
      tone: "action",
    });
  }

  if (formsStatus?.hasIntake && !visit?.intake_done) {
    tasks.push({
      key: "intake_form",
      tone: "action",
    });
  }

  if (formsStatus?.hasConsent && !visit?.consent_done) {
    tasks.push({
      key: "consent_form",
      tone: "action",
    });
  }

  if (tasks.length === 0) {
    tasks.push({
      key: "ready",
      tone: "calm",
    });
  }

  return tasks;
}
