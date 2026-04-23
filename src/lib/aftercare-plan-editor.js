const ALLOWED_STEP_PATCH_KEYS = new Set([
  "trigger_offset_hours",
  "content_template",
  "next_action_type",
]);

const ALLOWED_NEXT_ACTION_TYPES = new Set([
  "symptom_check",
  "progress_check",
  "return_prompt",
  "extra_check",
  "staff_review",
  "continue_plan",
]);

function fail(message, path) {
  const err = new Error(message);
  err.statusCode = 400;
  err.path = path;
  return err;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateAftercareStepPatch(rawPatch = {}) {
  if (!isPlainObject(rawPatch)) {
    throw fail("Aftercare step patch must be an object", "root");
  }

  const keys = Object.keys(rawPatch);
  if (!keys.length) {
    throw fail("Aftercare step patch cannot be empty", "root");
  }

  for (const key of keys) {
    if (!ALLOWED_STEP_PATCH_KEYS.has(key)) {
      throw fail(`Unknown aftercare step key: ${key}`, key);
    }
  }

  const patch = {};
  const changedPaths = [];

  if ("trigger_offset_hours" in rawPatch) {
    const value = Number(rawPatch.trigger_offset_hours);
    if (!Number.isInteger(value) || value < 1 || value > 24 * 30) {
      throw fail("trigger_offset_hours must be an integer between 1 and 720", "trigger_offset_hours");
    }
    patch.trigger_offset_hours = value;
    changedPaths.push("trigger_offset_hours");
  }

  if ("content_template" in rawPatch) {
    if (typeof rawPatch.content_template !== "string") {
      throw fail("content_template must be a string", "content_template");
    }
    const value = rawPatch.content_template.trim();
    if (!value) {
      throw fail("content_template cannot be empty", "content_template");
    }
    if (value.length > 500) {
      throw fail("content_template exceeds max length 500", "content_template");
    }
    patch.content_template = value;
    changedPaths.push("content_template");
  }

  if ("next_action_type" in rawPatch) {
    if (typeof rawPatch.next_action_type !== "string" || !ALLOWED_NEXT_ACTION_TYPES.has(rawPatch.next_action_type)) {
      throw fail(`Invalid next_action_type: ${rawPatch.next_action_type}`, "next_action_type");
    }
    patch.next_action_type = rawPatch.next_action_type;
    changedPaths.push("next_action_type");
  }

  return {
    patch,
    changedPaths,
  };
}

export function buildAftercareStepPreview(step = {}) {
  const hours = Number(step.trigger_offset_hours || 0);
  const timingLabel = hours > 0
    ? `${hours}h after aftercare starts`
    : "Timing not set";

  return {
    step_key: step.step_key || null,
    timing_label: timingLabel,
    patient_message: String(step.content_template || "").trim(),
    next_action_type: step.next_action_type || null,
  };
}

export function detectAftercareStepSafetyFlags({ before = {}, patch = {} } = {}) {
  const changedFields = [];
  for (const field of ["content_template", "next_action_type", "trigger_offset_hours"]) {
    if (patch[field] !== undefined && String(patch[field]) !== String(before[field] ?? "")) {
      changedFields.push(field);
    }
  }

  return {
    requires_timing_confirmation: changedFields.includes("trigger_offset_hours"),
    changed_fields: changedFields.sort(),
  };
}

export function normalizeAftercarePlanRows(procedures = [], plans = [], steps = []) {
  const stepMap = new Map();
  for (const step of steps || []) {
    if (!stepMap.has(step.plan_id)) stepMap.set(step.plan_id, []);
    stepMap.get(step.plan_id).push(step);
  }

  const plansWithSteps = (plans || []).map((plan) => ({
    ...plan,
    procedure_name: plan.procedures?.name_ko || plan.procedures?.name_en || "시술 미지정",
    steps: (stepMap.get(plan.id) || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  }));

  return {
    procedures: (procedures || []).map((procedure) => ({
      id: procedure.id,
      name_ko: procedure.name_ko,
      name_en: procedure.name_en,
      is_active: procedure.is_active,
    })),
    plans: plansWithSteps,
  };
}
