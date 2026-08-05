export type SwipeDirection = 'left' | 'right';
export type TouchGestureAction = 'next' | 'previous' | 'skip';

export interface GesturePoint {
  x: number;
  y: number;
  at: number;
}

export interface SwipeOptions {
  minDistance?: number;
  maxDurationMs?: number;
  minHorizontalRatio?: number;
}

export function detectHorizontalSwipe(
  start: GesturePoint,
  end: GesturePoint,
  options: SwipeOptions = {},
): SwipeDirection | undefined {
  const minDistance = options.minDistance ?? 72;
  const maxDurationMs = options.maxDurationMs ?? 700;
  const minHorizontalRatio = options.minHorizontalRatio ?? 1.4;
  const duration = end.at - start.at;
  if (duration < 0 || duration > maxDurationMs) return undefined;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const horizontal = Math.abs(dx);
  const vertical = Math.abs(dy);
  if (horizontal < minDistance) return undefined;
  if (vertical > 0 && horizontal / vertical < minHorizontalRatio) return undefined;
  return dx < 0 ? 'left' : 'right';
}

export function touchGestureAction(
  direction: SwipeDirection,
  sessionKind: 'learning' | 'exam',
  revealed: boolean,
): TouchGestureAction | undefined {
  if (sessionKind === 'exam') return direction === 'left' ? 'next' : 'previous';
  if (!revealed && direction === 'left') return 'skip';
  return undefined;
}
