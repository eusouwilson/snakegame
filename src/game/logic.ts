export type Point = { x: number; y: number };
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Status = 'ready' | 'running' | 'paused' | 'over';

/**
 * Efeitos com tempo:
 *  slow   jogo mais devagar
 *  double cada comida vale 2
 *  ghost  atravessa as paredes
 *  magnet puxa a comida para a cobra
 */
export type TimedEffectType = 'slow' | 'double' | 'ghost' | 'magnet';

/**
 * Todos os itens que aparecem no tabuleiro. Alem dos efeitos com tempo:
 *  shield aguenta uma batida (desvia sozinho e some)
 *  shrink encolhe a cobra pela metade (minimo 3)
 *  bonus  +5 pontos na hora
 */
export type PowerUpType = TimedEffectType | 'shield' | 'shrink' | 'bonus';

export type PowerUp = { type: PowerUpType; pos: Point; ticksLeft: number };
export type ActiveEffect = { type: TimedEffectType; ticksLeft: number };

export type GameState = {
  cols: number;
  rows: number;
  snake: Point[]; // snake[0] e a cabeca
  direction: Direction;
  food: Point;
  score: number;
  status: Status;
  powerUp: PowerUp | null; // item no tabuleiro esperando ser pego
  active: ActiveEffect | null; // efeito com tempo em andamento
  shield: boolean; // escudo guardado (dura ate ser usado)
  nextPowerAt: number; // pontuacao em que aparece o proximo item
  lastPick: { type: PowerUpType; n: number } | null; // ultimo item pego (para avisos na tela)
};

export const POWER_UP_TYPES: PowerUpType[] = [
  'slow',
  'double',
  'ghost',
  'magnet',
  'shield',
  'shrink',
  'bonus',
];
export const POWER_UP_EVERY = 10; // um item a cada 10 pontos
export const POWER_UP_LIFETIME = 60; // passos que o item fica no tabuleiro
export const EFFECT_DURATION: Record<TimedEffectType, number> = {
  slow: 40,
  double: 60,
  ghost: 55,
  magnet: 50,
};
export const BONUS_POINTS = 5;
export const MIN_SNAKE_LENGTH = 3;
export const MAGNET_RANGE = 7; // distancia (em casas) em que o ima puxa a comida
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

const PERPENDICULAR: Record<Direction, [Direction, Direction]> = {
  UP: ['LEFT', 'RIGHT'],
  DOWN: ['LEFT', 'RIGHT'],
  LEFT: ['UP', 'DOWN'],
  RIGHT: ['UP', 'DOWN'],
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
    shield: false,
    nextPowerAt: POWER_UP_EVERY,
    lastPick: null,
  };
}

export type StepResult = {
  state: GameState;
  ate: boolean;
  picked: PowerUpType | null;
  shieldUsed: boolean;
};

const isOutside = (p: Point, cols: number, rows: number) =>
  p.x < 0 || p.y < 0 || p.x >= cols || p.y >= rows;

const wrap = (p: Point, cols: number, rows: number): Point => ({
  x: (p.x + cols) % cols,
  y: (p.y + rows) % rows,
});

/** Ima: a comida anda uma casa em direcao a proxima posicao da cabeca. */
function pullFood(food: Point, target: Point, state: GameState): Point {
  const dx = target.x - food.x;
  const dy = target.y - food.y;
  if (dx === 0 && dy === 0) return food;
  if (Math.abs(dx) + Math.abs(dy) > MAGNET_RANGE) return food;

  const options: Point[] = [];
  const stepX: Point = { x: food.x + Math.sign(dx), y: food.y };
  const stepY: Point = { x: food.x, y: food.y + Math.sign(dy) };
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx !== 0) options.push(stepX);
    if (dy !== 0) options.push(stepY);
  } else {
    if (dy !== 0) options.push(stepY);
    if (dx !== 0) options.push(stepX);
  }
  for (const c of options) {
    // a casa da proxima cabeca vale (a comida e "comida" ali); o resto nao pode ter cobra/item
    const blockedBySnake = !same(c, target) && state.snake.some((s) => same(s, c));
    const blockedByItem = state.powerUp !== null && same(state.powerUp.pos, c);
    if (!blockedBySnake && !blockedByItem) return c;
  }
  return food;
}

