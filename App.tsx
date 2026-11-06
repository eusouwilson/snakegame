import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  PanResponder,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Board } from './src/components/Board';
import { ActionButton, DPad, Pill } from './src/components/Controls';
import {
  createInitialState,
  Direction,
  GameState,
  isOpposite,
  step,
  tickInterval,
} from './src/game/logic';
import { LCD, MONO, THEME } from './src/theme';

const COLS = 16;
const MIN_ROWS = 14;
const MAX_ROWS = 26;
const HIGH_SCORE_KEY = 'snake:highScore';
const SWIPE_THRESHOLD = 18;

const H_MARGIN = 14; // margem lateral do console
const BEZEL_PAD_X = 16;
const LCD_BORDER = 4;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const fmt = (n: number) => String(n).padStart(4, '0');

function haptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

function Game() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Medidas do console e area disponivel para o LCD
  const layout = useMemo(() => {
    const bezelW = width - H_MARGIN * 2;
    const dpadSize = Math.round(clamp(width * 0.4, 120, 156));
    const controlsH = dpadSize + 56;
    const lcdMaxW = bezelW - BEZEL_PAD_X * 2 - LCD_BORDER * 2;
    const chrome =
      insets.top + 8 + insets.bottom + 10 + // margens da tela
      12 + 26 + 18 + LCD_BORDER * 2 + // moldura: topo, placar, base, borda do LCD
      34 + // nome "COBRINHA"
      controlsH;
    const lcdMaxH = height - chrome;
    return { bezelW, dpadSize, controlsH, lcdMaxW, lcdMaxH };
  }, [width, height, insets.top, insets.bottom]);

  // Linhas definidas uma vez (em telas altas o LCD ganha mais linhas)
  const [rows] = useState(() => {
    const c = Math.max(8, Math.floor(layout.lcdMaxW / COLS));
    return clamp(Math.floor(layout.lcdMaxH / c), MIN_ROWS, MAX_ROWS);
  });
  const cell = Math.max(
    8,
    Math.floor(Math.min(layout.lcdMaxW / COLS, layout.lcdMaxH / rows)),
  );

  const [game, setGame] = useState<GameState>(() => createInitialState(COLS, rows));
  const [highScore, setHighScore] = useState(0);

  // Fila de direcoes evita inverter 180 graus com dois toques rapidos
  const dirQueue = useRef<Direction[]>([]);
  const currentDir = useRef<Direction>('RIGHT');
  const statusRef = useRef(game.status);
  statusRef.current = game.status;

  useEffect(() => {
    AsyncStorage.getItem(HIGH_SCORE_KEY)
      .then((v) => {
        if (v) setHighScore(Number(v) || 0);
      })
      .catch(() => {});
  }, []);

  const startGame = useCallback(() => {
    const fresh = createInitialState(COLS, rows);
    dirQueue.current = [];
    currentDir.current = fresh.direction;
    setGame({ ...fresh, status: 'running' });
  }, [rows]);

  const togglePause = useCallback(() => {
    setGame((g) => {
      if (g.status === 'running') return { ...g, status: 'paused' };
      if (g.status === 'paused') return { ...g, status: 'running' };
      return g;
    });
  }, []);

  const queueDirection = useCallback((dir: Direction) => {
    if (statusRef.current !== 'running') return;
    const last = dirQueue.current.length
      ? dirQueue.current[dirQueue.current.length - 1]
      : currentDir.current;
    if (dir === last || isOpposite(dir, last)) return;
    if (dirQueue.current.length < 2) dirQueue.current.push(dir);
  }, []);

  // Pausa sozinho se o app for para segundo plano
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active' && statusRef.current === 'running') {
        setGame((g) => (g.status === 'running' ? { ...g, status: 'paused' } : g));
      }
    });
    return () => sub.remove();
  }, []);

  // Loop do jogo
  useEffect(() => {
    if (game.status !== 'running') return;
    const id = setInterval(() => {
      setGame((g) => {
        if (g.status !== 'running') return g;
        const dir = dirQueue.current.shift() ?? currentDir.current;
        currentDir.current = dir;
        const { state, ate } = step(g, dir);
        if (ate) haptic();
        if (state.status === 'over') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        }
        return state;
      });
    }, tickInterval(game.score));
    return () => clearInterval(id);
  }, [game.status, game.score]);

  // Salva recorde ao terminar
  useEffect(() => {
    if (game.status === 'over' && game.score > highScore) {
      setHighScore(game.score);
      AsyncStorage.setItem(HIGH_SCORE_KEY, String(game.score)).catch(() => {});
    }
  }, [game.status, game.score, highScore]);

  // Botoes do console
  const onDirection = useCallback(
    (dir: Direction) => {
      haptic();
      queueDirection(dir);
    },
    [queueDirection],
  );

  // A: jogar / pausar / continuar
  const onA = useCallback(() => {
    haptic();
    const s = statusRef.current;
    if (s === 'ready' || s === 'over') startGame();
    else togglePause();
  }, [startGame, togglePause]);

  // B: pausa durante o jogo; fora dele, comeca uma partida nova
  const onB = useCallback(() => {
    haptic();
    if (statusRef.current === 'running') togglePause();
    else startGame();
  }, [startGame, togglePause]);

  // Swipe no LCD continua funcionando como atalho
  const anchor = useRef({ x: 0, y: 0 });
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          anchor.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        },
        onPanResponderMove: (_e, g) => {
          const dx = g.moveX - anchor.current.x;
          const dy = g.moveY - anchor.current.y;
          if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
          const dir: Direction =
            Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : dy > 0 ? 'DOWN' : 'UP';
          anchor.current = { x: g.moveX, y: g.moveY };
          queueDirection(dir);
        },
        onPanResponderRelease: (_e, g) => {
          // toque curto no LCD inicia o jogo quando parado
          if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) {
            if (statusRef.current === 'ready' || statusRef.current === 'over') startGame();
          }
        },
      }),
    [queueDirection, startGame],
  );

  const btn = Math.round(clamp(width * 0.16, 52, 64));
  const newRecord = game.status === 'over' && game.score > 0 && game.score >= highScore;

  return (
    <View
      style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 10 }]}
    >
      <StatusBar style="light" />

      <View style={styles.top}>
        <View style={[styles.bezel, { width: layout.bezelW }]}>
          <View style={styles.stats}>
            <Text style={styles.statText}>PONTOS {fmt(game.score)}</Text>
            <Text style={styles.statText}>RECORDE {fmt(highScore)}</Text>
          </View>

          <View style={styles.lcdFrame} {...panResponder.panHandlers}>
            <Board snake={game.snake} food={game.food} cols={COLS} rows={rows} cell={cell} />

            {game.status !== 'running' && (
              <View style={styles.overlay} pointerEvents="none">
                {game.status === 'ready' && (
                  <>
                    <Text style={styles.title}>COBRINHA</Text>
                    <Text style={styles.hint}>APERTE A PARA JOGAR</Text>
                  </>
                )}
                {game.status === 'paused' && (
                  <>
                    <Text style={styles.title}>PAUSADO</Text>
                    <Text style={styles.hint}>A CONTINUA  |  B REINICIA</Text>
                  </>
                )}
                {game.status === 'over' && (
                  <>
                    <Text style={styles.title}>FIM DE JOGO</Text>
                    <Text style={styles.hint}>PONTOS {fmt(game.score)}</Text>
                    {newRecord && <Text style={styles.hint}>NOVO RECORDE!</Text>}
                    <Text style={[styles.hint, { marginTop: 8 }]}>APERTE A</Text>
                  </>
                )}
              </View>
            )}
          </View>
        </View>

        <Text style={styles.brand}>COBRINHA</Text>
      </View>

      <View style={{ width: layout.bezelW, height: layout.controlsH }}>
        <View style={{ position: 'absolute', left: 6, top: 6 }}>
          <DPad size={layout.dpadSize} onPress={onDirection} />
        </View>

        <View style={[styles.ab, { top: 6 + (layout.dpadSize - (btn + 26)) / 2 }]}>
          <ActionButton label="B" size={btn} onPress={onB} />
          <ActionButton label="A" size={btn} onPress={onA} />
        </View>

        <View style={styles.pills}>
          <Pill label="SELECT" onPress={onB} />
          <Pill label="START" onPress={onA} />
        </View>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.body,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  top: { alignItems: 'center' },
  bezel: {
    backgroundColor: THEME.bezel,
    borderRadius: 22,
    paddingHorizontal: BEZEL_PAD_X,
    paddingTop: 12,
    paddingBottom: 18,
  },
  stats: {
    height: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statText: {
    color: THEME.bezelText,
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  lcdFrame: {
    alignSelf: 'center',
    borderWidth: LCD_BORDER,
    borderColor: THEME.lcdFrame,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: LCD.pale,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(155,188,15,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  title: {
    color: LCD.dark,
    fontFamily: MONO,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
  },
  hint: {
    color: LCD.dark,
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  brand: {
    marginTop: 10,
    height: 24,
    color: THEME.brand,
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 3,
  },
  ab: {
    position: 'absolute',
    right: 10,
    flexDirection: 'row',
    gap: 16,
  },
  pills: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
});
