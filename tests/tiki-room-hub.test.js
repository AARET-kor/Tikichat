import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../client/src/pages/TikiRoomPage.jsx", import.meta.url),
  "utf8",
);

test("Tiki Room defaults to a room hub instead of auto-selecting a fixed room", () => {
  assert.match(source, /roomViewMode/);
  assert.match(source, /룸 배정 콘솔/);
  assert.match(source, /진료실 화면/);
  assert.doesNotMatch(source, /window\.localStorage\.setItem\(ROOM_STORAGE_KEY, firstRoom\)/);
});

test("Tiki Room hub exposes staff room occupancy and assignment actions", () => {
  assert.match(source, /\/api\/staff\/ops-board/);
  assert.match(source, /assign-room/);
  assert.match(source, /\/api\/room\/load-next/);
  assert.match(source, /\/api\/room\/clear/);
  assert.match(source, /다음 환자 불러오기/);
  assert.match(source, /방 비우기/);
});
