export function randomRange(
  min: number,
  max: number,
  inclusive = false,
): number {
  if (inclusive) {
    return Math.random() * (max - min + 1) + min;
  } else {
    return Math.random() * (max - min) + min;
  }
}
