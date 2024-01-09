// For more comments about what's going on here, check out the `hello_world`
// example.
// import * as wasm from "./pkg";
import * as wasm from "../../pkg/rust_nes";
import State from "./nes_miniapp_state";

let state = null;
function stopRun() {
  state.stopRun();
}

function startRun(data, ctx) {

  state = new State();
  try {
    wasm.wasm_main();
  } catch (error) {
    console.log(error)  
  }
  try {
    let mario = new Uint8Array(data);
    state.load_rom(mario, ctx);
  } catch (error) {
    console.log(error)
  }

  state.startRun();
}

export {startRun, stopRun, state};
