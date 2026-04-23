const ALLOWED_STAGE_KEYS = new Set([
  "booked",
  "arrived",
  "pre_visit",
  "post_care",
]);

const ALLOWED_LANG_KEYS = new Set(["ko", "en", "ja", "zh"]);
const ALLOWED_ESCALATION_LABEL_KEYS = new Set(["coordinator", "nurse", "doctor_confirmation"]);
const ALLOWED_ROOM_READY_KEYS = new Set([
  "require_checked_in",
  "require_intake_done",
  "require_consent_done",
  "allowed_stages",
]);
const ALLOWED_ROOM_READY_STAGES = new Set([
  "booked",
  "pre_visit",
  "treatment",
  "post_care",
  "followup",
  "closed",
]);
const ALLOWED_PATIENT_TASK_KEYS = new Set([
  "show_aftercare_due",
  "show_aftercare_ack",
  "show_safe_return",
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(message, path) {
  const err = new Error(message);
  err.statusCode = 400;
  err.path = path;
  return err;
}

function ensurePlainObject(value, path) {
  if (!isPlainObject(value)) throw fail(`${path} must be an object`, path);
}

function ensureNoUnknownKeys(value, allowedKeys, path) {
  for (const key of Object.keys(value || {})) {
    if (!allowedKeys.has(key)) {
      throw fail(`Unknown config key: ${path}.${key}`, `${path}.${key}`);
    }
  }
}

function ensureString(value, path, maxLen) {
  if (typeof value !== "string") throw fail(`${path} must be a string`, path);
  const normalized = value.trim();
  if (!normalized) throw fail(`${path} cannot be empty`, path);
  if (normalized.length > maxLen) throw fail(`${path} exceeds max length ${maxLen}`, path);
  return normalized;
}

function validateQuickPrompts(value, changedPaths) {
  ensurePlainObject(value, "ask.quick_prompts");
  ensureNoUnknownKeys(value, ALLOWED_STAGE_KEYS, "ask.quick_prompts");

  const normalized = {};
  for (const stage of Object.keys(value)) {
    const prompts = value[stage];
    if (!Array.isArray(prompts)) {
      throw fail(`ask.quick_prompts.${stage} must be an array`, `ask.quick_prompts.${stage}`);
    }
    if (prompts.length > 6) {
      throw fail(`ask.quick_prompts.${stage} may contain at most 6 items`, `ask.quick_prompts.${stage}`);
    }
    normalized[stage] = prompts.map((item, index) => {
      ensurePlainObject(item, `ask.quick_prompts.${stage}[${index}]`);
      ensureNoUnknownKeys(item, new Set(["id", "text"]), `ask.quick_prompts.${stage}[${index}]`);
      changedPaths.add(`ask.quick_prompts.${stage}`);
      return {
        id: ensureString(item.id, `ask.quick_prompts.${stage}[${index}].id`, 64),
        text: ensureString(item.text, `ask.quick_prompts.${stage}[${index}].text`, 120),
      };
    });
  }
  return normalized;
}

function validateFallbackCopy(value, changedPaths) {
  ensurePlainObject(value, "ask.fallback_copy");
  ensureNoUnknownKeys(value, ALLOWED_LANG_KEYS, "ask.fallback_copy");

  const normalized = {};
  for (const lang of Object.keys(value)) {
    ensurePlainObject(value[lang], `ask.fallback_copy.${lang}`);
    ensureNoUnknownKeys(value[lang], new Set(["fallback"]), `ask.fallback_copy.${lang}`);
    normalized[lang] = {
      fallback: ensureString(value[lang].fallback, `ask.fallback_copy.${lang}.fallback`, 300),
    };
    changedPaths.add(`ask.fallback_copy.${lang}.fallback`);
  }
  return normalized;
}

function validateEscalationLabels(value, changedPaths) {
  ensurePlainObject(value, "ask.escalation_labels");
  ensureNoUnknownKeys(value, ALLOWED_ESCALATION_LABEL_KEYS, "ask.escalation_labels");

  const normalized = {};
  for (const key of Object.keys(value)) {
    ensurePlainObject(value[key], `ask.escalation_labels.${key}`);
    ensureNoUnknownKeys(value[key], ALLOWED_LANG_KEYS, `ask.escalation_labels.${key}`);
    normalized[key] = {};
    for (const lang of Object.keys(value[key])) {
      normalized[key][lang] = ensureString(value[key][lang], `ask.escalation_labels.${key}.${lang}`, 40);
      changedPaths.add(`ask.escalation_labels.${key}.${lang}`);
    }
  }
  return normalized;
}

function validateRoomReady(value, changedPaths) {
  ensurePlainObject(value, "rooms.room_ready");
  ensureNoUnknownKeys(value, ALLOWED_ROOM_READY_KEYS, "rooms.room_ready");

  const normalized = {};
  for (const key of Object.keys(value)) {
    if (key === "allowed_stages") {
      if (!Array.isArray(value.allowed_stages)) {
        throw fail("rooms.room_ready.allowed_stages must be an array", "rooms.room_ready.allowed_stages");
      }
      const deduped = [];
      for (const stage of value.allowed_stages) {
        if (typeof stage !== "string" || !ALLOWED_ROOM_READY_STAGES.has(stage)) {
          throw fail(`Invalid room-ready stage: ${stage}`, "rooms.room_ready.allowed_stages");
        }
        if (!deduped.includes(stage)) deduped.push(stage);
      }
      if (!deduped.length) {
        throw fail("rooms.room_ready.allowed_stages must contain at least one stage", "rooms.room_ready.allowed_stages");
      }
      normalized.allowed_stages = deduped;
      changedPaths.add("rooms.room_ready.allowed_stages");
      continue;
    }

    if (typeof value[key] !== "boolean") {
      throw fail(`rooms.room_ready.${key} must be a boolean`, `rooms.room_ready.${key}`);
    }
    normalized[key] = value[key];
    changedPaths.add(`rooms.room_ready.${key}`);
  }
  return normalized;
}

function validatePatientPortalTasks(value, changedPaths) {
  ensurePlainObject(value, "patient_portal.tasks");
  ensureNoUnknownKeys(value, ALLOWED_PATIENT_TASK_KEYS, "patient_portal.tasks");

  const normalized = {};
  for (const key of Object.keys(value)) {
    if (typeof value[key] !== "boolean") {
      throw fail(`patient_portal.tasks.${key} must be a boolean`, `patient_portal.tasks.${key}`);
    }
    normalized[key] = value[key];
    changedPaths.add(`patient_portal.tasks.${key}`);
  }
  return normalized;
}

export function validateClinicRulePatch(rawPatch) {
  if (!isPlainObject(rawPatch)) {
    throw fail("Config patch must be an object", "root");
  }
  if ("tikidoc_rules" in rawPatch) {
    throw fail("Full replace is forbidden; send a partial patch without tikidoc_rules wrapper", "tikidoc_rules");
  }

  const topKeys = Object.keys(rawPatch);
  if (!topKeys.length) {
    throw fail("Config patch cannot be empty", "root");
  }

  const changedPaths = new Set();
  const normalized = {};
  ensureNoUnknownKeys(rawPatch, new Set(["ask", "rooms", "patient_portal"]), "root");

  if (rawPatch.ask !== undefined) {
    ensurePlainObject(rawPatch.ask, "ask");
    ensureNoUnknownKeys(rawPatch.ask, new Set(["quick_prompts", "fallback_copy", "escalation_labels"]), "ask");
    normalized.ask = {};
    if (rawPatch.ask.quick_prompts !== undefined) {
      normalized.ask.quick_prompts = validateQuickPrompts(rawPatch.ask.quick_prompts, changedPaths);
    }
    if (rawPatch.ask.fallback_copy !== undefined) {
      normalized.ask.fallback_copy = validateFallbackCopy(rawPatch.ask.fallback_copy, changedPaths);
    }
    if (rawPatch.ask.escalation_labels !== undefined) {
      normalized.ask.escalation_labels = validateEscalationLabels(rawPatch.ask.escalation_labels, changedPaths);
    }
    if (!Object.keys(normalized.ask).length) delete normalized.ask;
  }

  if (rawPatch.rooms !== undefined) {
    ensurePlainObject(rawPatch.rooms, "rooms");
    ensureNoUnknownKeys(rawPatch.rooms, new Set(["room_ready"]), "rooms");
    normalized.rooms = {};
    if (rawPatch.rooms.room_ready !== undefined) {
      normalized.rooms.room_ready = validateRoomReady(rawPatch.rooms.room_ready, changedPaths);
    }
    if (!Object.keys(normalized.rooms).length) delete normalized.rooms;
  }

  if (rawPatch.patient_portal !== undefined) {
    ensurePlainObject(rawPatch.patient_portal, "patient_portal");
    ensureNoUnknownKeys(rawPatch.patient_portal, new Set(["tasks"]), "patient_portal");
    normalized.patient_portal = {};
    if (rawPatch.patient_portal.tasks !== undefined) {
      normalized.patient_portal.tasks = validatePatientPortalTasks(rawPatch.patient_portal.tasks, changedPaths);
    }
    if (!Object.keys(normalized.patient_portal).length) delete normalized.patient_portal;
  }

  if (!Object.keys(normalized).length) {
    throw fail("Config patch did not include any writable keys", "root");
  }

  return {
    patch: normalized,
    changedPaths: Array.from(changedPaths).sort(),
  };
}
