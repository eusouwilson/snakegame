import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Point, PowerUp, PowerUpType } from '../game/logic';
import { LCD, MONO, THEME } from '../theme';

/** Letra desenhada dentro do item de cada power-up */
export const POWER_UP_GLYPH: Record<PowerUpType, string> = {
  slow: 'L',
  double: '2',
  ghost: 'F',
  magnet: 'M',
  shield: 'E',
  shrink: 'C',
  bonus: '+',
};

type Props = {
  snake: Point[];
  food: Point;
  powerUp: PowerUp | null;
  ghost: boolean;
  shield: boolean;
  cols: number;
  rows: number;
  cell: number;
};

export const Board = memo(function Board({ snake, food, powerUp, ghost, shield, cols, rows, cell }: Props) {
  const inset = Math.max(1, Math.round(cell * 0.06));
  // Item pisca nos ultimos passos, avisando que vai sumir
  const blinkOff = powerUp !== null && powerUp.ticksLeft <= 14 && powerUp.ticksLeft % 2 === 0;

  return (
    <View style={{ width: cell * cols, height: cell * rows, backgroundColor: LCD.pale }}>
      <View
        style={[
          styles.box,
          {
            left: food.x * cell + cell * 0.14,
            top: food.y * cell + cell * 0.14,
            width: cell * 0.72,
            height: cell * 0.72,
            borderRadius: cell * 0.2,
            backgroundColor: THEME.food,
          },
        ]}
      />

      {powerUp && (
        <View
          style={[
            styles.box,
            styles.powerUp,
            {
              left: powerUp.pos.x * cell + inset,
              top: powerUp.pos.y * cell + inset,
              width: cell - inset * 2,
              height: cell - inset * 2,
              borderRadius: cell * 0.22,
              opacity: blinkOff ? 0.25 : 1,
            },
          ]}
        >
          <Text style={[styles.glyph, { fontSize: Math.round(cell * 0.62) }]}>
            {POWER_UP_GLYPH[powerUp.type]}
          </Text>
        </View>
      )}

      {snake.map((p, i) => (
        <View
          key={i === 0 ? 'head' : i}
          style={[
            styles.box,
            {
              left: p.x * cell + inset,
              top: p.y * cell + inset,
              width: cell - inset * 2,
              height: cell - inset * 2,
              borderRadius: i === 0 ? cell * 0.28 : cell * 0.12,
              backgroundColor: i === 0 ? LCD.dark : LCD.mid,
              opacity: ghost ? 0.55 : 1,
              ...(i === 0 && shield
                ? { borderWidth: Math.max(2, Math.round(cell * 0.14)), borderColor: THEME.food }
                : null),
            },
          ]}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { position: 'absolute' },
  powerUp: {
    backgroundColor: LCD.dark,
    borderWidth: 1,
    borderColor: LCD.mid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    color: LCD.pale,
    fontFamily: MONO,
    fontWeight: '900',
    includeFontPadding: false,
  },
});
