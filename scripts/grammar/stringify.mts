import assert from 'node:assert'
import { AnyNode, Type } from './ir.mjs'

export function stringify(node: AnyNode): string {
  switch (node.type) {
    case Type.Charset:
      return [
        '/[',
        ...node.ranges.map(([start, end]) =>
          start === end
            ? `\\u{${start.toString(16)}}`
            : `\\u{${start.toString(16)}}-\\u{${end.toString(16)}}`,
        ),
        ']/u',
      ].join('')
    case Type.Sequence:
      return `seq(${node.nodes.map(stringify).join(', ')})`
    case Type.Repeat:
      return `repeat(${stringify(node.node)})`
    case Type.Repeat1:
      return `repeat1(${stringify(node.node)})`
    case Type.RepeatN: {
      const stringified = stringify(node.node)
      return `seq(${new Array(node.times).fill(stringified).join(', ')})`
    }
    case Type.Optional:
      return `optional(${stringify(node.node)})`
    case Type.Choice:
      return `seq(${node.nodes.map(stringify).join(', ')})`
    case Type.Subtract:
      // assert('unexpected subtract node')
      return 'TODO'
    case Type.Null:
      // assert('unexpected null node')
      return 'TODO'
    case Type.Alias:
      // TODO
      return `$._${makeName(node.name)}`
    case Type.External:
      // TODO
      return `$._${makeName(node.name)}`
  }
}

function makeName(name: string) {
  return name.replaceAll('-', '_').replaceAll('+', '$')
}
