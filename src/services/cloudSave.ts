import type { CloudPlayerProfile, HostedRoomSummary } from '../shared/protocol.ts';

const USERNAME_KEY = 'mkgp_cloud_username';
const LOCAL_PROFILE_CACHE = 'mkgp_profile_cache';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  playtimeSeconds: number;
  playtimeFormatted: string;
  racesCompleted: number;
  wins: number;
  podiums: number;
  favoriteCharacter: string;
  favoriteVehicle: string;
}

export interface SaveResult {
  profile: CloudPlayerProfile;
  leveledUp: boolean;
  levelsGained: number;
  newLevel: number;
  nextLevelXpReq: number;
}

export function getStoredUsername(): string {
  try {
    return localStorage.getItem(USERNAME_KEY) || 'Shritiz Racer';
  } catch {
    return 'Shritiz Racer';
  }
}

export function setStoredUsername(name: string): void {
  try {
    const clean = (name || 'Racer').trim().slice(0, 16);
    localStorage.setItem(USERNAME_KEY, clean);
  } catch {
    // ignore
  }
}

export function getCachedProfile(): CloudPlayerProfile {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_CACHE);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.username) return p;
    }
  } catch {
    // ignore
  }
  return {
    username: getStoredUsername(),
    level: 1,
    xp: 0,
    playtimeSeconds: 0,
    racesCompleted: 0,
    wins: 0,
    podiums: 0,
    favoriteCharacter: 'mario',
    favoriteVehicle: 'standard_kart',
    lastActiveMs: Date.now(),
  };
}

export function cacheProfileLocally(p: CloudPlayerProfile): void {
  try {
    localStorage.setItem(LOCAL_PROFILE_CACHE, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export async function fetchCloudProfile(username: string): Promise<CloudPlayerProfile> {
  const clean = encodeURIComponent((username || 'Racer').trim());
  try {
    const res = await fetch(`/api/profile/${clean}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.profile) {
        cacheProfileLocally(data.profile);
        return data.profile;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch cloud profile:', err);
  }
  return getCachedProfile();
}

export async function saveCloudProfile(params: {
  username: string;
  xpGain?: number;
  playtimeGainSec?: number;
  raceFinished?: boolean;
  won?: boolean;
  podium?: boolean;
  favoriteCharacter?: string;
  favoriteVehicle?: string;
}): Promise<SaveResult | null> {
  try {
    const res = await fetch('/api/profile/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data: SaveResult = await res.json();
      if (data?.profile) {
        cacheProfileLocally(data.profile);
        return data;
      }
    }
  } catch (err) {
    console.warn('Failed to save cloud profile:', err);
  }
  return null;
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch('/api/leaderboard');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.leaderboard)) {
        return data.leaderboard;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch leaderboard:', err);
  }
  return [];
}

export async function fetchHostedRooms(): Promise<HostedRoomSummary[]> {
  try {
    const res = await fetch('/api/rooms');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.rooms)) {
        return data.rooms;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch hosted rooms:', err);
  }
  return [];
}
