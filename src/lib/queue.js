/**
 * src/lib/queue.js
 * BullMQ + IORedis 공유 연결 설정
 *
 * Railway Redis 플러그인 연결: REDIS_URL 환경변수로 자동 주입됨
 * Redis 없으면 큐 기능 비활성화 (graceful degradation)
 */

import { Queue } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "";

// ── Redis 연결 (BullMQ는 maxRetriesPerRequest: null 필수) ──────────────────
let redisConnection = null;

if (REDIS_URL) {
  redisConnection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,   // BullMQ 필수 설정
    enableReadyCheck:    false,   // Railway Redis 호환
    lazyConnect:         true,
    retryStrategy: (times) => Math.min(times * 500, 10_000),
  });

  redisConnection.on("connect",  () => console.log("[Redis] Connected"));
  redisConnection.on("error",    (err) => console.error("[Redis] Error:", err.message));
  redisConnection.on("close",    () => console.warn("[Redis] Connection closed"));
} else {
  console.warn("[Queue] REDIS_URL 미설정 — BullMQ 비활성화. 웹훅/애프터케어 큐 사용 불가.");
}

// ── 공통 Job 옵션 ──────────────────────────────────────────────────────────
const INBOUND_JOB_OPTS = {
  attempts: 5,
  backoff: { type: "exponential", delay: 2_000 },  // 2s → 4s → 8s → 16s → 32s
  removeOnComplete: true,
  removeOnFail:     { count: 100 },
};

const AFTERCARE_JOB_OPTS = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5_000 },
  removeOnComplete: true,
  removeOnFail:     { count: 50 },
};

// ── Queue 인스턴스 ──────────────────────────────────────────────────────────
// Redis 없으면 null 반환 → 각 사용처에서 null 체크
function makeQueue(name, defaultJobOptions) {
  if (!redisConnection) return null;
  return new Queue(name, {
    connection:        redisConnection,
    defaultJobOptions,
  });
}

export const messageQueue   = makeQueue("tikichat-messages",  INBOUND_JOB_OPTS);
export const aftercareQueue = makeQueue("tikichat-aftercare", AFTERCARE_JOB_OPTS);
export { redisConnection };

// ── 안전한 enqueue 헬퍼 (Redis 없어도 앱 크래시 금지) ─────────────────────
export async function safeEnqueue(queue, jobName, data, opts = {}) {
  if (!queue) {
    console.warn(`[Queue] Queue 비활성화 상태 — ${jobName} 작업 건너뜀`);
    return null;
  }
  try {
    return await queue.add(jobName, data, opts);
  } catch (err) {
    console.error(`[Queue] Enqueue 실패 (${jobName}):`, err.message);
    return null;
  }
}
