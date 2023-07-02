import assert from 'node:assert'
import {
  AnyNode,
  CHOMPING_ENTRIES,
  CONTEXT_ENTRIES,
  Charset,
  Chomping,
  Context,
  Derivation,
  Production,
  Type,
  makeAlias,
  makeCharset,
  makeChoice,
  makeDerivation,
  makeExternal,
  makeNull,
  makeOptional,
  makeProduction,
  makeRepeat,
  makeRepeat1,
  makeRepeatN,
  makeSequence,
  makeSubtract,
} from './ir.mjs'

const PATTERN_TERMINAL =
  /^(x[0-9A-F]+|\[x[0-9A-F]+-x[0-9A-F]+\]|'[^']+'|"[^"]*"|<[^>]+>|[a-z0-9]([a-z0-9-+]*[a-z0-9])?(\([^)]+\)+)?)/
const PATTERN_PREFIX = /^[(]/
const PATTERN_POSTFIX = /^([)?*+]|\{\d\})/
const PATTERN_INFIX = /^[|-]/
const PATTERNS = [
  PATTERN_TERMINAL,
  PATTERN_PREFIX,
  PATTERN_POSTFIX,
  PATTERN_INFIX,
]

export interface ParseSpecOptions {
  externalProductions?: string[]
}
export function parseSpec(text: string, options: ParseSpecOptions = {}) {
  const productions: Production[] = []
  for (const [, production] of text.matchAll(/```\n\[#\]([^]+?)\n```/g)) {
    console.log('='.repeat(80))
    console.log(production)
    console.log('-'.repeat(80))
    const parsed = parseProduction(production, options)
    productions.push(parsed)
    console.log(JSON.stringify(parsed, null, 2))
  }
  return productions
}

function parseProduction(text: string, options?: ParseSpecOptions): Production {
  text = removeTrailingComments(text)
  text = removeInlineComments(text)
  text = removeLookarounds(text)
  text = text.trim()
  const [, name] = text.match(/^([a-z0-9-+]+)/)!
  if (options?.externalProductions?.includes(name)) {
    return makeProduction(name, makeDerivation(makeExternal(name)))
  }
  const hasContextOrChomping = text.split('::=').length > 2
  if (hasContextOrChomping) {
    const lines = text.split('\n')
    assert(
      lines.every(_ => _.includes('::=')),
      `unexpected '::=' in ${name}`,
    )
    const derivations: Derivation[] = []
    for (const [lhs, rhs] of lines.map(_ => _.split('::='))) {
      const { context, chomping } = extractContextAndChomping(lhs)
      derivations.push(makeDerivation(parse(rhs), context, chomping))
    }
    return makeProduction(name, ...derivations)
  }
  const [, rhs] = text.split('::=')
  return makeProduction(name, makeDerivation(parse(rhs)))
}

function scan(text: string, tokens: string[]) {
  if (text.length === 0) {
    return
  }
  for (const pattern of PATTERNS) {
    const token = text.match(pattern)?.[0]
    if (token) {
      tokens.push(token)
      return scan(text.slice(token.length), tokens)
    }
  }
  return scan(text.trimStart(), tokens)
}

function parse(text: string): AnyNode {
  const tokens: string[] = []
  scan(text, tokens)
  const stack: AnyNode[][] = [[]]
  const flushes: Array<(a: AnyNode, b: AnyNode) => AnyNode> = []
  tokens.reverse()
  while (tokens.length) {
    const token = tokens.pop()!
    switch (token[0]) {
      // terminal
      case 'x': {
        const start = parseInt(token.slice(1), 16)
        onTerminal(makeCharset(start))
        break
      }
      case '[': {
        const [start, end] = token
          .slice(1, -1)
          .split('-')
          .map(_ => parseInt(_.slice(1), 16))
        onTerminal(makeCharset(start, end))
        break
      }
      case "'": {
        const start = token.charCodeAt(1)
        onTerminal(makeCharset(start))
        break
      }
      case '"': {
        const nodes: Charset[] = []
        for (let i = 1; i < token.length - 1; i++) {
          nodes.push(makeCharset(token.charCodeAt(i)))
        }
        switch (nodes.length) {
          case 0:
            onTerminal(makeNull())
            break
          case 1:
            onTerminal(nodes[0])
            break
          default:
            onTerminal(makeSequence(...nodes))
            break
        }
        break
      }
      case '<':
        onTerminal(makeExternal(token.slice(1, -1)))
        break
      default: {
        const [name] = token.split('(')
        const { context, chomping } = extractContextAndChomping(token)
        onTerminal(makeAlias(name, context, chomping))
        break
      }
      // prefix
      case '(':
        onLeftParen()
        break
      // postfix
      case ')':
        onRightParen()
        break
      case '?':
        onModifier(node => makeOptional(node))
        break
      case '*':
        onModifier(node => makeRepeat(node))
        break
      case '+':
        onModifier(node => makeRepeat1(node))
        break
      case '{': {
        const times = parseInt(token.slice(1, -1))
        onModifier(node => makeRepeatN(node, times))
        break
      }
      // infix
      case '|':
        onOperator((a, b) => makeChoice(a, b))
        break
      case '-':
        onOperator((a, b) => makeSubtract(a, b))
        break
    }
  }
  onEnd()

  return normalize(makeSequence(...stack.pop()!))

  function onTerminal(node: AnyNode) {
    reduce()
    stack[stack.length - 1].push(node)
  }

  function onLeftParen() {
    reduce()
    stack.push([])
  }

  function onRightParen() {
    reduce()
    const nodes = stack.pop()!
    stack[stack.length - 1].push(makeSequence(...nodes))
  }

  function onModifier(fn: (node: AnyNode) => AnyNode) {
    const node = stack[stack.length - 1].pop()!
    stack[stack.length - 1].push(fn(node))
  }

  function onOperator(fn: (a: AnyNode, b: AnyNode) => AnyNode) {
    reduce()
    flushes.push(fn)
  }

  function onEnd() {
    reduce()
  }

  function reduce() {
    while (stack[stack.length - 1].length >= 2) {
      const b = stack[stack.length - 1].pop()!
      const a = stack[stack.length - 1].pop()!
      const flush = flushes.pop() ?? makeSequence
      stack[stack.length - 1].push(flush(a, b))
    }
  }
}

