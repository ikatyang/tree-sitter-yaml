git clone https://github.com/tree-sitter/tree-sitter --branch 0.15.7 --depth 1
cd tree-sitter
git submodule update --init
git apply ../scripts/tree-sitter.diff
./script/build-wasm
cargo build --release
