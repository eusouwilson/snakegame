import { Platform } from 'react-native';

/** Paleta do LCD (4 tons de verde) */
export const LCD = {
  pale: '#9BBC0F',
  light: '#8BAC0F',
  mid: '#306230',
  dark: '#0F380F',
};

/** Cores do corpo do console (identidade propria: verde-agua, azul-marinho e amarelo) */
export const THEME = {
  body: '#2A7F86',
  bodyShade: '#226A70',
  bezel: '#16213A',
  bezelText: '#B8C4DD',
  lcdFrame: '#0C1424',
  button: '#F2B134',
  buttonShade: '#B97F0A',
  dpad: '#14213D',
  dpadHi: '#2C3E66',
  dpadArrow: '#7E90B8',
  dpadCenter: '#0E1730',
  pill: '#F4EBD0',
  label: '#F4EBD0',
  brand: '#F4EBD0',
  food: '#D6456B',
};

export const MONO = Platform.select({ android: 'monospace', default: 'Courier' });
