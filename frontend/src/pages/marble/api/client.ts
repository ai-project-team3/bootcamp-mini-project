import type { ContentMode, JoinResult, RoomState } from "./types";
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

export function createRoom(contentMode: ContentMode, maxPlayers: number) {
  return request<{ room_id: string }>("/marble/rooms", {
    method: "POST",
    body: JSON.stringify({ content_mode: contentMode, max_players: maxPlayers }),
  });
}

export function updateMaxPlayers(roomId: string, maxPlayers: number) {
  return request<{ max_players: number }>(`/marble/rooms/${roomId}/max-players`, {
    method: "POST",
    body: JSON.stringify({ max_players: maxPlayers }),
  });
}

export function joinRoom(roomId: string, nickname: string) {
  return request<JoinResult>(`/marble/rooms/${roomId}/join`, {
    method: "POST",
    body: JSON.stringify({ nickname }),
  });
}

export function getRoomState(roomId: string) {
  return request<RoomState>(`/marble/rooms/${roomId}/state`);
}

export function startGame(roomId: string) {
  return request<Record<string, never>>(`/marble/rooms/${roomId}/start`, { method: "POST" });
}

export function rollDice(roomId: string, playerId: string) {
  return request<Record<string, never>>(`/marble/rooms/${roomId}/roll`, {
    method: "POST",
    body: JSON.stringify({ player_id: playerId }),
  });
}

export function submitAnswer(roomId: string, playerId: string, choiceIndex: number) {
  return request<Record<string, never>>(`/marble/rooms/${roomId}/answer`, {
    method: "POST",
    body: JSON.stringify({ player_id: playerId, choice_index: choiceIndex }),
  });
}

export function finishForfeit(roomId: string, playerId: string) {
  return request<Record<string, never>>(`/marble/rooms/${roomId}/forfeit-done`, {
    method: "POST",
    body: JSON.stringify({ player_id: playerId }),
  });
}

export function restartRoom(roomId: string) {
  return request<Record<string, never>>(`/marble/rooms/${roomId}/restart`, { method: "POST" });
}
