import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPatientMatchSignals,
  rankPatientMatches,
} from "../src/lib/patient-matching.js";

test("builds conservative match signals from TikiPaste analysis and staff source fields", () => {
  const signals = buildPatientMatchSignals({
    analysis: {
      patient_candidate: { name: "Wang Fang", phone: "+82 10-1234-5678" },
      detected_language: "중국어",
    },
    source: { channel: "kakao", handle: "wangfang2024", phone: "" },
    raw_text: "위챗 wangfang2024, 리프팅 문의",
  });

  assert.equal(signals.name, "Wang Fang");
  assert.equal(signals.phone, "+82 10-1234-5678");
  assert.equal(signals.handle, "wangfang2024");
  assert.deepEqual(signals.search_terms.includes("Wang Fang"), true);
  assert.deepEqual(signals.search_terms.includes("wangfang2024"), true);
});

test("ranks exact channel or external refs above weak name-only matches", () => {
  const ranked = rankPatientMatches({
    signals: { name: "Wang Fang", phone: "01012345678", handle: "wangfang2024", lang: "zh" },
    candidates: [
      { id: "weak", name: "Wang Fang", lang: "zh", channel_refs: {}, external_refs: {} },
      { id: "handle", name: "W. Fang", lang: "zh", channel_refs: { kakao: { handle: "wangfang2024" } }, external_refs: {} },
      { id: "phone", name: "Other", lang: "zh", channel_refs: {}, external_refs: { source_phone: "010-1234-5678" } },
    ],
  });

  assert.equal(ranked[0].patient.id, "phone");
  assert.equal(ranked[0].confidence, "high");
  assert.equal(ranked[1].patient.id, "handle");
  assert.match(ranked[1].reasons.join(" "), /채널 핸들 일치/);
  assert.equal(ranked[2].patient.id, "weak");
  assert.equal(ranked[2].confidence, "medium");
});
