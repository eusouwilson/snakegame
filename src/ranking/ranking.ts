import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure em .env (local) ou nos secrets do GitHub (CI). Sem isso o ranking fica desligado.
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const RANKING_ENABLED = URL.length > 0 && KEY.length > 0;

const PLAYER_KEY = 'snake:playerId';
const NICK_KEY = 'snake:nickname';
export const NICK_MAX = 12;

export type Period = 'week' | 'all';
export type Entry = { player_id: string; nickname: string; score: number };

function uuid(): string {
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) out += '-';
    else if (i === 14) out += '4';
    else if (i === 19) out += hex[8 + Math.floor(Math.random() * 4)];
    else out += hex[Math.floor(Math.random() * 16)];
  }
  return out;
}

export async function getPlayerId(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(PLAYER_KEY);
    if (saved) return saved;
  } catch {}
  const id = uuid();
  AsyncStorage.setItem(PLAYER_KEY, id).catch(() => {});
  return id;
}

export async function getNickname(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(NICK_KEY)) ?? '';
  } catch {
    return '';
  }
}

/** Apelido: letras, numeros, espaco, _ e -; ate 12 caracteres. */
export function cleanNickname(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NICK_MAX);
}

export async function saveNickname(raw: string): Promise<string> {
  const nick = cleanNickname(raw);
  await AsyncStorage.setItem(NICK_KEY, nick).catch(() => {});
  return nick;
}

const headers = () => ({
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
});

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms = 8000): Promise<T> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await run(ctrl.signal);
  } finally {
    clearTimeout(id);
  }
}

/** Envia a pontuacao. Retorna true se o servidor aceitou. */
export async function submitScore(score: number): Promise<boolean> {
  if (!RANKING_ENABLED || score <= 0) return false;
  const nickname = cleanNickname(await getNickname());
  if (!nickname) return false;
  const player_id = await getPlayerId();
  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(`${URL}/rest/v1/scores`, {
        method: 'POST',
        headers: { ...headers(), Prefer: 'return=minimal' },
        body: JSON.stringify({ player_id, nickname, score }),
        signal,
      });
      return res.ok;
    });
  } catch {
    return false;
  }
}

/** Top 50 do periodo. Lanca erro se a rede falhar. */
export async function fetchTop(period: Period): Promise<Entry[]> {
  if (!RANKING_ENABLED) return [];
  const view = period === 'week' ? 'ranking_week' : 'ranking_all';
  return withTimeout(async (signal) => {
    const res = await fetch(
      `${URL}/rest/v1/${view}?select=player_id,nickname,score&order=score.desc,created_at.asc&limit=50`,
      { headers: headers(), signal },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Entry[];
  });
}
