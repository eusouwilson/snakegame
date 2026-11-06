export type Point = { x: number; y: number };
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Status = 'ready' | 'running' | 'paused' | 'over';

export type GameState = {
  cols: number;
  rows: number;
  snake: Point[]; // snake[0] e a cabeca
  direction: Direction;
  food: Point;
  score: number;
  status: Status;
};

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

export function randomFood(cols: number, rows: number, snake: Point[]): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  const free: Point[] = [];
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  // Tabuleiro cheio: nao ha onde colocar comida
  if (free.length === 0) return { x: -1, y: -1 };
  return free[Math.floor(Math.random() * free.length)];
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
  };
}

export type StepResult = { state: GameState; ate: boolean };

/** Avanca o jogo um passo na direcao informada. */
export function step(state: GameState, direction: Direction): StepResult {
  const v = VECTORS[direction];
  const head = state.snake[0];
  const next: Point = { x: head.x + v.x, y: head.y + v.y };

  const hitWall = next.x < 0 || next.y < 0 || next.x >= state.cols || next.y >= state.rows;
  const ate = next.x === state.food.x && next.y === state.food.y;

  // A cauda sai do lugar neste passo, a menos que a cobra coma
  const body = ate ? state.snake : state.snake.slice(0, -1);
  const hitSelf = body.some((p) => p.x === next.x && p.y === next.y);

  if (hitWall || hitSelf) {
    return { state: { ...state, direction, status: 'over' }, ate: false };
  }

  const snake = [next, ...body];
  const score = ate ? state.score + 1 : state.score;
  const food = ate ? randomFood(state.cols, state.rows, snake) : state.food;
  const filled = food.x === -1;

  return {
    state: { ...state, snake, direction, food, score, status: filled ? 'over' : state.status },
    ate,
  };
}

/** Intervalo do loop em ms: acelera conforme a pontuacao. */
export function tickInterval(score: number): number {
  return Math.max(70, 170 - score * 4);
}
