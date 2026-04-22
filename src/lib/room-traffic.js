const ROOM_READY_STAGES = new Set(["pre_visit", "treatment", "post_care"]);

function toTimestamp(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts;
}

export function isVisitRoomReady(visit = {}) {
  return Boolean(
    visit.checked_in_at &&
    visit.intake_done &&
    visit.consent_done &&
    ROOM_READY_STAGES.has(visit.stage || "booked"),
  );
}

export function isVisitInRoom(visit = {}) {
  return Boolean(
    visit.room_id &&
    !visit.room_cleared_at &&
    (visit.stage || "booked") !== "closed",
  );
}

export function buildRoomOccupancy({ rooms = [], visits = [] }) {
  return rooms.map((room) => {
    const currentVisit = visits
      .filter((visit) => visit.room_id === room.id && isVisitInRoom(visit))
      .sort((a, b) => toTimestamp(a.room_assigned_at || a.checked_in_at) - toTimestamp(b.room_assigned_at || b.checked_in_at))[0] || null;

    return {
      ...room,
      occupancy_state: currentVisit ? "occupied" : "free",
      current_visit: currentVisit,
    };
  });
}

export function getRoomReadyQueue(visits = []) {
  return visits
    .filter((visit) => isVisitRoomReady(visit) && !visit.room_id)
    .sort((a, b) => {
      const checkInDiff = toTimestamp(a.checked_in_at) - toTimestamp(b.checked_in_at);
      if (checkInDiff !== 0) return checkInDiff;
      return toTimestamp(a.visit_date) - toTimestamp(b.visit_date);
    });
}

