const child_process = require("child_process");

const { stdout, stderr } = child_process.spawnSync(
  "./tree-sitter/target/release/tree-sitter",
  ["parse", process.argv[2], "--debug"],
);
process.stdout.write(stdout.toString());
process.stderr.write(
  stderr.toString().replace(/^\s+(consume|skip) character:.+\n/gm, ""),
);
