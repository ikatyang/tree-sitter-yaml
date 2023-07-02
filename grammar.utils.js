// @ts-check

const { charset: _charset, Charset } = require('regexp-util')

/** @type {Map<RegExp, Charset>} */
const REGEX_TO_CHARSET = new Map()

/** @param {RegExp} regex */
const regexToCharset = regex => {
  const charset = REGEX_TO_CHARSET.get(regex)
  if (!charset) {
    throw new Error(`charset for '${regex}' not found`)
  }
  return charset
}

/** @param  {...(import('regexp-util').CharsetInput | RegExp)} args */
const charset = (...args) => {
  const inputs = args.map(_ => (_ instanceof RegExp ? regexToCharset(_) : _))
  const charset = _charset(...inputs)
  const regex = charset.toRegExp()
  REGEX_TO_CHARSET.set(regex, charset)
  return regex
}

/**
 * @param {RegExp} source
 * @param  {...(import('regexp-util').CharsetInput | RegExp)} targets
 */
const subtract = (source, ...targets) => {
  const inputs = targets.map(_ => (_ instanceof RegExp ? regexToCharset(_) : _))
  return charset(regexToCharset(source).subtract(...inputs))
}

const toRegExp = pattern => new RegExp(pattern, 'u')

/** @param {...RegExp} args */
const seq = (...args) => {
  return toRegExp(`${args.map(_ => _.source).join('')}`)
}

/** @param {...RegExp} args */
const choice = (...args) => {
  return toRegExp(`(${args.map(_ => _.source).join('|')})`)
}

/** @param {RegExp} regex */
const repeat = regex => toRegExp(`(${regex.source})*`)

/** @param {RegExp} regex @param  {number} times */
const repeatN = (regex, times) => toRegExp(`(${regex.source})*`)

// 5.1. Character Set

exports.C_PRINTABLE = charset(
  0x09,
  0x0a,
  0x0d,
  [0x20, 0x7e],
  0x85,
  [0xa0, 0xd7ff],
  [0xe000, 0xfffd],
  [0x010000, 0x10ffff],
)
exports.NB_JSON = charset(0x09, [0x20, 0x10ffff])

// 5.2. Character Encodings

exports.C_BYTE_ORDER_MARK = charset(0xfeff)

// 5.3. Indicator Characters

exports.C_SEQUENCE_ENTRY = charset('-')
exports.C_MAPPING_KEY = charset('?')
exports.C_MAPPING_VALUE = charset(':')
exports.C_COLLECT_ENTRY = charset(',')
exports.C_SEQUENCE_START = charset('[')
exports.C_SEQUENCE_END = charset(']')
exports.C_MAPPING_START = charset('{')
exports.C_MAPPING_END = charset('}')
exports.C_COMMENT = charset('#')
exports.C_ANCHOR = charset('&')
exports.C_ALIAS = charset('*')
exports.C_TAG = charset('!')
exports.C_LITERAL = charset('|')
exports.C_FOLDED = charset('>')
exports.C_SINGLE_QUOTE = charset("'")
exports.C_DOUBLE_QUOTE = charset('"')
exports.C_DIRECTIVE = charset('%')
exports.C_RESERVED = charset('@', '`')
exports.C_INDICATOR = charset(
  exports.C_SEQUENCE_ENTRY,
  exports.C_MAPPING_KEY,
  exports.C_MAPPING_VALUE,
  exports.C_COLLECT_ENTRY,
  exports.C_SEQUENCE_START,
  exports.C_SEQUENCE_END,
  exports.C_MAPPING_START,
  exports.C_MAPPING_END,
  exports.C_COMMENT,
  exports.C_ANCHOR,
  exports.C_ALIAS,
  exports.C_TAG,
  exports.C_LITERAL,
  exports.C_FOLDED,
  exports.C_SINGLE_QUOTE,
  exports.C_DOUBLE_QUOTE,
  exports.C_DIRECTIVE,
  exports.C_RESERVED,
)
exports.C_FLOW_INDICATOR = charset(
  exports.C_COLLECT_ENTRY,
  exports.C_SEQUENCE_START,
  exports.C_SEQUENCE_END,
  exports.C_MAPPING_START,
  exports.C_MAPPING_END,
)

