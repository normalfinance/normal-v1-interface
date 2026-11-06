// ----------------------------------------------------------------------

export type Point = readonly [number, number];

/** Solves A·x = b by Gaussian elimination with partial pivoting. */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let k = col; k <= n; k += 1) M[r][k] -= f * M[col][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/**
 * The CSS `matrix3d(...)` that maps a `width` × `height` box, anchored at its
 * top-left corner, onto four points in its parent: top-left, top-right,
 * bottom-right, bottom-left. Used to lay real UI over the screen of a phone in
 * a photo. Needs `transform-origin: 0 0` on the element.
 */
export function matrix3dOnto(width: number, height: number, corners: readonly Point[]): string {
  const src: Point[] = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
  const A: number[][] = [];
  const b: number[] = [];
  src.forEach(([x, y], i) => {
    const [u, v] = corners[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  });
  const h = solve(A, b);
  const m = [h[0], h[3], 0, h[6], h[1], h[4], 0, h[7], 0, 0, 1, 0, h[2], h[5], 0, 1];
  return `matrix3d(${m.map((v) => v.toFixed(6)).join(',')})`;
}
