// @ts-check

/// <reference path="./tree-sitter/cli/npm/dsl.d.ts" />

const {
  B_NON_CONTENT,
  B_AS_LINE_FEED,
  B_BREAK,
  S_WHITE,
  C_DIRECTIVE,
  NS_CHAR,
  NS_DEC_DIGIT,
  C_TAG,
  NS_WORD_CHAR,
  NS_URI_CHAR,
  NS_TAG_CHAR,
  C_ANCHOR,
  NS_ANCHOR_CHAR,
  C_COMMENT,
  NB_CHAR,
  C_ALIAS,
  C_DOUBLE_QUOTE,
  NB_DOUBLE_CHAR,
  C_ESCAPE,
  NS_DOUBLE_CHAR,
  C_SINGLE_QUOTE,
  NB_SINGLE_CHAR,
  NS_SINGLE_CHAR,
  NS_PLAIN_CHAR_OUT,
  NS_PLAIN_CHAR_IN,
  NS_PLAIN_FIRST,
  C_SEQUENCE_START,
  C_SEQUENCE_END,
  C_COLLECT_ENTRY,
} = require('./grammar.utils')

module.exports = grammar({
  name: 'yaml',

  externals: $ => [
    // 4.1. Production Syntax

    $._start_of_line,
    $._end_of_input,
    $._empty,

    // 6.1. Indentation Spaces

    $._s_indent,
    $._s_indent_less_than,
    $._s_indent_less_or_equal,
  ],

  // conflicts: $ => [[$._b_as_space, $._b_l_flow_trimmed]], TODO

  extras: $ => [],

  rules: {
    stream: $ => TODO,

    // 6.2. Separation Spaces

    _s_separate_in_line: $ => choice(token(repeat1(S_WHITE)), $._start_of_line),

    // 6.3. Line Prefixes

    _s_block_line_prefix: $ => $._s_indent,
    _s_flow_line_prefix: $ => seq($._s_indent, $._s_separate_in_line),

    // 6.4. Empty Lines

    _l_block_empty: $ =>
      seq(
        choice($._s_block_line_prefix, $._s_indent_less_than),
        B_AS_LINE_FEED, //
      ),
    _l_flow_empty: $ =>
      seq(
        choice($._s_flow_line_prefix, $._s_indent_less_than),
        B_AS_LINE_FEED, //
      ),

    // 6.5. Line Folding

    _b_l_block_trimmed: $ => seq(B_NON_CONTENT, $._l_block_empty),
    _b_l_flow_trimmed: $ => seq(B_NON_CONTENT, $._l_flow_empty),
    _b_as_space: $ => B_BREAK,
    _b_l_block_folded: $ => choice($._b_l_block_trimmed, $._b_as_space),
    _b_l_flow_folded: $ => choice($._b_l_flow_trimmed, $._b_as_space),
    _s_flow_folded: $ =>
      seq(
        optional($._s_separate_in_line),
        $._b_l_flow_folded,
        $._s_flow_line_prefix,
      ),

    // 6.6. Comments

    _c_nb_comment_text: $ => seq(C_COMMENT, optional(token(repeat1(NB_CHAR)))),
    _b_comment: $ => choice(B_NON_CONTENT, $._end_of_input),
    _s_b_comment: $ =>
      seq(
        optional(seq($._s_separate_in_line, optional($._c_nb_comment_text))),
        $._b_comment,
      ),
    _l_comment: $ =>
      seq($._s_separate_in_line, optional($._c_nb_comment_text), $._b_comment),
    _s_l_comments: $ =>
      seq(choice($._s_b_comment, $._start_of_line), repeat($._l_comment)),

    // 6.7. Separation Lines

    _s_value_separate: $ => $._s_separate_lines,
    _s_key_separate: $ => $._s_separate_in_line,
    _s_separate_lines: $ =>
      choice(
        seq($._s_l_comments, $._s_flow_line_prefix),
        $._s_separate_in_line,
      ),

    // 6.8. Directives

    _l_directive: $ =>
      seq(
        C_DIRECTIVE,
        choice(
          $._ns_yaml_directive,
          $._ns_tag_directive,
          $._ns_reserved_directive,
        ),
        $._s_l_comments,
      ),
    _ns_reserved_directive: $ =>
      seq(
        $._ns_directive_name,
        repeat(seq($._s_separate_in_line, $._ns_directive_parameter)),
      ),
    _ns_directive_name: $ => token(repeat1(NS_CHAR)),
    _ns_directive_parameter: $ => token(repeat1(NS_CHAR)),

    // 6.8.1. "YAML" Directives

    _ns_yaml_directive: $ =>
      seq('YAML', $._s_separate_in_line, $._ns_yaml_version),
    _ns_yaml_version: $ =>
      seq(token(repeat1(NS_DEC_DIGIT)), '.', token(repeat1(NS_DEC_DIGIT))),

    // 6.8.2. "TAG" Directives

    _ns_tag_directive: $ =>
      seq(
        'TAG',
        $._s_separate_in_line,
        $._c_tag_handle,
        $._s_separate_in_line,
        $._ns_tag_prefix,
      ),

    // 6.8.2.1. Tag Handles

    _c_tag_handle: $ =>
      choice(
        $._c_named_tag_handle,
        $._c_secondary_tag_handle,
        $._c_primary_tag_handle,
      ),
    _c_primary_tag_handle: $ => '!',
    _c_secondary_tag_handle: $ => '!!',
    _c_named_tag_handle: $ => seq(C_TAG, token(repeat1(NS_WORD_CHAR)), C_TAG),

    // 6.8.2.2. Tag Prefixes

    _ns_tag_prefix: $ =>
      choice($._c_ns_local_tag_prefix, $._ns_global_tag_prefix),
    _c_ns_local_tag_prefix: $ =>
      seq(C_TAG, optional(token(repeat1(NS_URI_CHAR)))),
    _ns_global_tag_prefix: $ =>
      seq(NS_TAG_CHAR, optional(token(repeat1(NS_URI_CHAR)))),

    // 6.9. Node Properties

    _c_ns_value_properties: $ =>
      choice(
        seq(
          $._c_ns_tag_property,
          optional(seq($._s_value_separate, $._c_ns_anchor_property)),
        ),
        seq(
          $._c_ns_anchor_property,
          optional(seq($._s_value_separate, $._c_ns_tag_property)),
        ),
      ),
    _c_ns_key_properties: $ =>
      choice(
        seq(
          $._c_ns_tag_property,
          optional(seq($._s_key_separate, $._c_ns_anchor_property)),
        ),
        seq(
          $._c_ns_anchor_property,
          optional(seq($._s_key_separate, $._c_ns_tag_property)),
        ),
      ),

    // 6.9.1. Node Tags

    _c_ns_tag_property: $ =>
      choice($._c_verbatim_tag, $._c_ns_shorthand_tag, $._c_non_specific_tag),
    _c_verbatim_tag: $ => seq('!<', token(repeat1(NS_URI_CHAR)), '>'),
    _c_ns_shorthand_tag: $ => seq($._c_tag_handle, token(repeat1(NS_TAG_CHAR))),
    _c_non_specific_tag: $ => '!',

    // 6.9.2. Node Anchors

    _c_ns_anchor_property: $ => seq(C_ANCHOR, $._ns_anchor_name),
    _ns_anchor_name: $ => token(repeat1(NS_ANCHOR_CHAR)),

    // 7.1. Alias Nodes

    _c_ns_alias_node: $ => seq(C_ALIAS, $._ns_anchor_name),

    // 7.2. Empty Nodes

    _e_scalar: $ => $._empty,
    _e_node: $ => $._e_scalar,

    // 7.3.1. Double-Quoted Style

    _c_value_double_quoted: $ =>
      seq(C_DOUBLE_QUOTE, $._nb_value_double_text, C_DOUBLE_QUOTE),
    _c_key_double_quoted: $ =>
      seq(C_DOUBLE_QUOTE, $._nb_key_double_text, C_DOUBLE_QUOTE),
    _nb_value_double_text: $ => $._nb_double_multi_line,
    _nb_key_double_text: $ => $._nb_double_one_line,
    _nb_double_one_line: $ => choice($._empty, token(repeat1(NB_DOUBLE_CHAR))),
    _s_double_escaped: $ =>
      seq(
        optional(token(repeat1(S_WHITE))),
        C_ESCAPE,
        B_NON_CONTENT,
        $._l_flow_empty,
        $._s_flow_line_prefix,
      ),
    _s_double_break: $ => choice($._s_double_escaped, $._s_flow_folded),
    _nb_ns_double_in_line: $ =>
      choice($._empty, token(repeat1(seq(repeat(S_WHITE), NS_DOUBLE_CHAR)))),
    _s_double_next_line: $ =>
      seq(
        $._s_double_break,
        optional(
          seq(
            NS_DOUBLE_CHAR,
            $._nb_ns_double_in_line,
            choice($._s_double_next_line, optional(token(repeat1(S_WHITE)))),
          ),
        ),
      ),
    _nb_double_multi_line: $ =>
      seq(
        $._nb_ns_double_in_line,
        choice($._s_double_next_line, optional(token(repeat1(S_WHITE)))),
      ),

    // 7.3.2. Single-Quoted Style

    _c_value_single_quoted: $ =>
      seq(C_SINGLE_QUOTE, $._nb_value_single_text, C_SINGLE_QUOTE),
    _c_key_single_quoted: $ =>
      seq(C_SINGLE_QUOTE, $._nb_key_single_text, C_SINGLE_QUOTE),
    _nb_value_single_text: $ => $._nb_single_multi_line,
    _nb_key_single_text: $ => $._nb_single_one_line,
    _nb_single_one_line: $ => choice($._empty, token(repeat1(NB_SINGLE_CHAR))),
    _nb_ns_single_in_line: $ =>
      choice($._empty, token(repeat1(seq(repeat(S_WHITE), NS_SINGLE_CHAR)))),
    _s_single_next_line: $ =>
      seq(
        $._s_flow_folded,
        optional(
          seq(
            NS_SINGLE_CHAR,
            $._nb_ns_single_in_line,
            choice($._s_single_next_line, optional(token(repeat1(S_WHITE)))),
          ),
        ),
      ),
    _nb_single_multi_line: $ =>
      seq(
        $._nb_ns_single_in_line,
        choice($._s_single_next_line, optional(token(repeat1(S_WHITE)))),
      ),

    // 7.3.3. Plain Style

    _ns_out_value_plain: $ => $._ns_out_plain_multi_line,
    _ns_in_value_plain: $ => $._ns_in_plain_multi_line,
    _ns_out_key_plain: $ => $._ns_out_plain_one_line,
    _ns_in_key_plain: $ => $._ns_in_plain_one_line,
    _nb_ns_out_plain_in_line: $ =>
      choice($._empty, token(repeat1(seq(repeat(S_WHITE), NS_PLAIN_CHAR_OUT)))),
    _nb_ns_in_plain_in_line: $ =>
      choice($._empty, token(repeat1(seq(repeat(S_WHITE), NS_PLAIN_CHAR_IN)))),
    _ns_out_plain_one_line: $ =>
      seq(
        NS_PLAIN_FIRST,
        $._nb_ns_out_plain_in_line, //
      ),
    _ns_in_plain_one_line: $ =>
      seq(
        NS_PLAIN_FIRST,
        $._nb_ns_in_plain_in_line, //
      ),
    _s_ns_out_plain_next_line: $ =>
      seq($._s_flow_folded, NS_PLAIN_CHAR_OUT, $._nb_ns_out_plain_in_line),
    _s_ns_in_plain_next_line: $ =>
      seq($._s_flow_folded, NS_PLAIN_CHAR_IN, $._nb_ns_in_plain_in_line),
    _ns_out_plain_multi_line: $ =>
      seq($._ns_out_plain_one_line, repeat($._s_ns_out_plain_next_line)),
    _ns_in_plain_multi_line: $ =>
      seq($._ns_in_plain_one_line, repeat($._s_ns_in_plain_next_line)),

    // 7.4. Flow Collection Styles

    _value_in_flow: $ => $._ns_s_value_flow_seq_entries,
    _key_in_flow: $ => $._ns_s_key_flow_seq_entries,

    // 7.4.1. Flow Sequences

    _c_value_flow_sequence: $ =>
      seq(
        C_SEQUENCE_START,
        optional($._s_value_separate),
        optional($._value_in_flow),
        C_SEQUENCE_END,
      ),
    _c_key_flow_sequence: $ =>
      seq(
        C_SEQUENCE_START,
        optional($._s_key_separate),
        optional($._key_in_flow),
        C_SEQUENCE_END,
      ),
    _ns_s_value_flow_seq_entries: $ =>
      seq(
        $._ns_flow_seq_entry,
        optional($._s_value_separate),
        optional(
          seq(
            C_COLLECT_ENTRY,
            optional($._s_value_separate),
            optional($._ns_s_value_flow_seq_entries),
          ),
        ),
      ),
    _ns_s_key_flow_seq_entries: $ =>
      seq(
        $._ns_flow_seq_entry,
        optional($._s_key_separate),
        optional(
          seq(
            C_COLLECT_ENTRY,
            optional($._s_key_separate),
            optional($._ns_s_key_flow_seq_entries),
          ),
        ),
      ),
    _ns_flow_seq_entry: $ => choice($._ns_flow_pair, $._ns_flow_node), // TODO
  },
})
