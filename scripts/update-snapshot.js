const child_process = require("child_process");
const { loadTests, writeTests } = require("./utils");

updateTestOutputs("./corpus");

function updateTestOutputs(dirname) {
  const tests = loadTests(dirname);

  for (const [, testCases] of Object.entries(tests)) {
    for (const [, testCase] of Object.entries(testCases)) {
      testCase.output = "(x y: (z))";
    }
  }

  writeTests(dirname, tests);

  let stdout;

  try {
    child_process.execFileSync(
      "./tree-sitter/target/release/tree-sitter",
      ["test"],
    );
  } catch (error) {
    stdout = error.stdout.toString();
  }

  const sexps = parseTestStdout(stdout);

  for (const [basename, testCases] of Object.entries(sexps)) {
    for (const [title, sexp] of Object.entries(testCases)) {
      tests[basename][title].output = printSExpression(parseSExpression(sexp));
    }
  }

  writeTests(dirname, tests);
}

function parseTestStdout(stdout) {
  const [tocText, detailText] = stdout
    .replace(/\u001b\[\d+m/g, "") // ansi color
    .split(/\n\n\d+ failures?:\n\nexpected \/ actual\n\n/);

  const indices = [];
  const sexps = {};

  let basename;
  for (const lineText of tocText.trim().split("\n")) {
    if (lineText.startsWith(" ")) {
      const title = lineText.slice("  ✗ ".length);
      indices.push([basename, title]);
    } else {
      basename = lineText.slice(0, -1) + ".txt";
    }
  }

  let counter = 0;
  detailText.split("\n").forEach((lineText, i) => {
    if (i % 3 === 1) {
      const sexp = lineText.replace(/\(x y: \(z\)\)\s*$/, "").trim();
      const [basename, title] = indices[counter++];
      sexps[basename] = sexps[basename] || {};
      sexps[basename][title] = sexp;
    }
  });

  return sexps;
}

function parseSExpression(text) {
  let node;

  let key = null;
  const stack = [];

  const pushNode = () => {
    if (key) {
      node.key = key;
      key = null;
    }
    if (stack.length) {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  };

  for (let i = 0; i < text.length; i++) {
    switch (text[i]) {
      case "(":
        node = {
          type: /^MISSING/.test(text.slice(i + 1))
            ? text.slice(i + 1).match(/^[^) ]+( \w+)?/)[0]
            : text.slice(i + 1).match(/^[^) ]+/)[0],
          children: [],
        };
        i += node.type.length;
        pushNode();
        break;
      case ")":
        node = stack.pop();
      case " ":
        break;
      default:
        key = text.slice(i).match(/^[^:]+/)[0];
        i += key.length;
        break;
    }
  }
  return node;
}

function printSExpression(node, indent = "  ") {
  if (node.children.length === 0) {
    return `${printNodeHead(node)})`;
  }

  if (node.children.every(child => child.children.length === 0)) {
    return `${printNodeHead(node)}\n  ${node.children
      .map(child => `${printNodeHead(child)})`)
      .join(" ")})`;
  }

  return `${printNodeHead(node)}\n${node.children
    .map(x =>
      printSExpression(x, indent + "  ")
        .split("\n")
        .map(x => `  ${x}`)
        .join("\n"),
    )
    .join(`\n`)})`;
}

function printNodeHead(node) {
  return node.key ? `${node.key}: (${node.type}` : `(${node.type}`;
}
