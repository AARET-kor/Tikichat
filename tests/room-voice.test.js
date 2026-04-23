import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRoomInteractionState,
  canAnalyzeRoomTranscript,
  getSpeechRecognitionConstructor,
  getSpeechSupport,
  getTtsSupport,
  mapRoomSpeechLang,
  resolveTtsVoice,
} from "../client/src/lib/roomVoice.js";

test("mapRoomSpeechLang maps patient languages to browser speech locales", () => {
  assert.equal(mapRoomSpeechLang("ko"), "ko-KR");
  assert.equal(mapRoomSpeechLang("ja"), "ja-JP");
  assert.equal(mapRoomSpeechLang("zh"), "zh-CN");
  assert.equal(mapRoomSpeechLang("ar"), "ar-SA");
  assert.equal(mapRoomSpeechLang("en"), "en-US");
  assert.equal(mapRoomSpeechLang("unknown"), "ko-KR");
});

test("getSpeechSupport detects native browser speech recognition conservatively", () => {
  const SpeechRecognition = function SpeechRecognition() {};
  assert.deepEqual(
    getSpeechSupport({ SpeechRecognition }),
    { supported: true, reason: null },
  );
  assert.deepEqual(
    getSpeechSupport({ webkitSpeechRecognition: SpeechRecognition }),
    { supported: true, reason: null },
  );
  assert.deepEqual(
    getSpeechSupport({}),
    { supported: false, reason: "speech_recognition_unavailable" },
  );
});

test("getSpeechRecognitionConstructor returns whichever constructor the browser exposes", () => {
  const SpeechRecognition = function SpeechRecognition() {};
  const WebkitSpeechRecognition = function WebkitSpeechRecognition() {};
  assert.equal(getSpeechRecognitionConstructor({ SpeechRecognition }), SpeechRecognition);
  assert.equal(getSpeechRecognitionConstructor({ webkitSpeechRecognition: WebkitSpeechRecognition }), WebkitSpeechRecognition);
  assert.equal(getSpeechRecognitionConstructor({}), null);
});

test("getTtsSupport reports browser playback availability", () => {
  assert.deepEqual(
    getTtsSupport({ speechSynthesis: {} }),
    { supported: true, reason: null },
  );
  assert.deepEqual(
    getTtsSupport({}),
    { supported: false, reason: "speech_synthesis_unavailable" },
  );
});

test("resolveTtsVoice chooses an exact language voice when available", () => {
  const voices = [
    { name: "English", lang: "en-US" },
    { name: "Korean", lang: "ko-KR" },
  ];

  assert.deepEqual(
    resolveTtsVoice({ voices, lang: "ko" }),
    {
      voice: voices[1],
      requestedLang: "ko-KR",
      spokenLang: "ko-KR",
      quality: "exact",
      message: null,
    },
  );
});

test("resolveTtsVoice falls back to same language family before browser default", () => {
  const voices = [
    { name: "Korean generic", lang: "ko" },
    { name: "English", lang: "en-US" },
  ];

  assert.deepEqual(
    resolveTtsVoice({ voices, lang: "ko" }),
    {
      voice: voices[0],
      requestedLang: "ko-KR",
      spokenLang: "ko",
      quality: "family",
      message: "Using closest available Korean voice.",
    },
  );
});

test("resolveTtsVoice reports browser default fallback when requested language is unavailable", () => {
  const voices = [{ name: "English", lang: "en-US" }];

  assert.deepEqual(
    resolveTtsVoice({ voices, lang: "zh" }),
    {
      voice: null,
      requestedLang: "zh-CN",
      spokenLang: "zh-CN",
      quality: "browser_default",
      message: "No matching Chinese voice was found. Browser default playback may sound less natural.",
    },
  );
});

test("canAnalyzeRoomTranscript blocks analysis while the mic is still listening", () => {
  assert.equal(
    canAnalyzeRoomTranscript({
      currentPatient: { id: "patient-1" },
      inputText: "I feel dizzy",
      busyAction: "",
      voiceState: "listening",
    }),
    false,
  );
  assert.equal(
    canAnalyzeRoomTranscript({
      currentPatient: { id: "patient-1" },
      inputText: "I feel dizzy",
      busyAction: "",
      voiceState: "idle",
    }),
    true,
  );
});

test("buildRoomInteractionState makes live room state explicit", () => {
  assert.deepEqual(
    buildRoomInteractionState({ currentPatient: null }),
    { key: "empty", label: "No patient loaded", tone: "neutral" },
  );
  assert.deepEqual(
    buildRoomInteractionState({ currentPatient: { id: "p1" }, voiceState: "listening" }),
    { key: "listening", label: "Listening", tone: "warn" },
  );
  assert.deepEqual(
    buildRoomInteractionState({ currentPatient: { id: "p1" }, selectedResponse: { patient_text: "Hello" } }),
    { key: "response_ready", label: "Response ready", tone: "safe" },
  );
  assert.deepEqual(
    buildRoomInteractionState({ currentPatient: { id: "p1" }, overlayVisible: true }),
    { key: "display_active", label: "Patient display active", tone: "risk" },
  );
});
