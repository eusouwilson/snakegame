import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Direction } from '../game/logic';
import { THEME } from '../theme';

/** Triangulo desenhado com bordas (evita glifos que viram emoji no Android) */
function Arrow({ dir, size, color }: { dir: Direction; size: number; color: string }) {
  const long = size * 1.4;
  const clear = 'transparent';
  const base = { width: 0, height: 0 };
  switch (dir) {
    case 'UP':
      return (
        <View
          style={{
            ...base,
            borderLeftWidth: size,
            borderRightWidth: size,
            borderBottomWidth: long,
            borderLeftColor: clear,
            borderRightColor: clear,
            borderBottomColor: color,
          }}
        />
      );
    case 'DOWN':
      return (
        <View
          style={{
            ...base,
            borderLeftWidth: size,
            borderRightWidth: size,
            borderTopWidth: long,
            borderLeftColor: clear,
            borderRightColor: clear,
            borderTopColor: color,
          }}
        />
      );
    case 'LEFT':
      return (
        <View
          style={{
            ...base,
            borderTopWidth: size,
            borderBottomWidth: size,
            borderRightWidth: long,
            borderTopColor: clear,
            borderBottomColor: clear,
            borderRightColor: color,
          }}
        />
      );
    case 'RIGHT':
      return (
        <View
          style={{
            ...base,
            borderTopWidth: size,
            borderBottomWidth: size,
            borderLeftWidth: long,
            borderTopColor: clear,
            borderBottomColor: clear,
            borderLeftColor: color,
          }}
        />
      );
  }
}

const ARM_LABEL: Record<Direction, string> = {
  UP: 'Cima',
  DOWN: 'Baixo',
  LEFT: 'Esquerda',
  RIGHT: 'Direita',
};

export function DPad({ size, onPress }: { size: number; onPress: (dir: Direction) => void }) {
  const t = Math.round(size / 3);
  const arrow = Math.max(5, Math.round(t * 0.2));
  const arms: { dir: Direction; left: number; top: number }[] = [
    { dir: 'UP', left: t, top: 0 },
    { dir: 'DOWN', left: t, top: t * 2 },
    { dir: 'LEFT', left: 0, top: t },
    { dir: 'RIGHT', left: t * 2, top: t },
  ];

  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.bar, { left: 0, top: t, width: size, height: t }]} />
      <View style={[styles.bar, { left: t, top: 0, width: t, height: size }]} />
      <View
        style={{
          position: 'absolute',
          left: t * 1.2,
          top: t * 1.2,
          width: t * 0.6,
          height: t * 0.6,
          borderRadius: t * 0.3,
          backgroundColor: THEME.dpadCenter,
        }}
      />
      {arms.map((a) => (
        <Pressable
          key={a.dir}
          accessibilityRole="button"
          accessibilityLabel={ARM_LABEL[a.dir]}
          onPressIn={() => onPress(a.dir)}
          hitSlop={4}
          style={({ pressed }) => [
            styles.arm,
            { left: a.left, top: a.top, width: t, height: t },
            pressed && { backgroundColor: THEME.dpadHi },
          ]}
        >
          <Arrow dir={a.dir} size={arrow} color={THEME.dpadArrow} />
        </Pressable>
      ))}
    </View>
  );
}

export function RoundButton({
  label,
  size,
  onPress,
}: {
  label: string;
  size: number;
  onPress: () => void;
}) {
  return (
    <View style={styles.labelBox}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Botao ${label}`}
        onPressIn={onPress}
        hitSlop={6}
        style={({ pressed }) => [
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: pressed ? THEME.buttonShade : THEME.button,
            borderBottomWidth: pressed ? 0 : 4,
            borderBottomColor: THEME.buttonShade,
          },
          pressed && { transform: [{ scale: 0.95 }] },
        ]}
      />
      <Text style={styles.btnLabel}>{label}</Text>
    </View>
  );
}

export function Pill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={styles.labelBox}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={onPress}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        style={({ pressed }) => [styles.pill, pressed && { backgroundColor: THEME.bezel }]}
      />
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

/** Grade do alto-falante (decorativa) */
export function Speaker() {
  return (
    <View style={styles.speaker} pointerEvents="none">
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.speakerBar} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    backgroundColor: THEME.dpad,
    borderRadius: 6,
  },
  arm: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  labelBox: { alignItems: 'center' },
  btnLabel: {
    marginTop: 6,
    color: THEME.label,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 1,
  },
  pill: {
    width: 46,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.pill,
  },
  pillLabel: {
    marginTop: 4,
    color: THEME.label,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 1,
  },
  speaker: {
    flexDirection: 'row',
    gap: 6,
    transform: [{ rotate: '-28deg' }],
  },
  speakerBar: {
    width: 6,
    height: 38,
    borderRadius: 3,
    backgroundColor: THEME.bodyShade,
  },
});
