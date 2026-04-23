export function shouldPollOpsBoard(dateRange = "today") {
  return dateRange === "today";
}

export function buildQrImageUrl(url = "") {
  return `/api/qr?data=${encodeURIComponent(url)}`;
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
  aftercareState = null,
  clinicRuleConfig = null,
  now = new Date().toISOString(),
} = {}) {
  const tasks = [];
  const nowDate = new Date(now);
  const visitDate = visit?.visit_date ? new Date(visit.visit_date) : null;
  const isTodayVisit = visitDate ? isSameLocalDate(visitDate, nowDate) : false;
  const taskConfig = clinicRuleConfig?.patient_portal?.tasks || {};
  const showAftercareDue = taskConfig.show_aftercare_due !== false;
  const showAftercareAck = taskConfig.show_aftercare_ack !== false;
  const showSafeReturn = taskConfig.show_safe_return !== false;

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

  if (showAftercareDue && (aftercareState?.due_items || []).length > 0) {
    tasks.push({
      key: "aftercare_due",
      tone: "action",
    });
  }

  if (showAftercareAck && aftercareState?.acknowledgement) {
    tasks.push({
      key: "aftercare_ack",
      tone: "watch",
    });
  }

  if (
    showSafeReturn &&
    tasks.length === 0 &&
    aftercareState?.safe_for_return
  ) {
    tasks.push({
      key: "aftercare_return",
      tone: "calm",
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