// 5.4. Line Break Characters

exports.B_LINE_FEED = charset(0x0a)
exports.B_CARRIAGE_RETURN = charset(0x0d)
exports.B_CHAR = charset(exports.B_LINE_FEED, exports.B_CARRIAGE_RETURN)
exports.NB_CHAR = subtract(
  exports.C_PRINTABLE,
  exports.B_CHAR,
  exports.C_BYTE_ORDER_MARK,
)
exports.B_BREAK = choice(
  seq(exports.B_CARRIAGE_RETURN, exports.B_LINE_FEED),
  charset(exports.B_CARRIAGE_RETURN, exports.B_LINE_FEED),
)
exports.B_AS_LINE_FEED = exports.B_BREAK
exports.B_NON_CONTENT = exports.B_BREAK

// 5.5. White Space Characters

exports.S_SPACE = charset(0x20)
exports.S_TAB = charset(0x09)
exports.S_WHITE = charset(exports.S_SPACE, exports.S_TAB)
exports.NS_CHAR = subtract(exports.NB_CHAR, exports.S_WHITE)

// 5.6. Miscellaneous Characters

exports.NS_DEC_DIGIT = charset([0x30, 0x39])
exports.NS_HEX_DIGIT = charset(exports.NS_DEC_DIGIT, [0x41, 0x46], [0x61, 0x66])
exports.NS_ASCII_LETTER = charset([0x41, 0x5a], [0x61, 0x7a])
exports.NS_WORD_CHAR = charset(
  exports.NS_DEC_DIGIT,
  exports.NS_ASCII_LETTER,
  '-',
)
const NS_URI_CHAR_MULTI = seq(/%/, repeatN(exports.NS_HEX_DIGIT, 2))
const NS_URI_CHAR_SINGLE = charset(
  exports.NS_WORD_CHAR,
  '#',
  ';',
  '/',
  '?',
  ':',
  '@',
  '&',
  '=',
  '+',
  '$',
  ',',
  '_',
  '.',
  '!',
  '~',
  '*',
  "'",
  '(',
  ')',
  '[',
  ']',
)
exports.NS_URI_CHAR = choice(NS_URI_CHAR_MULTI, NS_URI_CHAR_SINGLE)
exports.NS_TAG_CHAR = choice(
  NS_URI_CHAR_MULTI,
  subtract(NS_URI_CHAR_SINGLE, exports.C_TAG, exports.C_FLOW_INDICATOR),
)

// 5.7. Escaped Characters

exports.C_ESCAPE = charset('\\')
exports.NS_ESC_NULL = charset('0')
exports.NS_ESC_BELL = charset('a')
exports.NS_ESC_BACKSPACE = charset('b')
exports.NS_ESC_HORIZONTAL_TAB = charset('t', 0x09)
exports.NS_ESC_LINE_FEED = charset('n')
exports.NS_ESC_VERTICAL_TAB = charset('b')
exports.NS_ESC_FORM_FEED = charset('f')
exports.NS_ESC_CARRIAGE_RETURN = charset('r')
exports.NS_ESC_ESCAPE = charset('e')
exports.NS_ESC_SPACE = charset(0x20)
exports.NS_ESC_DOUBLE_QUOTE = charset('"')
exports.NS_ESC_SLASH = charset('/')
exports.NS_ESC_BACKSLASH = charset('\\')
exports.NS_ESC_NEXT_LINE = charset('N')
exports.NS_ESC_NON_BREAKING_SPACE = charset('_')
exports.NS_ESC_LINE_SEPARATOR = charset('L')
exports.NS_ESC_PARAGRAPH_SEPARATOR = charset('P')
exports.NS_ESC_8_BIT = seq(/x/, repeatN(exports.NS_HEX_DIGIT, 2))
exports.NS_ESC_16_BIT = seq(/u/, repeatN(exports.NS_HEX_DIGIT, 4))
exports.NS_ESC_32_BIT = seq(/U/, repeatN(exports.NS_HEX_DIGIT, 8))
exports.C_NS_ESC_CHAR = seq(
  exports.C_ESCAPE,
  choice(
    exports.NS_ESC_NULL,
    exports.NS_ESC_BELL,
    exports.NS_ESC_BACKSPACE,
    exports.NS_ESC_HORIZONTAL_TAB,
    exports.NS_ESC_LINE_FEED,
    exports.NS_ESC_VERTICAL_TAB,
    exports.NS_ESC_FORM_FEED,
    exports.NS_ESC_CARRIAGE_RETURN,
    exports.NS_ESC_ESCAPE,
    exports.NS_ESC_SPACE,
    exports.NS_ESC_DOUBLE_QUOTE,
    exports.NS_ESC_SLASH,
    exports.NS_ESC_BACKSLASH,
    exports.NS_ESC_NEXT_LINE,
    exports.NS_ESC_NON_BREAKING_SPACE,
    exports.NS_ESC_LINE_SEPARATOR,
    exports.NS_ESC_PARAGRAPH_SEPARATOR,
    exports.NS_ESC_8_BIT,
    exports.NS_ESC_16_BIT,
    exports.NS_ESC_32_BIT,
  ),
)