function normalize(node: AnyNode): AnyNode {
  switch (node.type) {
    case Type.Charset:
      return node
    case Type.Sequence: {
      const nodes = node.nodes.flatMap(_ => {
        const normalized = normalize(_)
        return normalized.type === Type.Sequence ? normalized.nodes : normalized
      })
      return nodes.length === 1 ? nodes[0] : makeSequence(...nodes)
    }
    case Type.Repeat:
      return makeRepeat(normalize(node.node))
    case Type.Repeat1:
      return makeRepeat1(normalize(node.node))
    case Type.RepeatN:
      return makeRepeatN(normalize(node.node), node.times)
    case Type.Optional:
      return makeOptional(normalize(node.node))
    case Type.Repeat1:
      return makeRepeat1(normalize(node.node))
    case Type.Choice: {
      const nodes = node.nodes.flatMap(_ => {
        const normalized = normalize(_)
        return normalized.type === Type.Choice ? normalized.nodes : normalized
      })
      const charset = makeCharset()
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i]
        if (node.type === Type.Charset) {
          charset.ranges.push(...node.ranges)
          nodes.splice(i, 1)
        }
      }
      if (charset.ranges.length) {
        nodes.push(charset)
      }
      return nodes.length === 1 ? nodes[0] : makeChoice(...nodes)
    }
    case Type.Subtract: {
      const [minuend, subtrahend] = [node.minuend, node.subtrahend] //
        .map(normalize)
      if (minuend.type === Type.Charset && subtrahend.type === Type.Charset) {
        const charset = makeCharset()
        for (const [start, end] of minuend.ranges) {
          charset.ranges.push([start, end])
        }
        for (const [subtrahendStart, subtrahendEnd] of subtrahend.ranges) {
          for (let i = charset.ranges.length - 1; i >= 0; i--) {
            const [minuendStart, minuendEnd] = charset.ranges[i]
            if (subtrahendStart > minuendEnd || subtrahendEnd < minuendStart) {
              continue
            }
            if (minuendStart < subtrahendStart && subtrahendEnd < minuendEnd) {
              charset.ranges[i] = [minuendStart, subtrahendStart - 1]
              charset.ranges.push([subtrahendEnd + 1, minuendEnd])
              continue
            }
            if (minuendStart < subtrahendStart) {
              charset.ranges[i] = [minuendStart, subtrahendStart - 1]
              continue
            }
            if (subtrahendEnd < minuendEnd) {
              charset.ranges[i] = [subtrahendEnd + 1, minuendEnd]
              continue
            }
            charset.ranges.splice(i, 1)
          }
        }
        return charset
      }
      return makeSubtract(minuend, subtrahend)
    }
    case Type.Null:
      return node
    case Type.Alias:
      return node
    case Type.External:
      return node
  }
}

function extractContextAndChomping(text: string) {
  let context = Context.None
  let chomping = Chomping.None
  for (const [key, value] of CONTEXT_ENTRIES) {
    if (text.includes(value)) {
      context |= key
    }
  }
  for (const [key, value] of CHOMPING_ENTRIES) {
    if (text.includes(value)) {
      chomping |= key
    }
  }
  return { context, chomping }
}

function removeTrailingComments(text: string) {
  return text.replace(/\n? +#.+$/gm, '')
}

function removeInlineComments(text: string) {
  return text.replace(/\n? *\/\*[^]*\*\/ */g, '')
}

function removeLookarounds(text: string) {
  return text.replace(/\n? *\[ (lookahead|lookbehind) [^\]]+\]$/gm, '')
}
