import test from "node:test";
import assert from "node:assert/strict";

import {
  containsHangul,
  ensurePatientLanguageReplies,
  formatForeignPatientDisplayName,
  normalizeTikiPasteLanguage,
} from "../src/lib/tiki-paste-language.js";

test("normalizes common TikiPaste language labels", () => {
  assert.equal(normalizeTikiPasteLanguage("중국어"), "zh");
  assert.equal(normalizeTikiPasteLanguage("中文"), "zh");
  assert.equal(normalizeTikiPasteLanguage("Japanese"), "ja");
  assert.equal(normalizeTikiPasteLanguage("한국어"), "ko");
});

test("rewrites Korean reply leakage for Chinese patient-facing replies", () => {
  const guarded = ensurePatientLanguageReplies({
    detected_language: "중국어",
    procedure_interests: ["필러"],
    options: {
      kind: {
        reply: "폰주팬님, 안녕하세요. 필러 문의 감사합니다.",
        ko_translation: "",
      },
      firm: {
        reply: "안녕하세요. 상담 후 결정해야 합니다.",
        ko_translation: "안녕하세요. 상담 후 결정해야 합니다.",
      },
      booking: {
        reply: "예약을 도와드릴게요. [예약: https://app.tikidoc.xyz/book]",
        ko_translation: "",
      },
    },
  }, { appBaseUrl: "https://app.tikidoc.xyz", clinicName: "강남 리브힙 의원" });

  assert.equal(guarded.language_guard_applied, true);
  assert.equal(containsHangul(guarded.options.kind.reply), false);
  assert.equal(containsHangul(guarded.options.firm.reply), false);
  assert.equal(containsHangul(guarded.options.booking.reply), false);
  assert.match(guarded.options.kind.reply, /您好/);
  assert.match(guarded.options.booking.reply, /预约/);
  assert.match(guarded.options.kind.ko_translation, /폰주팬님/);
});

test("keeps valid same-language replies unchanged", () => {
  const parsed = {
    detected_language: "중국어",
    options: {
      kind: { reply: "您好，感谢您的咨询。", ko_translation: "문의 감사합니다." },
    },
  };
  const guarded = ensurePatientLanguageReplies(parsed);

  assert.equal(guarded.options.kind.reply, "您好，感谢您的咨询。");
  assert.equal(guarded.language_guard_applied, undefined);
});

test("formats foreign patient names as original name plus Korean reading", () => {
  assert.equal(
    formatForeignPatientDisplayName({ name: "黃玉琳", name_ko: "황옥림", lang: "zh" }),
    "黃玉琳 (황옥림)",
  );
  assert.equal(
    formatForeignPatientDisplayName({ name: "フォンジュパン", name_ko: "폰주팬", lang: "ja" }),
    "フォンジュパン (폰주팬)",
  );
  assert.equal(
    formatForeignPatientDisplayName({ name: "Wang Fang (왕팡)", name_ko: "왕팡", lang: "zh" }),
    "Wang Fang (왕팡)",
  );
  assert.equal(
    formatForeignPatientDisplayName({ name: "김민지", name_ko: "김민지", lang: "ko" }),
    "김민지",
  );
});