// 6.9.2. Node Anchors

exports.NS_ANCHOR_CHAR = subtract(exports.NS_CHAR, exports.C_FLOW_INDICATOR)

// 7.3.1. Double-Quoted Style

const NB_DOUBLE_CHAR_MULTI = exports.C_NS_ESC_CHAR
const NB_DOUBLE_CHAR_SINGLE = subtract(
  exports.NB_JSON,
  exports.C_ESCAPE,
  exports.C_DOUBLE_QUOTE,
)
exports.NB_DOUBLE_CHAR = choice(NB_DOUBLE_CHAR_MULTI, NB_DOUBLE_CHAR_SINGLE)
const NS_DOUBLE_CHAR_MULTI = NB_DOUBLE_CHAR_MULTI
const NS_DOUBLE_CHAR_SINGLE = subtract(NB_DOUBLE_CHAR_SINGLE, exports.S_WHITE)
exports.NS_DOUBLE_CHAR = choice(NS_DOUBLE_CHAR_MULTI, NS_DOUBLE_CHAR_SINGLE)

// 7.3.2. Single-Quoted Style

exports.C_QUOTED_QUOTE = /''/
const NB_SINGLE_CHAR_MULTI = exports.C_QUOTED_QUOTE
const NB_SINGLE_CHAR_SINGLE = subtract(exports.NB_JSON, exports.C_SINGLE_QUOTE)
exports.NB_SINGLE_CHAR = choice(NB_SINGLE_CHAR_MULTI, NB_SINGLE_CHAR_SINGLE)
const NS_SINGLE_CHAR_MULTI = NB_SINGLE_CHAR_MULTI
const NS_SINGLE_CHAR_SINGLE = subtract(NB_SINGLE_CHAR_SINGLE, exports.S_WHITE)
exports.NS_SINGLE_CHAR = choice(NS_SINGLE_CHAR_MULTI, NS_SINGLE_CHAR_SINGLE)

// 7.3.3. Plain Style

exports.NS_PLAIN_FIRST = subtract(
  charset(
    exports.NS_CHAR,
    exports.C_MAPPING_KEY,
    exports.C_MAPPING_VALUE,
    exports.C_SEQUENCE_ENTRY,
  ),
  exports.C_INDICATOR,
  // TODO: lookahead
)
exports.NS_PLAIN_SAFE_OUT = exports.NS_CHAR
exports.NS_PLAIN_SAFE_IN = subtract(exports.NS_CHAR, exports.C_FLOW_INDICATOR)
exports.NS_PLAIN_CHAR_OUT = exports.NS_PLAIN_SAFE_OUT // TODO: lookaround
exports.NS_PLAIN_CHAR_IN = exports.NS_PLAIN_SAFE_IN // TODO: lookaround