/** Escudo: escolhe uma direcao livre, preferindo virar para os lados. */
function safeDirection(
  state: GameState,
  current: Direction,
  ghost: boolean,
): { dir: Direction; next: Point } | null {
  const head = state.snake[0];
  const body = state.snake.slice(0, -1); // a cauda sai do lugar
  const sides = [...PERPENDICULAR[current]];
  if (Math.random() < 0.5) sides.reverse();
  for (const d of sides) {
    let n: Point = { x: head.x + VECTORS[d].x, y: head.y + VECTORS[d].y };
    if (isOutside(n, state.cols, state.rows)) {
      if (!ghost) continue;
      n = wrap(n, state.cols, state.rows);
    }
    if (!body.some((p) => same(p, n))) return { dir: d, next: n };
  }
  return null;
}

/** Avanca o jogo um passo na direcao informada. */
export function step(state: GameState, direction: Direction): StepResult {
  let dir = direction;
  const head = state.snake[0];
  let next: Point = { x: head.x + VECTORS[dir].x, y: head.y + VECTORS[dir].y };

  const ghost = state.active?.type === 'ghost';
  const outside = isOutside(next, state.cols, state.rows);
  if (outside && ghost) next = wrap(next, state.cols, state.rows); // reaparece do outro lado
  let hitWall = outside && !ghost;

  // Ima: a comida vem em direcao a cabeca
  let food = state.food;
  if (state.active?.type === 'magnet' && food.x !== -1) {
    food = pullFood(food, next, state);
  }

  let ate = same(next, food);
  // A cauda sai do lugar neste passo, a menos que a cobra coma
  let body = ate ? state.snake : state.snake.slice(0, -1);
  let hitSelf = body.some((p) => same(p, next));

  let shield = state.shield;
  let shieldUsed = false;
  if ((hitWall || hitSelf) && shield) {
    const alt = safeDirection(state, dir, ghost);
    if (alt) {
      shield = false;
      shieldUsed = true;
      dir = alt.dir;
      next = alt.next;
      hitWall = false;
      hitSelf = false;
      ate = same(next, food);
      body = ate ? state.snake : state.snake.slice(0, -1);
    }
  }

  if (hitWall || hitSelf) {
    return {
      state: { ...state, direction: dir, status: 'over' },
      ate: false,
      picked: null,
      shieldUsed: false,
    };
  }

  let snake = [next, ...body];
  let score = state.score + (ate ? (state.active?.type === 'double' ? 2 : 1) : 0);

  // Efeito em andamento: gasta um passo
  let active: ActiveEffect | null = state.active
    ? { ...state.active, ticksLeft: state.active.ticksLeft - 1 }
    : null;
  if (active && active.ticksLeft <= 0) active = null;

  // Item no tabuleiro: pegar aplica o efeito; senao envelhece ate sumir
  let powerUp: PowerUp | null = state.powerUp
    ? { ...state.powerUp, ticksLeft: state.powerUp.ticksLeft - 1 }
    : null;
  let picked: PowerUpType | null = null;
  if (powerUp && same(powerUp.pos, next)) {
    picked = powerUp.type;
    powerUp = null;
    switch (picked) {
      case 'shield':
        shield = true;
        break;
      case 'shrink':
        snake = snake.slice(0, Math.max(MIN_SNAKE_LENGTH, Math.ceil(snake.length / 2)));
        break;
      case 'bonus':
        score += BONUS_POINTS;
        break;
      default:
        active = { type: picked, ticksLeft: EFFECT_DURATION[picked] };
    }
  } else if (powerUp && powerUp.ticksLeft <= 0) {
    powerUp = null;
  }

  if (ate) {
    food = randomFood(state.cols, state.rows, snake, powerUp ? [powerUp.pos] : []);
  }

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
      direction: dir,
      food,
      score,
      powerUp,
      active,
      shield,
      nextPowerAt,
      lastPick: picked ? { type: picked, n: (state.lastPick?.n ?? 0) + 1 } : state.lastPick,
      status: filled ? 'over' : state.status,
    },
    ate,
    picked,
    shieldUsed,
  };
}

/** Intervalo do loop em ms: acelera conforme a pontuacao; o efeito "lento" alonga. */
export function tickInterval(score: number, slow = false): number {
  const base = Math.max(70, 170 - score * 4);
  return Math.round(slow ? base * SLOW_FACTOR : base);
}
