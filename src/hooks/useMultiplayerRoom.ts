import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ClientToServerMessage,
  HitNoticeKind,
  NetHazard,
  NetKartState,
  NetRoomSnapshot,
  ServerToClientMessage,
} from '../shared/protocol.ts';

interface UseMultiplayerOptions {
  onSnapshot: (room: NetRoomSnapshot) => void;
  onHitNotice: (targetId: string, attackerId: string, kind: HitNoticeKind) => void;
}

export function useMultiplayerRoom({ onSnapshot, onHitNotice }: UseMultiplayerOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [room, setRoom] = useState<NetRoomSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSnapshotRef = useRef(onSnapshot);
  const onHitRef = useRef(onHitNotice);
  onSnapshotRef.current = onSnapshot;
  onHitRef.current = onHitNotice;

  const sendMsg = useCallback((msg: ClientToServerMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    setPlayerId(null);
    setRoom(null);
  }, []);

  const joinRoom = useCallback(
    (
      roomCode: string,
      playerName: string,
      characterId: string,
      vehicleId = 'standard_kart',
      variantId = 'default'
    ) => {
      disconnect();
      setError(null);
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}/ws`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send(
          JSON.stringify({
            type: 'room:join',
            roomCode,
            playerName,
            characterId,
            variantId,
            vehicleId,
          } satisfies ClientToServerMessage)
        );
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(String(evt.data)) as ServerToClientMessage;
          if (msg.type === 'session:welcome') {
            setPlayerId(msg.playerId);
            setRoom(msg.room);
            onSnapshotRef.current(msg.room);
          } else if (msg.type === 'room:snapshot') {
            setRoom(msg.room);
            onSnapshotRef.current(msg.room);
          } else if (msg.type === 'item:hitNotice') {
            onHitRef.current(msg.targetId, msg.attackerId, msg.kind);
          } else if (msg.type === 'room:error') {
            setError(msg.message);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
      };

      ws.onerror = () => {
        setError('Unable to reach multiplayer server.');
      };
    },
    [disconnect]
  );

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return {
    connected,
    playerId,
    room,
    error,
    joinRoom,
    disconnect,
    selectCharacter: (characterId: string, variantId?: string) =>
      sendMsg({ type: 'room:selectCharacter', characterId, variantId }),
    selectVehicle: (vehicleId: string) =>
      sendMsg({ type: 'room:selectVehicle', vehicleId }),
    setCourse: (mapId: string, weatherChoice: string) =>
      sendMsg({ type: 'room:setCourse', mapId, weatherChoice }),
    setReady: (ready: boolean) => sendMsg({ type: 'room:setReady', ready }),
    startRace: () => sendMsg({ type: 'room:startRace' }),
    returnLobby: () => sendMsg({ type: 'room:returnLobby' }),
    sendKartState: (state: NetKartState) => sendMsg({ type: 'player:state', state }),
    spawnHazard: (hazard: NetHazard) => sendMsg({ type: 'item:spawnHazard', hazard }),
    removeHazard: (hazardId: string) => sendMsg({ type: 'item:removeHazard', hazardId }),
    hitPlayer: (targetId: string, attackerId: string, kind: HitNoticeKind) =>
      sendMsg({ type: 'item:hitPlayer', targetId, attackerId, kind }),
  };
}
