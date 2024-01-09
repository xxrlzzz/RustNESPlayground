// from tetanes.

import * as wasm from "../../pkg/rust_nes";
// import * as wasm from "rust_nes";

const vertexSource = 
" \
attribute vec2 position; \
attribute vec2 texCoord; \
attribute float layer; \
varying vec2 uv; \
void main() { \
    gl_Position = vec4(position.x, position.y, 0.0, 1.0); \
    uv = texCoord; \
} \
";

const fragmentSource = 
" \
varying highp vec2 uv; \
uniform sampler2D texture; \
void main() { \
    gl_FragColor = texture2D(texture, uv); \
} \
";


function translate_key(keyname) {
  let ret = 0;
  switch (keyname) {
    case "b_up": ret = 1<<4; break;
    case "b_up_left": ret = (1<<4)|(1<<6); break;
    case "b_up_right": ret = (1<<4)|(1<<7); break;
    case "b_down": ret = 1<<5; break;
    case "b_down_left": ret = (1<<5)|(1<<6); break;
    case "b_down_right": ret = (1<<5)|(1<<7); break;
    case "b_left": ret = 1<<6; break;
    case "b_right": ret = 1<<7; break;
    case "b_select": ret = 1<<2; break;
    case "b_start": ret = 1<<3; break;
    case "b_a": ret = 1<<0; break;
    case "b_b": ret = 1<<1; break;
  };
  return ret;
}

let flag = true;
class State {
  constructor() {
    this.sample_rate = 44100;
    this.buffer_size = 1024;
    this.nes = null;
    this.animation_id = null;
    this.empty_buffers = [];
    this.audio_ctx = null;
    this.gain_node = null;
    this.next_start_time = 0;
    // this.setup_audio();
  }

  load_rom(rom, ctx) {
    this.nes = wasm.WebNes.new(rom, ctx, this.sample_rate);
    this.ctx = ctx;
    this.program = this.setupShader(ctx);
    this.texutre = this.setupTexture(ctx);
  }

  setup_audio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.error("Browser does not support audio");
      return;
    }
    this.audio_ctx = new AudioContext();
    this.gain_node = this.audio_ctx.createGain();
    this.gain_node.gain.setValueAtTime(1, 0);
  }

  startRun() {
    this.interval = setInterval(this.run.bind(this), 17);
  }

  stopRun() {
    clearInterval(this.interval);
  }

  sendInput(keyname, isStart) {
    let keycode = translate_key(keyname)
    console.log('sendInput', keycode, keyname)
    if (isStart) {
      wasm.set_key_down(keycode)
    } else {
      wasm.set_key_up(keycode)
    }
  }

  run() {

    // this.animation_id = requestAnimationFrame(this.run.bind(this));
    var data = this.nes.do_frame_and_pull_data();
    // console.log(data);
    if (data.length < 10) {
      return;
    }
    this.renderTexture(this.ctx, 256, 240, data);
  
    // this.queue_audio();
  }

  get_audio_buffer() {
    if (!this.audio_ctx) {
      throw new Error("AudioContext not created");
    }

    if (this.empty_buffers.length) {
      return this.empty_buffers.pop();
    } else {
      return this.audio_ctx.createBuffer(1, this.buffer_size, this.sample_rate);
    }
  }

  queue_audio() {
    if (!this.audio_ctx || !this.gain_node) {
      throw new Error("Audio not set up correctly");
    }

    this.gain_node.gain.setValueAtTime(1, this.audio_ctx.currentTime);

    const audioBuffer = this.get_audio_buffer();
    this.nes.audio_callback(this.buffer_size, audioBuffer.getChannelData(0));
    const source = this.audio_ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gain_node).connect(this.audio_ctx.destination);
    source.onended = () => {
      this.empty_buffers.push(audioBuffer);
    };
    const latency = 0.032;
    const audio_ctxTime = this.audio_ctx.currentTime + latency;
    const start = Math.max(this.next_start_time, audio_ctxTime);
    source.start(start);
    this.next_start_time = start + this.buffer_size / this.sample_rate;
  }
  // ...

  setupShader(ctx) {
    const vertexShader = ctx.createShader(ctx.VERTEX_SHADER);
    ctx.shaderSource(vertexShader, vertexSource);
    ctx.compileShader(vertexShader);

    const fragmentShader = ctx.createShader(ctx.FRAGMENT_SHADER);
    ctx.shaderSource(fragmentShader, fragmentSource);
    ctx.compileShader(fragmentShader);

    const program = ctx.createProgram();
    ctx.attachShader(program, vertexShader);
    ctx.attachShader(program, fragmentShader);
    ctx.linkProgram(program);
    return program;
  }

  setupTexture(ctx) {
    const texture = ctx.createTexture();
    ctx.activeTexture(ctx.TEXTURE0);
    ctx.bindTexture(ctx.TEXTURE_2D, texture)

    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
    ctx.useProgram(this.program);
    ctx.uniform1i(ctx.getUniformLocation(this.program, "texture"), 0);
    ctx.bindTexture(ctx.TEXTURE_2D, null);
    this.checkError(ctx);
    return texture;
  }

  renderTexture(ctx, width, height, array) {
    ctx.bindTexture(ctx.TEXTURE_2D, this.texutre);
    ctx.activeTexture(ctx.TEXTURE0);
    ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA,width, height, 0 , ctx.RGBA, ctx.UNSIGNED_BYTE, array);
    // ctx.bindTexture(ctx.TEXTURE_2D, null);
    
    // draw texture to canvas
    const positionLocation = ctx.getAttribLocation(this.program, "position");
    const texcoordLocation = ctx.getAttribLocation(this.program, "texCoord");

    this.checkError(ctx);
    // position buffer
    const positionBuffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, positionBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([
      1, 1,
      1, -1,
      -1,1,
      1, -1,
      -1,-1,
      -1,1
    ]), ctx.STATIC_DRAW);

    this.checkError(ctx);
    // tex coord buffer
    const texcoordBuffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, texcoordBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([
      1, 0,
      1, 1,
      0, 0,
      1, 1,
      0, 1,
      0, 0
    ]), ctx.STATIC_DRAW);

    this.checkError(ctx);

    ctx.useProgram(this.program);
    ctx.clear(ctx.COLOR_BUFFER_BIT);
    ctx.activeTexture(ctx.TEXTURE0);

    ctx.enableVertexAttribArray(positionLocation);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, positionBuffer);
    ctx.vertexAttribPointer(positionBuffer, 2, ctx.FLOAT, false, 0, 0);
    
    ctx.enableVertexAttribArray(texcoordLocation);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, texcoordBuffer);

    ctx.vertexAttribPointer(texcoordLocation, 2, ctx.FLOAT, false, 0, 0);

    ctx.drawArrays(ctx.TRIANGLES, 0, 6);

    this.checkError(ctx);
  }

  checkError(ctx) {
    const e = ctx.getError();
    if (e != ctx.NO_ERROR) {
      console.warn("gl error", e);
      throw ("gl error");
    }
  }
}

export default State;
