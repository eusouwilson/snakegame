import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Point } from '../game/logic';
import { LCD, THEME } from '../theme';

type Props = {
  snake: Point[];
  food: Point;
  cols: number;
  rows: number;
  cell: number;
};

export const Board = memo(function Board({ snake, food, cols, rows, cell }: Props) {
  const inset = Math.max(1, Math.round(cell * 0.06));
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
            },
          ]}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { position: 'absolute' },
});
