export enum Context {
  None = 0,
  BlockIn = 1 << 0,
  BlockOut = 1 << 1,
  BlockKey = 1 << 2,
  FlowIn = 1 << 3,
  FlowOut = 1 << 4,
  FlowKey = 1 << 5,
  BlockValue = BlockIn | BlockOut,
  Block = BlockValue | BlockKey,
  FlowValue = FlowIn | FlowOut,
  Flow = FlowValue | FlowKey,
  Value = BlockValue | FlowValue,
  Key = BlockKey | FlowKey,
}

export const CONTEXT_ENTRIES: [Context, string][] = [
  [Context.BlockOut, 'BLOCK-OUT'],
  [Context.BlockIn, 'BLOCK-IN'],
  [Context.BlockKey, 'BLOCK-KEY'],
  [Context.FlowOut, 'FLOW-OUT'],
  [Context.FlowIn, 'FLOW-IN'],
  [Context.FlowKey, 'FLOW-KEY'],
]

export enum Chomping {
  None = 0,
  Strip = 1 << 0,
  Clip = 1 << 1,
  Keep = 1 << 2,
}

export const CHOMPING_ENTRIES: [Chomping, string][] = [
  [Chomping.Strip, 'STRIP'],
  [Chomping.Clip, 'CLIP'],
  [Chomping.Keep, 'KEEP'],
]

export interface Production {
  name: string
  derivations: Derivation[]
}
export function makeProduction(name: string, ...derivations: Derivation[]) {
  return { name, derivations }
}

export interface Derivation {
  node: AnyNode
  context: Context
  chomping: Chomping
}
export function makeDerivation(
  node: AnyNode,
  context = Context.None,
  chomping = Chomping.None,
): Derivation {
  return { node, context, chomping }
}

export enum Type {
  Charset = 'charset',
  Sequence = 'sequence',
  Repeat = 'repeat',
  Repeat1 = 'repeat-1',
  RepeatN = 'repeat-n',
  Optional = 'optional',
  Choice = 'choice',
  Subtract = 'subtract',
  Null = 'null',
  Alias = 'alias',
  External = 'external',
}

export type AnyNode =
  | Charset
  | Sequence
  | Repeat
  | Repeat1
  | RepeatN
  | Optional
  | Choice
  | Subtract
  | Null
  | Alias
  | External

export interface Node<T extends Type> {
  type: T
}

export interface Charset extends Node<Type.Charset> {
  ranges: [start: number, end: number][]
}
export function makeCharset(start?: number, end = start): Charset {
  return {
    type: Type.Charset,
    ranges: start === undefined || end === undefined ? [] : [[start, end]],
  }
}

export interface Sequence extends Node<Type.Sequence> {
  nodes: AnyNode[]
}
export function makeSequence(...nodes: AnyNode[]): Sequence {
  return { type: Type.Sequence, nodes }
}

export interface Repeat extends Node<Type.Repeat> {
  node: AnyNode
}
export function makeRepeat(node: AnyNode): Repeat {
  return { type: Type.Repeat, node }
}

export interface Repeat1 extends Node<Type.Repeat1> {
  node: AnyNode
}
export function makeRepeat1(node: AnyNode): Repeat1 {
  return { type: Type.Repeat1, node }
}

export interface RepeatN extends Node<Type.RepeatN> {
  node: AnyNode
  times: number
}
export function makeRepeatN(node: AnyNode, times: number): RepeatN {
  return { type: Type.RepeatN, node, times }
}

export interface Optional extends Node<Type.Optional> {
  node: AnyNode
}
export function makeOptional(node: AnyNode): Optional {
  return { type: Type.Optional, node }
}

export interface Choice extends Node<Type.Choice> {
  nodes: AnyNode[]
}
export function makeChoice(...nodes: AnyNode[]): Choice {
  return { type: Type.Choice, nodes }
}

export interface Subtract extends Node<Type.Subtract> {
  minuend: AnyNode
  subtrahend: AnyNode
}
export function makeSubtract(minuend: AnyNode, subtrahend: AnyNode): Subtract {
  return { type: Type.Subtract, minuend, subtrahend }
}

export interface External extends Node<Type.External> {
  name: string
}
export function makeExternal(name: string): External {
  return { type: Type.External, name }
}

export interface Null extends Node<Type.Null> {}
export function makeNull(): Null {
  return { type: Type.Null }
}

export interface Alias extends Node<Type.Alias> {
  name: string
  context: Context
  chomping: Chomping
}
export function makeAlias(
  name: string,
  context = Context.None,
  chomping = Chomping.None,
): Alias {
  return { type: Type.Alias, name, context, chomping }
}
