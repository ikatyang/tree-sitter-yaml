import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSpec } from './parse.mjs'
import { stringify } from './stringify.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SPEC_FILENAME = resolve(__dirname, '../../yaml-spec/spec/1.2.2/spec.md')

const EXTERNAL_PRODUCTIONS = [
  's-indent',
  's-indent-less-than',
  's-indent-less-or-equal',
]

const productions = parseSpec(await readFile(SPEC_FILENAME, 'utf8'), {
  externalProductions: EXTERNAL_PRODUCTIONS,
})

for (const production of productions) {
  console.log(
    `'${production.name}': $ => ${stringify(production.derivations[0].node)}`,
  )
}
