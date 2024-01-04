# project_path="~/MiniProjects/API-Demo/pkg"
source .env

cd ../$Emulator

wasm-pack build --target web --release -d ../$Playground/pkg_miniapp --features wasm,wasm-miniapp --no-default-features
# for web
# wasm-pack build --target web --release -d pkg --features wasm --no-default-features

cd ../$Playground/scripts

node fix_miniapp.js

cd ..


cp -r ./pkg_miniapp/* $MiniappPath/pkg

echo "done"