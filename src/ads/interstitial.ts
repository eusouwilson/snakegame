/**
 * Anuncio intersticial (tela cheia) via AdMob.
 *
 * - Sem ID real configurado, usa os IDs de TESTE do Google (seguro para desenvolver).
 * - Se o modulo nativo nao existir (Expo Go), tudo vira no-op e o jogo segue normal.
 * - Nunca bloqueia o jogo: qualquer erro ou demora resolve a promessa.
 */

// Frequencia: um anuncio a cada N partidas, com intervalo minimo entre anuncios
const GAMES_PER_AD = 3;
const MIN_INTERVAL_MS = 90_000;
const SHOW_TIMEOUT_MS = 8_000;

type AdsModule = typeof import('react-native-google-mobile-ads');

let Ads: AdsModule | null = null;
try {
  // require dentro de try: em Expo Go o modulo nativo nao existe
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Ads = require('react-native-google-mobile-ads') as AdsModule;
} catch {
  Ads = null;
}

type Interstitial = ReturnType<AdsModule['InterstitialAd']['createForAdRequest']>;

let ad: Interstitial | null = null;
let loaded = false;
let started = false;
let gamesSinceAd = 0;
let lastShownAt = 0;

function unitId(): string | null {
  if (!Ads) return null;
  const real = process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID;
  return real && real.length > 0 ? real : Ads.TestIds.INTERSTITIAL;
}

function load() {
  const id = unitId();
  if (!Ads || !id) return;
  try {
    loaded = false;
    const next = Ads.InterstitialAd.createForAdRequest(id);
    next.addAdEventListener(Ads.AdEventType.LOADED, () => {
      loaded = true;
    });
    next.addAdEventListener(Ads.AdEventType.ERROR, () => {
      loaded = false;
    });
    ad = next;
    next.load();
  } catch {
    ad = null;
    loaded = false;
  }
}

/** Inicializa o SDK e ja deixa um anuncio carregado. Chamar uma vez ao abrir o app. */
export async function initAds(): Promise<void> {
  if (!Ads || started) return;
  started = true;
  try {
    await Ads.default().initialize();
    load();
  } catch {
    started = false;
  }
}

/** Registra que uma partida terminou. */
export function registerGameOver(): void {
  gamesSinceAd += 1;
}

/**
 * Mostra o anuncio se estiver na hora (e carregado). Resolve quando o anuncio
 * fecha, ou na hora se nao houver nada para mostrar.
 */
export function showInterstitialIfDue(): Promise<void> {
  const due =
    gamesSinceAd >= GAMES_PER_AD && Date.now() - lastShownAt >= MIN_INTERVAL_MS;
  if (!Ads || !ad || !loaded || !due) return Promise.resolve();

  const current = ad;
  const events = Ads;
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      gamesSinceAd = 0;
      lastShownAt = Date.now();
      load(); // prepara o proximo
      resolve();
    };
    const timer = setTimeout(finish, SHOW_TIMEOUT_MS);
    try {
      current.addAdEventListener(events.AdEventType.CLOSED, finish);
      current.addAdEventListener(events.AdEventType.ERROR, finish);
      current.show().catch(finish);
    } catch {
      finish();
    }
  });
}
