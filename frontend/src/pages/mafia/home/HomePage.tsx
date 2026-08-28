import { useState } from "react";
import { createRoom, joinRoom } from "../api/client";
import type { PlayerSession } from "../hooks/usePlayerSession";

interface HomePageProps {
  onJoined: (session: PlayerSession) => void;
  notice?: string | null;
}

export function HomePage({ onJoined, notice }: HomePageProps) {
  const [nickname, setNickname] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [playerCount, setPlayerCount] = useState(4);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    try {
      const { room_id } = await createRoom(playerCount);
      const { player_id, is_host } = await joinRoom(room_id, nickname);
      onJoined({ roomId: room_id, playerId: player_id, isHost: is_host });
    } catch (err) {
      setError(err instanceof Error ? err.message : "방 생성에 실패했습니다.");
    }
  };

  const handleJoin = async () => {
    setError(null);
    try {
      const { player_id, is_host } = await joinRoom(joinRoomId, nickname);
      onJoined({ roomId: joinRoomId, playerId: player_id, isHost: is_host });
    } catch (err) {
      setError(err instanceof Error ? err.message : "참가에 실패했습니다.");
    }
  };

  return (
    <div className="card stack-lg">
      <div className="stack">
        <h1>마피아 게임</h1>
        <p>성향 데이터로 직업이 정해지는 아이스브레이킹 마피아</p>
      </div>

      {notice && <p className="alert-notice">{notice}</p>}

      <label className="field">
        닉네임
        <input
          className="input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="테이블에서 불릴 이름"
        />
      </label>

      <section className="stack">
        <h2>방 만들기</h2>
        <div className="row">
          <select
            className="select"
            value={playerCount}
            onChange={(e) => setPlayerCount(Number(e.target.value))}
          >
            <option value={4}>4인</option>
            <option value={5}>5인</option>
            <option value={6}>6인</option>
          </select>
          <button className="btn btn-primary" onClick={handleCreate} disabled={!nickname}>
            방 만들기
          </button>
        </div>
      </section>

      <section className="stack">
        <h2>방 참가하기</h2>
        <div className="row">
          <input
            className="input"
            placeholder="방 코드"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
          />
          <button
            className="btn btn-secondary"
            onClick={handleJoin}
            disabled={!nickname || !joinRoomId}
          >
            참가하기
          </button>
        </div>
      </section>

      {error && (
        <p role="alert" className="alert-error">
          {error}
        </p>
      )}
    </div>
  );
}
