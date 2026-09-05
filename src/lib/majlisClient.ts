import { auth } from "@/lib/firebase";
import type {
  MajlisGameStartResponse,
  MajlisOnlinePublicState,
  MajlisOnlineRoom,
  MajlisVoiceIceConfig,
  MajlisVoiceMode,
  MajlisVoiceSignal,
} from "@/types/majlisGame";

type ErrorPayload = { error?: string; code?: string };

export class MajlisApiError extends Error {
  code: string;
  constructor(message: string, code = "") {
    super(message);
    this.name = "MajlisApiError";
    this.code = code;
  }
}

async function authHeaders() {
  const current = auth.currentUser;
  if (!current) throw new MajlisApiError("سجّل الدخول أولًا لاستخدام المجلس الأونلاين.", "UNAUTHORIZED");
  return { Authorization: `Bearer ${await current.getIdToken()}` };
}

async function action<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/games/majlis", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as T & ErrorPayload;
  if (!response.ok) throw new MajlisApiError(payload.error || "تعذر تنفيذ العملية.", payload.code || "");
  return payload;
}

async function view<T>(params: Record<string, string | number>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => search.set(key, String(value)));
  const response = await fetch(`/api/games/majlis?${search.toString()}`, {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as T & ErrorPayload;
  if (!response.ok) throw new MajlisApiError(payload.error || "تعذر تحميل المجلس الأونلاين.", payload.code || "");
  return payload;
}

export function createMajlisOnlineRoom(teamCount: number, teamNames: string[]) {
  return action<{ room: MajlisOnlineRoom }>({ action: "onlineCreate", teamCount, teamNames });
}

export function joinMajlisOnlineRoom(roomCode: string) {
  return action<{ room: MajlisOnlineRoom }>({ action: "onlineJoin", roomCode });
}

export function getMajlisOnlineRoom(roomId: string) {
  return view<{ room: MajlisOnlineRoom }>({ view: "online", roomId });
}

export function heartbeatMajlisOnlineRoom(roomId: string) {
  return action<{ ok: true }>({ action: "onlineHeartbeat", roomId });
}

export function leaveMajlisOnlineRoom(roomId: string) {
  return action<{ ok: true }>({ action: "onlineLeave", roomId });
}

export function updateMajlisOnlineLobby(roomId: string, teamCount: number, teamNames: string[], selectedCategoryIds: string[]) {
  return action<{ room: MajlisOnlineRoom }>({ action: "onlineLobby", roomId, teamCount, teamNames, selectedCategoryIds });
}

export function setMajlisOnlineTeam(roomId: string, teamId: string) {
  return action<{ room: MajlisOnlineRoom }>({ action: "onlineTeam", roomId, teamId });
}

export function setMajlisVoiceMode(roomId: string, micMode: MajlisVoiceMode) {
  return action<{ room: MajlisOnlineRoom }>({ action: "onlineVoiceMode", roomId, micMode });
}

export function startMajlisOnlineGame(roomId: string, categoryIds: string[], teamCount: number, teamNames: string[]) {
  return action<{ room: MajlisOnlineRoom; session: MajlisGameStartResponse }>({ action: "onlineStart", roomId, categoryIds, teamCount, teamNames });
}

export function syncMajlisOnlineState(roomId: string, publicState: MajlisOnlinePublicState) {
  return action<{ ok: true }>({ action: "onlineSync", roomId, publicState });
}

export function closeMajlisOnlineRoom(roomId: string) {
  return action<{ ok: true }>({ action: "onlineClose", roomId });
}

export function sendMajlisVoiceSignal(roomId: string, targetUserId: string, kind: "offer" | "answer" | "reset", sessionId: string, sdp?: string) {
  return action<{ ok: true }>({ action: "onlineVoiceSignal", roomId, targetUserId, kind, sessionId, sdp });
}

export function getMajlisVoiceSignals(roomId: string, since: number) {
  return view<{ signals: MajlisVoiceSignal[]; serverTime: number }>({ view: "voice-signals", roomId, since });
}

export function getMajlisVoiceIce(roomId: string) {
  return view<MajlisVoiceIceConfig>({ view: "voice-ice", roomId });
}
