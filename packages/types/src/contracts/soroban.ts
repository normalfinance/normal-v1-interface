export type SorobanPrimitive =
  | { i128: string }
  | { u128: string }
  | { i64: string }
  | { u64: string }
  | { i32: string }
  | { u32: string }
  | { bool: boolean }
  | { address: string }
  | { symbol: string }
  | { string: string }
  | { vec: Array<SorobanPrimitive> };
