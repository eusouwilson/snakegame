// Versao de diagnostico: sem AdMob (no-op).
export async function initAds(): Promise<void> {}
export function registerGameOver(): void {}
export function showInterstitialIfDue(): Promise<void> {
  return Promise.resolve();
}
