import type { ExecutionVerdict, GameResult, InvestigationResult, MyView, RoomState } from "./types";
import { API_BASE } from "../../../shared/apiBase";


async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export function createRoom(playerCount: number) {
  return request<{ room_id: string }>("/mafia/rooms", {
    method: "POST",
    body: JSON.stringify({ player_count: playerCount }),
  });
}

export function joinRoom(roomId: string, nickname: string) {
  return request<{ player_id: string; is_host: boolean }>(`/mafia/rooms/${roomId}/join`, {
    method: "POST",
    body: JSON.stringify({ nickname }),
  });
}

export function fillTestPlayers(roomId: string) {
  return request<{ status: string; player_count: number }>(`/mafia/rooms/${roomId}/fill-test-players`, {
    method: "POST",
  });
}

export function submitMockPersona(roomId: string, seed?: number) {
  const query = seed !== undefined ? `?seed=${seed}` : "";
  return request<{ status: string }>(`/mafia/rooms/${roomId}/persona/mock${query}`, {
    method: "POST",
  });
}

export function startGame(roomId: string) {
  return request<{ phase: string }>(`/mafia/rooms/${roomId}/start`, { method: "POST" });
}

export function restartRoom(roomId: string) {
  return request<{ phase: string }>(`/mafia/rooms/${roomId}/restart`, { method: "POST" });
}

export function advancePhase(roomId: string) {
  return request<{ phase: string }>(`/mafia/rooms/${roomId}/advance`, { method: "POST" });
}

export function castVote(roomId: string, voterId: string, targetId: string) {
  return request<{ status: string }>(`/mafia/rooms/${roomId}/vote`, {
    method: "POST",
    body: JSON.stringify({ voter_id: voterId, target_id: targetId }),
  });
}

export function submitExecutionVote(roomId: string, voterId: string, verdict: ExecutionVerdict) {
  return request<{ status: string }>(`/mafia/rooms/${roomId}/execution-vote`, {
    method: "POST",
    body: JSON.stringify({ voter_id: voterId, verdict }),
  });
}

export function submitNightAction(
  roomId: string,
  actorId: string,
  actionType: string,
  targetId: string
) {
  return request<{ status: string; investigation_result?: InvestigationResult }>(
    `/mafia/rooms/${roomId}/night-action`,
    {
      method: "POST",
      body: JSON.stringify({ actor_id: actorId, action_type: actionType, target_id: targetId }),
    }
  );
}

export function updatePlayerCount(roomId: string, playerCount: number) {
  return request<{ player_count: number }>(`/mafia/rooms/${roomId}/player-count`, {
    method: "POST",
    body: JSON.stringify({ player_count: playerCount }),
  });
}

/**
 * Leave the room, closing it if you are the host.
 *
 * Backs '게임 선택으로 돌아가기': the room is released server-side so nobody can
 * rejoin the abandoned game, and the players still in it see it disappear.
 */
export function leaveRoom(roomId: string, playerId: string) {
  return request<{ status: string }>(`/mafia/rooms/${roomId}/leave`, {
    method: "POST",
    body: JSON.stringify({ player_id: playerId }),
  });
}

export function getRoomState(roomId: string) {
  return request<RoomState>(`/mafia/rooms/${roomId}/state`);
}

export function getMyView(roomId: string, playerId: string) {
  return request<MyView>(`/mafia/rooms/${roomId}/players/${playerId}/me`);
}

export function getResult(roomId: string) {
  return request<GameResult>(`/mafia/rooms/${roomId}/result`);
}
