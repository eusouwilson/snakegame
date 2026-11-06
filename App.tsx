import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createInitialState,
  Direction,
  GameState,
  isOpposite,
  step,
  tickInterval,
} from './src/game/logic';

const COLS = 16;
const ROWS = 22;
const HIGH_SCORE_KEY = 'snake:highScore';
const SWIPE_THRESHOLD = 18;

const COLORS = {
  bg: '#0F1B14',
  board: '#16281D',
  gridLine: '#1B3224',
  snakeHead: '#7CFC9A',
  snakeBody: '#3DBE63',
  food: '#FF5C5C',
  text: '#E8F5EC',
  muted: '#8FB59C',
  accent: '#3DBE63',
};

function safeHaptic(fn: () => Promise<void>) {
  fn().catch(() => {});
}

function Game() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Tamanho da celula calculado para o tabuleiro caber na tela
  const cell = useMemo(() => {
    const maxW = width - 24;
    const maxH = height - insets.top - insets.bottom - 190;
    return Math.max(10, Math.floor(Math.min(maxW / COLS, maxH / ROWS)));
  }, [width, height, insets.top, insets.bottom]);

  const [game, setGame] = useState<GameState>(() => createInitialState(COLS, ROWS));
  const [highScore, setHighScore] = useState(0);

  // Fila de direcoes evita inverter 180 graus com dois swipes rapidos
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
    const fresh = createInitialState(COLS, ROWS);
    dirQueue.current = [];
    currentDir.current = fresh.direction;
    setGame({ ...fresh, status: 'running' });
  }, []);

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

  // Loop do jogo
  useEffect(() => {
    if (game.status !== 'running') return;
    const id = setInterval(() => {
      setGame((g) => {
        if (g.status !== 'running') return g;
        const dir = dirQueue.current.shift() ?? currentDir.current;
        currentDir.current = dir;
        const { state, ate } = step(g, dir);
        if (ate) safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
        if (state.status === 'over') {
          safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
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

  // Gesto de swipe: a cada deslocamento acima do limite troca a direcao e
  // reposiciona a ancora, permitindo varios swipes sem tirar o dedo
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
          // toque curto sem movimento: inicia o jogo quando parado
          if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) {
            if (statusRef.current === 'ready' || statusRef.current === 'over') startGame();
          }
        },
      }),
    [queueDirection, startGame],
  );

  const boardW = cell * COLS;
  const boardH = cell * ROWS;
  const overlayVisible = game.status !== 'running';

  return (
    <View
      style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}
      {...panResponder.panHandlers}
    >
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>PONTOS</Text>
          <Text style={styles.statValue}>{game.score}</Text>
        </View>
        <Pressable
          onPress={togglePause}
          disabled={game.status !== 'running' && game.status !== 'paused'}
          style={[styles.pauseBtn, game.status === 'ready' || game.status === 'over' ? { opacity: 0.4 } : null]}
          hitSlop={10}
        >
          <Text style={styles.pauseText}>{game.status === 'paused' ? 'Continuar' : 'Pausar'}</Text>
        </Pressable>
        <View style={[styles.stat, { alignItems: 'flex-end' }]}>
          <Text style={styles.statLabel}>RECORDE</Text>
          <Text style={styles.statValue}>{highScore}</Text>
        </View>
      </View>

      <View style={[styles.board, { width: boardW, height: boardH }]}>
        <View
          style={[
            styles.cellBox,
            {
              left: game.food.x * cell + cell * 0.12,
              top: game.food.y * cell + cell * 0.12,
              width: cell * 0.76,
              height: cell * 0.76,
              borderRadius: cell,
              backgroundColor: COLORS.food,
            },
          ]}
        />
        {game.snake.map((p, i) => (
          <View
            key={i === 0 ? 'head' : `${i}`}
            style={[
              styles.cellBox,
              {
                left: p.x * cell + 1,
                top: p.y * cell + 1,
                width: cell - 2,
                height: cell - 2,
                borderRadius: i === 0 ? cell * 0.4 : cell * 0.28,
                backgroundColor: i === 0 ? COLORS.snakeHead : COLORS.snakeBody,
              },
            ]}
          />
        ))}

        {overlayVisible && (
          <View style={styles.overlay} pointerEvents="box-none">
            {game.status === 'ready' && (
              <>
                <Text style={styles.title}>Cobrinha</Text>
                <Text style={styles.hint}>Deslize na tela para virar</Text>
              </>
            )}
            {game.status === 'paused' && <Text style={styles.title}>Pausado</Text>}
            {game.status === 'over' && (
              <>
                <Text style={styles.title}>Fim de jogo</Text>
                <Text style={styles.hint}>
                  {game.score >= highScore && game.score > 0 ? 'Novo recorde! ' : ''}Pontos: {game.score}
                </Text>
              </>
            )}
            {(game.status === 'ready' || game.status === 'over') && (
              <Pressable onPress={startGame} style={styles.playBtn}>
                <Text style={styles.playText}>{game.status === 'over' ? 'Jogar de novo' : 'Jogar'}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      <Text style={styles.footer}>Deslize em qualquer lugar da tela</Text>
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
    backgroundColor: COLORS.bg,
    alignItems: 'center',
  },
  header: {
    width: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stat: { minWidth: 80 },
  statLabel: { color: COLORS.muted, fontSize: 11, letterSpacing: 1.2, fontWeight: '600' },
  statValue: { color: COLORS.text, fontSize: 26, fontWeight: '800' },
  pauseBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  pauseText: { color: COLORS.accent, fontWeight: '700' },
  board: {
    backgroundColor: COLORS.board,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gridLine,
    overflow: 'hidden',
  },
  cellBox: { position: 'absolute' },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15,27,20,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  title: { color: COLORS.text, fontSize: 34, fontWeight: '900' },
  hint: { color: COLORS.muted, fontSize: 16 },
  playBtn: {
    marginTop: 8,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 28,
  },
  playText: { color: '#06220F', fontWeight: '800', fontSize: 18 },
  footer: { color: COLORS.muted, marginTop: 12, fontSize: 12 },
});
