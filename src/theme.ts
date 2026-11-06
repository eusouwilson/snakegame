import { Platform } from 'react-native';

/** Paleta do LCD (4 tons de verde) */
export const LCD = {
  pale: '#9BBC0F',
  light: '#8BAC0F',
  mid: '#306230',
  dark: '#0F380F',
};

/** Cores do corpo do console */
export const THEME = {
  body: '#D8D3C4',
  bodyShade: '#BDB8A8',
  bezel: '#4B4A5C',
  bezelText: '#C9C7D6',
  lcdFrame: '#22222B',
  button: '#D6456B',
  buttonShade: '#A8324F',
  dpad: '#2B2B33',
  dpadHi: '#454552',
  dpadArrow: '#6A6A78',
  dpadCenter: '#22222A',
  pill: '#8E8A7E',
  label: '#4B4A5C',
  brand: '#1E3A5F',
  food: '#D6456B',
};

export const MONO = Platform.select({ android: 'monospace', default: 'Courier' });
