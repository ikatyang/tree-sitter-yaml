const fs = require("fs");
const path = require("path");

function loadTests(dirname) {
  const tests = {};
  for (const basename of fs.readdirSync(dirname)) {
    const filename = path.join(dirname, basename);
    tests[basename] = loadTest(filename);
  }
  return tests;
}

function loadTest(filename) {
  const testCases = {};
  const text = fs.readFileSync(filename, "utf8");
  let state = "start"; // start -> Loop(title -> input -> output)
  let titleBuffer = [];
  let inputBuffer = [];
  let outputBuffer = [];
  for (const lineText of (text + "\n" + "=".repeat(80)).split("\n")) {
    if (
      (state === "start" || state === "title" || state === "output") &&
      /^=====+$/.test(lineText)
    ) {
      if (state === "output") {
        testCases[titleBuffer.join("\n")] = {
          input: inputBuffer.join("\n"),
          output: outputBuffer.join("\n"),
        };
        titleBuffer = [];
        inputBuffer = [];
        outputBuffer = [];
      }
      state = state === "title" ? "input" : "title";
    } else if (state === "input" && /^-----+$/.test(lineText)) {
      state = "output";
    } else if (state === "title") {
      titleBuffer.push(lineText);
    } else if (state === "input") {
      inputBuffer.push(lineText);
    } else if (state === "output") {
      outputBuffer.push(lineText);
    } else {
      // do nothing
    }
  }
  return testCases;
}

function writeTests(dirname, tests) {
  for (const [basename, testCases] of Object.entries(tests)) {
    writeTest(path.join(dirname, basename), testCases);
  }
}

function writeTest(filename, testCases) {
  const lineTexts = [];
  for (const [title, { input, output }] of Object.entries(testCases)) {
    lineTexts.push(
      "=".repeat(80),
      title,
      "=".repeat(80),
      input,
      "-".repeat(80),
      "",
      output.trim(),
      "",
    );
  }
  fs.writeFileSync(filename, lineTexts.join("\n"));
}

module.exports = {
  loadTests,
  loadTest,
  writeTests,
  writeTest,
};
