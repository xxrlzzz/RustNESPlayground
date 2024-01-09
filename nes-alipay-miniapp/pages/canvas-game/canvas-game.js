import {startRun, stopRun, state} from "./nes_miniapp";
import __wbg_init  from "../../pkg/rust_nes";
// import * as nes2 from 'assets/mario.nes';

const cloudEnv = 'env-00jx4xddmf5c'
const DEBUG_LOCAL = true
Page({
  async onCanvasReady() {
    my.showLoading()
    const c1 = my.cloud.createCloudContext({
      env: 'env-00jx4xddmf5c', // 云环境 id
    });
    await c1.init();

    // const fs = my.getFileSystemManager()
    // fs.unlinkSync(`${my.env.USER_DATA_PATH}/rust_nes_bg.wasm`)
    // const assets = await this.loadByDownload({
    //   wasm: `${my.env.USER_DATA_PATH}/rust_nes_bg.wasm`,
    //   wasm_id: `cloud://${cloudEnv}/nes_games/rust_nes_bg.wasm`,
    //   nes: `${my.env.USER_DATA_PATH}/mario.nes`,
    //   nes_id: `cloud://${cloudEnv}/nes_games/mario.nes`,
    //   cloudCtx: c1,
    // });
    const assets = await this.loadByFetch({
      wasm: DEBUG_LOCAL ? "http://127.0.0.1:5500/pkg_miniapp/rust_nes_bg.wasm" : "https://xxrl-1.oss-cn-hangzhou.aliyuncs.com/rust_nes_bg.wasm",
      nes:DEBUG_LOCAL ? "http://127.0.0.1:5500/assets/mario.nes" : "https://xxrl-1.oss-cn-hangzhou.aliyuncs.com/mario.nes",
    });
    console.log('fetch assets done', assets);
    this.startGame(assets)
  },

  // TODO use online, 解决文件错误问题
  async loadByDownload({wasm, wasm_id, nes, nes_id, cloudCtx}) {
    console.log(`prepareAssets ${wasm} ${nes}`)
    const fs = my.getFileSystemManager()
    const wasmInfo = fs.accessSync(wasm)
    
    if (!wasmInfo.success && wasmInfo.error == 10022) {
      return new Promise((resolve, reject) => {
        cloudCtx.downloadFile({
          fileID: wasm_id,
          filePath: wasm,
          success: (res) => {
            console.log('download ' + wasm_id + 'done ', res)
            resolve();
          },
          fail(err) {
            console.warn('failed to download' + wasm_id, err)
            reject();
          }
        })
      }).then(() => {
        return this.prepareAssets({wasm,wasm_id,nes,nes_id,cloudCtx});
      })
    }

    const nesInfo = fs.accessSync(nes)

    if (!nesInfo.success && nesInfo.error == 10022) {
      return new Promise((resolve, reject) => {
        // https://xxrl-1.oss-cn-hangzhou.aliyuncs.com/mario.nes
        cloudCtx.downloadFile({
          fileID: nes_id,
          filePath: nes,
          success: (res) => {
            console.log('download ' + nes_id + 'done ', res)
            resolve();
          },
          fail(err) {
            console.warn('failed to download' + nes_id, err)
            reject();
          }
        })
      }).then(() => {
        return this.prepareAssets({wasm,wasm_id,nes,nes_id,cloudCtx});
      })     
    } 
    return new Promise((resolve, reject) => {
      const wasm_s = fs.readFileSync(wasm);
      const nes_s = fs.readFileSync(nes);
      if (!wasm_s.success) {
        console.warn('read wasm file failed', wasm);
        reject();
        return;
      } 
      if (!nes_s.success) {
        console.warn('read nes file failed', nes);
        reject();
        return;
      }
      resolve({wasm: wasm_s.data, nes:nes_s.data});
    });
  },

  async loadByFetch({wasm, nes}) {
    const wasm_data = await my.request({
      url: wasm,
      dataType:'arraybuffer'
    })
    const nes_data = await my.request({
      url: nes,
      dataType:'arraybuffer'
    })
    return {wasm: wasm_data.data, nes:nes_data.data}
  },

  async startGame(assets)  {
    my.createSelectorQuery().select('#canvas').node().exec((res) => {
      const canvas = res[0].node;
      const ctx = canvas.getContext('webgl');
      __wbg_init(assets.wasm).then(()=>{
        startRun(assets.nes, ctx);
      }).catch((err)=>{
        my.showToast({content: "加载失败", type: "fail"})
        console.error(err);
      }).finally(()=>{
        my.hideLoading();
      });
    })
  },

  onReady() {
    my.setNavigationBar({
      frontColor: '#ffffff',
      backgroundColor: '#2E3235'
    })
  },

  handleInput(e) {
    let isStart = e.type == "touchStart"
    state.sendInput(e.target.id, isStart)
  },
  onUnload() {
    // clearInterval(this.interval);
    stopRun();
  },
});

