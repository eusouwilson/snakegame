export type Point = { x: number; y: number };
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Status = 'ready' | 'running' | 'paused' | 'over';

/** lento: jogo mais devagar | double: cada comida vale 2 | ghost: atravessa as paredes */
export type PowerUpType = 'slow' | 'double' | 'ghost';

export type PowerUp = { type: PowerUpType; pos: Point; ticksLeft: number };
export type ActiveEffect = { type: PowerUpType; ticksLeft: number };

export type GameState = {
  cols: number;
  rows: number;
  snake: Point[]; // snake[0] e a cabeca
  direction: Direction;
  food: Point;
  score: number;
  status: Status;
  powerUp: PowerUp | null; // item no tabuleiro esperando ser pego
  active: ActiveEffect | null; // efeito em andamento
  nextPowerAt: number; // pontuacao em que aparece o proximo item
};

export const POWER_UP_TYPES: PowerUpType[] = ['slow', 'double', 'ghost'];
export const POWER_UP_EVERY = 10; // um item a cada 10 pontos
export const POWER_UP_LIFETIME = 60; // passos que o item fica no tabuleiro
export const EFFECT_DURATION: Record<PowerUpType, number> = {
  slow: 40,
  double: 60,
  ghost: 55,
};
const SLOW_FACTOR = 1.7;

const VECTORS: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

export function isOpposite(a: Direction, b: Direction): boolean {
  return OPPOSITE[a] === b;
}

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

function freeCells(cols: number, rows: number, blocked: Point[]): Point[] {
  const occupied = new Set(blocked.map((p) => `${p.x},${p.y}`));
  const free: Point[] = [];
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  return free;
}

/** Sorteia uma celula livre; `avoid` sao celulas extras a evitar (ex.: power-up). */
export function randomFood(
  cols: number,
  rows: number,
  snake: Point[],
  avoid: Point[] = [],
): Point {
  const free = freeCells(cols, rows, [...snake, ...avoid]);
  // Tabuleiro cheio: nao ha onde colocar comida
  if (free.length === 0) return { x: -1, y: -1 };
  return free[Math.floor(Math.random() * free.length)];
}

function spawnPowerUp(cols: number, rows: number, snake: Point[], food: Point): PowerUp | null {
  const free = freeCells(cols, rows, [...snake, food]);
  if (free.length === 0) return null;
  const pos = free[Math.floor(Math.random() * free.length)];
  const type = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
  return { type, pos, ticksLeft: POWER_UP_LIFETIME };
}

export function createInitialState(cols: number, rows: number): GameState {
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const snake: Point[] = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  return {
    cols,
    rows,
    snake,
    direction: 'RIGHT',
    food: randomFood(cols, rows, snake),
    score: 0,
    status: 'ready',
    powerUp: null,
    active: null,
    nextPowerAt: POWER_UP_EVERY,
  };
}

export type StepResult = {
  state: GameState;
  ate: boolean;
  picked: PowerUpType | null;
};

/** Avanca o jogo um passo na direcao informada. */
export function step(state: GameState, direction: Direction): StepResult {
  const v = VECTORS[direction];
  const head = state.snake[0];
  let next: Point = { x: head.x + v.x, y: head.y + v.y };

  const ghost = state.active?.type === 'ghost';
  const outside = next.x < 0 || next.y < 0 || next.x >= state.cols || next.y >= state.rows;
  if (outside && ghost) {
    // fantasma: reaparece do outro lado do tabuleiro
    next = {
      x: (next.x + state.cols) % state.cols,
      y: (next.y + state.rows) % state.rows,
    };
  }
  const hitWall = outside && !ghost;
  const ate = same(next, state.food);

  // A cauda sai do lugar neste passo, a menos que a cobra coma
  const body = ate ? state.snake : state.snake.slice(0, -1);
  const hitSelf = body.some((p) => same(p, next));

  if (hitWall || hitSelf) {
    return { state: { ...state, direction, status: 'over' }, ate: false, picked: null };
  }

  const snake = [next, ...body];
  const points = ate ? (state.active?.type === 'double' ? 2 : 1) : 0;
  const score = state.score + points;

  // Efeito em andamento: gasta um passo
  let active: ActiveEffect | null = state.active
    ? { ...state.active, ticksLeft: state.active.ticksLeft - 1 }
    : null;
  if (active && active.ticksLeft <= 0) active = null;

  // Item no tabuleiro: pegar ativa o efeito; senao envelhece ate sumir
  let powerUp: PowerUp | null = state.powerUp
    ? { ...state.powerUp, ticksLeft: state.powerUp.ticksLeft - 1 }
    : null;
  let picked: PowerUpType | null = null;
  if (powerUp && same(powerUp.pos, next)) {
    picked = powerUp.type;
    active = { type: picked, ticksLeft: EFFECT_DURATION[picked] };
    powerUp = null;
  } else if (powerUp && powerUp.ticksLeft <= 0) {
    powerUp = null;
  }

  const food = ate
    ? randomFood(state.cols, state.rows, snake, powerUp ? [powerUp.pos] : [])
    : state.food;

  // Novo item a cada 10 pontos (nao empilha: se ainda ha um no tabuleiro, pula)
  let nextPowerAt = state.nextPowerAt;
  if (score >= nextPowerAt) {
    nextPowerAt = (Math.floor(score / POWER_UP_EVERY) + 1) * POWER_UP_EVERY;
    if (!powerUp) powerUp = spawnPowerUp(state.cols, state.rows, snake, food);
  }

  const filled = food.x === -1;

  return {
    state: {
      ...state,
      snake,
      direction,
      food,
      score,
      powerUp,
      active,
      nextPowerAt,
      status: filled ? 'over' : state.status,
    },
    ate,
    picked,
  };
}

/** Intervalo do loop em ms: acelera conforme a pontuacao; o efeito "lento" alonga. */
export function tickInterval(score: number, slow = false): number {
  const base = Math.max(70, 170 - score * 4);
  return Math.round(slow ? base * SLOW_FACTOR : base);
}
