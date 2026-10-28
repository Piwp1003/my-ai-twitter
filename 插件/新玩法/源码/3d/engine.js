// 谷雨 3D 小人引擎：捏人 / 图片变 3D / VRM / GLB / FBX / PMX → 统一的小人（能做动作、换表情、张嘴说话）+ 单人小舞台 + 3D 小屋
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { drawChibi, LOOK_DEF, LOOK_OPTS } from './chibi.js';
import { autoLabels, cutBg, toWork, fakeBack, PART_CN } from './pic.js';
import { buildMii } from './mii.js';
import { SK, SK_CN, SK_BONES, skelFromLabels, skelFromAI, labelsFromSkel, skelAuto, skelRig, skelPosed } from './skel.js';
import { buildDoll, LP_CN, LP_DEF, LP_PARTS, bleed, lightOf } from './lowpoly.js';
import { HAIR_STYLES } from './hair.js';
import { imageToDoll, autoLabels2, backFromFront } from './doll.js';

export { SK, SK_CN, SK_BONES, skelFromLabels, skelFromAI, labelsFromSkel, skelAuto, skelRig, skelPosed };
export { THREE, drawChibi, LOOK_DEF, LOOK_OPTS, autoLabels, autoLabels2, cutBg, toWork, fakeBack, PART_CN, LP_CN, LP_DEF, LP_PARTS, HAIR_STYLES, imageToDoll, backFromFront };

const ACTS = {
  idle: '待着', walk: '走路', run: '跑', wave: '挥手', nod: '点头', shake: '摇头', jump: '蹦一下', spin: '转圈', dance: '跳舞', clap: '拍手', heart: '比心',
  hug: '张开手要抱', sway: '摇摆', fall: '倒下', sit: '坐着', sleep: '睡觉', eat: '吃饭', read: '看书', think: '思考', shy: '害羞', angry: '生气跺脚', cry: '哭', stretch: '伸懒腰',
  daze: '发呆', poke: '被戳了一下', bow: '鞠躬', cheer: '欢呼', tilt: '歪头', look: '东张西望', phone: '玩手机', yawn: '打哈欠', pat: '摸摸头', sulk: '闹别扭'
};
export const ACT_CN = ACTS;
export const FACES = { normal: '平常', happy: '开心', closed: '闭眼', surprised: '惊讶', angry: '生气', sad: '难过', shy: '害羞' };
// 动作默认配的表情 + 头上冒的小符号
const ACT_FACE = { fall: 'surprised', sleep: 'closed', cry: 'sad', angry: 'angry', sulk: 'angry', shy: 'shy', heart: 'happy', cheer: 'happy', dance: 'happy', poke: 'surprised', clap: 'happy', hug: 'happy', yawn: 'closed', pat: 'happy', wave: 'happy', stretch: 'closed' };
const ACT_EMO = { sleep: '💤', cry: '💧', angry: '💢', sulk: '💢', shy: '💗', heart: '❤️', dance: '🎵', think: '❓', poke: '❗', eat: '🍚', read: '📖', cheer: '✨', daze: '…', phone: '📱', hug: '🤗', yawn: '💤' };
// 一次性的动作多长（秒），没写的是一直做下去（状态）
const ONCE = { wave: 3.2, nod: 2.8, shake: 2.8, jump: 1.8, spin: 3, fall: 3.6, clap: 2, heart: 2.4, hug: 2.6, think: 3, shy: 3, angry: 2.4, cry: 3.5, stretch: 2.6, poke: 1.2, bow: 2.2, cheer: 1.8, tilt: 1.8, look: 3, yawn: 2.4, pat: 2.4, sulk: 3, dance: 3.2 };
// 照「低模小人建造师」的动作（一圈多长、每一帧怎么动都照它的）：带位移和挤压拉伸
const KK_T = { idle: 2.4, jump: 0.9, sway: 1.6, poke: 1.2, fall: 3.6, walk: 1, run: 0.56, wave: 1.6, nod: 1.4, shake: 1.4, bow: 2.2, cheer: 0.9, dance: 1.6, spin: 3 };
const sat = e => Math.min(1, Math.max(0, e)), smo = e => { const t = sat(e); return t * t * (3 - 2 * t); }, ramp = (e, a, b) => smo((e - a) / (b - a)), TAU = Math.PI * 2;
function kkPose(name, t) {
  const B = () => ({ p: [0, 0, 0], r: [0, 0, 0], s: [1, 1, 1] }); const r = { root: B(), body: B(), head: B(), armL: B(), armR: B(), legL: B(), legR: B() };
  const per = KK_T[name], a = ((t % per) + per) % per / per, o = 1;
  const arms = v => { r.armL.r[2] = -v; r.armR.r[2] = v; };
  switch (name) {
    case 'idle': { const e = Math.sin(a * TAU); r.body.s = [1 - 0.012 * e, 1 + 0.025 * e, 1 - 0.012 * e]; r.head.p[1] = o * 0.012 * e; r.head.r[2] = 0.04 * Math.sin(a * TAU + 0.8); arms(0.06 + 0.04 * e); break; }
    case 'jump': { const e = a < 0.15 ? Math.sin(a / 0.15 * Math.PI) : 0, u = a >= 0.15 && a < 0.8 ? Math.sin((a - 0.15) / 0.65 * Math.PI) : 0, n = a >= 0.8 ? Math.sin((a - 0.8) / 0.2 * Math.PI) : 0, i = e * 0.12 + n * 0.15; r.root.p[1] = o * 0.35 * u; r.root.s = [1 + i * 0.6, 1 - i, 1 + i * 0.6]; arms(0.15 + 1.1 * u); r.legL.r[2] = -0.25 * u; r.legR.r[2] = 0.25 * u; r.head.r[0] = -0.12 * u; break; }
    case 'sway': { const e = Math.sin(a * TAU); r.root.r[2] = 0.16 * e; r.head.r[2] = -0.12 * Math.sin(a * TAU - 0.6); r.armL.r[2] = -(0.3 - 0.25 * e); r.armR.r[2] = 0.3 + 0.25 * e; break; }
    case 'poke': { const e = Math.min(t, per), n = Math.exp(-4 * e), w = Math.sin(e * 22); r.root.s = [1 + 0.08 * n * w, 1 - 0.14 * n * w, 1 + 0.08 * n * w]; r.head.r[2] = 0.3 * Math.exp(-3 * e) * Math.sin(e * 16); arms(0.9 * Math.exp(-5 * e)); r.body.r[0] = -0.15 * n; break; }
    case 'fall': { const e = a < 0.12 ? 0.1 * Math.sin(a / 0.12 * TAU * 1.5) * (1 - a / 0.12) : 0, u = ramp(a, 0.12, 0.26), i = a > 0.26 && a < 0.34 ? 0.1 * Math.sin((a - 0.26) / 0.08 * Math.PI) : 0, q = ramp(a, 0.78, 0.94), sv = u * (1 - q), c = -(Math.PI / 2) * sv + i * (1 - q) + e, l = -0.09; r.root.r[0] = c; r.root.p[1] = l * Math.sin(c); r.root.p[2] = l * (1 - Math.cos(c)); const w = a > 0.36 && a < 0.76 ? Math.sin(a * TAU * 8) : 0; arms(0.2 + 0.9 * sv + 0.3 * w); r.legL.r[0] = -0.4 * sv - 0.3 * w; r.legR.r[0] = -0.4 * sv + 0.3 * w; r.head.r[0] = 0.2 * sv; break; }
    case 'walk': { const e = Math.sin(a * TAU); r.legL.r[0] = 0.55 * e; r.legR.r[0] = -0.55 * e; r.armL.r[0] = -0.5 * e; r.armR.r[0] = 0.5 * e; arms(0.12); r.root.p[1] = o * 0.03 * Math.abs(Math.sin(a * TAU)); r.root.r[2] = 0.05 * e; r.head.r[2] = -0.04 * e; break; }
    case 'run': { const e = Math.sin(a * TAU); r.legL.r[0] = 0.95 * e; r.legR.r[0] = -0.95 * e; r.armL.r[0] = -0.9 * e; r.armR.r[0] = 0.9 * e; arms(0.2); r.root.r[0] = 0.16; r.root.p[1] = o * 0.06 * Math.abs(Math.sin(a * TAU)); r.head.r[0] = -0.1; break; }
    case 'wave': { const e = Math.sin(a * TAU * 3), u = ramp(a, 0, 0.15) * (1 - ramp(a, 0.85, 1)); r.armR.r[2] = 0.1 + u * (2.2 + 0.35 * e); r.armL.r[2] = -0.1; r.head.r[2] = 0.1 * u; r.root.r[2] = -0.04 * u; break; }
    case 'nod': { const e = Math.max(0, Math.sin(a * TAU * 2)); r.head.r[0] = 0.32 * e; r.body.r[0] = 0.05 * e; arms(0.08); break; }
    case 'shake': { const e = Math.sin(a * TAU * 2) * (1 - ramp(a, 0.8, 1)); r.head.r[1] = 0.55 * e; r.body.r[1] = 0.08 * e; arms(0.08); break; }
    case 'bow': { const e = ramp(a, 0.08, 0.32) * (1 - ramp(a, 0.62, 0.88)); r.body.r[0] = 0.85 * e; r.head.r[0] = 0.2 * e; arms(0.1); break; }
    case 'cheer': { const e = Math.abs(Math.sin(a * TAU)), w = Math.sin(a * TAU * 2); r.root.p[1] = o * 0.1 * e; r.armL.r[2] = -(2.4 + 0.25 * w); r.armR.r[2] = 2.4 - 0.25 * w; r.head.r[0] = -0.15; r.legL.r[2] = -0.12 * e; r.legR.r[2] = 0.12 * e; break; }
    case 'dance': { const e = Math.sin(a * TAU), w = Math.abs(Math.sin(a * TAU * 2)); r.root.p[1] = o * 0.04 * w; r.root.r[1] = 0.45 * e; r.root.r[2] = 0.1 * e; r.armL.r[2] = -(1.2 + 0.9 * e); r.armR.r[2] = 1.2 - 0.9 * e; r.legL.r[2] = -0.35 * Math.max(0, e); r.legR.r[2] = 0.35 * Math.max(0, -e); r.head.r[2] = -0.14 * e; break; }
    case 'spin': r.root.r[1] = a * TAU; break;
  }
  // 它的左手是图上左边（角色的右手），换成我们的：左右对调
  const P = { hips: [0, 0, 0], spine: r.body.r, head: r.head.r, armL: r.armR.r, armR: r.armL.r, legL: r.legR.r, legR: r.legL.r, root: { y: r.root.p[1], z: r.root.p[2], rx: r.root.r[0], ry: r.root.r[1], rz: r.root.r[2], s: r.root.s }, bodyS: r.body.s, headY: r.head.p[1] };
  return P;
}
export const STATES = ['idle', 'walk', 'run', 'sit', 'sleep', 'eat', 'read', 'daze', 'phone', 'dance', 'think'];

const S = Math.sin, C = Math.cos, PI = Math.PI;
// 姿势：每个关节 [x, y, z]（弧度，在「小人朝 +z 站着」的坐标里）；root: {y, rx, ry, rz}
function pose(name, t, A) {
  if (KK_T[name] && !(A && A.kind === 'vrm' && name === 'idle' && 0)) return kkPose(name, t);
  const P = { hips: [0, 0, 0], spine: [0.03 * S(t * 2), 0, 0], head: [0, 0, 0.04 * S(t * 0.9)], armL: [0, 0, 0.08 + 0.03 * S(t * 2)], armR: [0, 0, -0.08 - 0.03 * S(t * 2)], legL: [0, 0, 0.02], legR: [0, 0, -0.02], root: { y: 0, rx: 0, ry: 0, rz: 0 } };
  const sit = () => { P.legL = [-1.45, 0, 0.12]; P.legR = [-1.45, 0, -0.12]; P.root.y = -A.legLen * 0.92; P.armL = [-0.25, 0, 0.12]; P.armR = [-0.25, 0, -0.12]; };
  const k = ONCE[name] ? Math.min(1, t / 0.25) * Math.min(1, (ONCE[name] - t) / 0.3 + 0.0001) : 1;   // 一次性动作的淡入淡出
  switch (name) {
    case 'walk': case 'run': { const f = name === 'run' ? 13 : 8, a = name === 'run' ? 0.9 : 0.6; P.legL = [a * S(t * f), 0, 0]; P.legR = [-a * S(t * f), 0, 0]; P.armL = [-a * 0.8 * S(t * f), 0, 0.12]; P.armR = [a * 0.8 * S(t * f), 0, -0.12]; P.root.y = 0.025 * Math.abs(S(t * f)); P.spine = [name === 'run' ? 0.15 : 0.04, 0.08 * S(t * f), 0]; break; }
    case 'wave': P.armR = [-0.7 * k, 0, -(1.9 + 0.35 * S(t * 9)) * k]; P.head = [0, 0, -0.15 * k]; P.root.rz = 0.04 * S(t * 4); break;
    case 'nod': P.head = [0.35 * Math.max(0, S(t * 9)) * k, 0, 0]; break;
    case 'shake': P.head = [0, 0.55 * S(t * 11) * k, 0]; break;
    case 'jump': { const ph = (t % 0.6) / 0.6; P.root.y = Math.max(0, S(ph * PI)) * 0.25 * k; P.armL = [0, 0, (0.4 + 1.6 * S(ph * PI)) * k]; P.armR = [0, 0, -(0.4 + 1.6 * S(ph * PI)) * k]; P.legL = [-0.4 * S(ph * PI), 0, 0]; P.legR = [-0.4 * S(ph * PI), 0, 0]; break; }
    case 'spin': P.root.ry = Math.min(1, t / 0.9) * PI * 2; P.root.y = 0.08 * S(Math.min(1, t / 0.9) * PI); P.armL = [0, 0, 1.2]; P.armR = [0, 0, -1.2]; break;
    case 'dance': { const b = S(t * 7); P.root.y = 0.04 * Math.abs(b); P.root.ry = 0.35 * S(t * 3.5); P.armL = [0, 0, 1.2 + 1.2 * Math.max(0, b)]; P.armR = [0, 0, -(1.2 + 1.2 * Math.max(0, -b))]; P.head = [0, 0, 0.25 * b]; P.spine = [0, 0, 0.12 * b]; P.legL = [-0.3 * Math.max(0, b), 0, 0.1]; P.legR = [-0.3 * Math.max(0, -b), 0, -0.1]; break; }
    case 'clap': { const c = Math.abs(S(t * 9)); P.armL = [-1.2 * k, 0, (-0.25 + 0.35 * c) * k]; P.armR = [-1.2 * k, 0, (0.25 - 0.35 * c) * k]; P.root.y = 0.02 * c; break; }
    case 'heart': P.armL = [-1.35 * k, 0, -0.55 * k]; P.armR = [-1.35 * k, 0, 0.55 * k]; P.head = [0, 0, 0.18 * k]; P.root.rz = 0.05 * S(t * 3); break;
    case 'hug': P.armL = [-1.3 * k, 0, 0.6 * k]; P.armR = [-1.3 * k, 0, -0.6 * k]; P.spine = [0.1 * k, 0, 0]; P.root.y = 0.02 * Math.abs(S(t * 5)); break;
    case 'sit': sit(); P.spine = [0.03 * S(t * 2), 0, 0]; break;
    case 'sleep': P.root.rx = -PI / 2; P.root.y = 0.06; P.armL = [0, 0, 0.15]; P.armR = [0, 0, -0.15]; P.spine = [0.03 * S(t * 1.2), 0, 0]; P.head = [0, 0.3, 0]; break;
    case 'eat': { sit(); const c = Math.max(0, S(t * 3)); P.armR = [-1.4 - 0.5 * c, 0, 0.35 * c]; P.armL = [-0.9, 0, -0.35]; P.head = [0.1 + 0.08 * c, 0, 0]; break; }
    case 'read': sit(); P.armL = [-1.05, 0, -0.42]; P.armR = [-1.05, 0, 0.42]; P.head = [0.28, 0.06 * S(t * 0.5), 0]; break;
    case 'phone': P.armL = [-1.1, 0, -0.35]; P.armR = [-1.1, 0, 0.35]; P.head = [0.32, 0, 0.04 * S(t)]; break;
    case 'think': P.armR = [-1.75 * k, 0, 0.55 * k]; P.armL = [-0.5 * k, 0, -0.3 * k]; P.head = [-0.12 * k, 0, 0.22 * k]; break;
    case 'shy': P.armL = [-0.45 * k, 0, -0.32 * k]; P.armR = [-0.45 * k, 0, 0.32 * k]; P.head = [0.25 * k, 0, 0.15 * k]; P.root.ry = 0.22 * S(t * 3); break;
    case 'angry': case 'sulk': { P.armL = [0.25, 0, 0.75 * k]; P.armR = [0.25, 0, -0.75 * k]; P.head = name === 'sulk' ? [0.15, 0.6 * k, 0] : [0.1, 0, 0]; if (name === 'angry') { P.root.y = 0.04 * Math.max(0, S(t * 10)); P.legR = [-0.35 * Math.max(0, S(t * 10)), 0, 0]; } else P.root.ry = -0.5 * k; break; }
    case 'cry': P.armL = [-2.0 * k, 0, -0.45 * k]; P.armR = [-2.0 * k, 0, 0.45 * k]; P.head = [0.32 * k, 0.12 * S(t * 7), 0]; P.root.y = 0.01 * S(t * 14); break;
    case 'stretch': P.armL = [-0.5, 0, 2.3 * k]; P.armR = [-0.5, 0, -2.3 * k]; P.spine = [-0.18 * k, 0, 0.1 * S(t * 2) * k]; P.root.y = 0.03 * k; break;
    case 'yawn': P.armR = [-1.9 * k, 0, 0.4 * k]; P.head = [-0.2 * k, 0, 0.1 * k]; P.spine = [-0.08 * k, 0, 0]; break;
    case 'daze': P.head = [0.08, 0.2 * S(t * 0.4), 0.22]; P.armL = [0, 0, 0.06]; P.armR = [0, 0, -0.06]; P.root.ry = 0.06 * S(t * 0.3); break;
    case 'poke': P.root.y = 0.12 * S(Math.min(1, t / 0.5) * PI); P.armL = [0, 0, 0.9 * k]; P.armR = [0, 0, -0.9 * k]; P.head = [-0.15 * k, 0, 0.2 * k]; break;
    case 'bow': P.spine = [0.65 * k, 0, 0]; P.head = [0.25 * k, 0, 0]; P.armL = [-0.3 * k, 0, 0]; P.armR = [-0.3 * k, 0, 0]; break;
    case 'cheer': { const ph = (t % 0.55) / 0.55; P.root.y = Math.max(0, S(ph * PI)) * 0.2 * k; P.armL = [-0.6 * k, 0, 2.0 * k]; P.armR = [-0.6 * k, 0, -2.0 * k]; break; }
    case 'tilt': P.head = [0, 0.1 * k, 0.38 * k]; break;
    case 'look': P.head = [-0.05, 0.75 * S(t * 2.2) * k, 0]; break;
    case 'pat': P.armR = [-1.5 * k, 0, -(0.4 + 0.25 * S(t * 8)) * k]; P.head = [0.1, 0, -0.1]; break;
  }
  return P;
}

// ---------------------------------------------------------------------------
// 小人
// ---------------------------------------------------------------------------
const Q = () => new THREE.Quaternion(), V = (x, y, z) => new THREE.Vector3(x, y, z);
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
function emojiTex(t, size = 128) { const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); x.font = `${size * 0.72}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, size / 2, size / 2 + size * 0.04); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; }

export class Avatar {
  constructor() {
    this.holder = new THREE.Group();      // 外面：放在哪、朝哪（房间用）
    this.poseRoot = new THREE.Group();    // 动作的整体位移 / 旋转（跳、躺）
    this.inner = new THREE.Group();       // 模型本体（已经转成朝 +z、高 1、脚底在 0）
    this.holder.add(this.poseRoot); this.poseRoot.add(this.inner);
    this.J = {}; this.state = 'idle'; this.act = null; this.actT = 0; this.t = Math.random() * 10; this.legLen = 0.22;
    this.faceName = 'normal'; this.talking = false; this.blinkT = 2 + Math.random() * 3; this.blinking = 0; this.mouth = 0;
    this.emoSprite = null; this.emoT = 0; this.kind = '';
    this.speed = 1;
  }
  // 登记一个关节：node 是真的骨头 / 组；算好它的静止姿态（相对 inner）
  addJoint(name, node, base) {
    if (!node) return;
    this.inner.updateWorldMatrix(true, true);
    const inv = Q(); this.inner.getWorldQuaternion(inv).invert();
    const pr = Q(); if (node.parent) node.parent.getWorldQuaternion(pr); pr.premultiply(inv);
    this.J[name] = { node, Pr: pr, PrI: pr.clone().invert(), Lr: node.quaternion.clone(), base: base || Q(), cur: Q() };
  }
  // 手臂从 T/A 字形放下来：算一个「先放下来」的基础旋转
  armBase(name, node, child, side) {
    if (!node || !child) return Q();
    this.inner.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(this.inner.matrixWorld).invert();
    const a = V(0, 0, 0).setFromMatrixPosition(node.matrixWorld).applyMatrix4(inv), b = V(0, 0, 0).setFromMatrixPosition(child.matrixWorld).applyMatrix4(inv);
    const dir = b.sub(a).normalize(); const tgt = V(side * 0.16, -1, 0.04).normalize();
    if (dir.y < -0.85) return Q();
    return Q().setFromUnitVectors(dir, tgt);
  }
  apply(P, dt) {
    const k = 1 - Math.exp(-dt * 14);
    for (const n in this.J) {
      const j = this.J[n], e = P[n] || [0, 0, 0];
      _e.set(e[0], e[1], e[2], 'XYZ'); _q.setFromEuler(_e).multiply(j.base);          // 世界里的转动 = 动作 × 放下来
      _q2.copy(j.PrI).multiply(_q).multiply(j.Pr).multiply(j.Lr);                    // 换成骨头自己的
      j.cur.slerp(_q2, k); j.node.quaternion.copy(j.cur);
    }
    const r = P.root, pr = this.poseRoot;
    pr.position.y += ((r.y || 0) - pr.position.y) * k; pr.position.z += ((r.z || 0) - pr.position.z) * k;
    const sc = r.s || [1, 1, 1]; pr.scale.x += (sc[0] - pr.scale.x) * k; pr.scale.y += (sc[1] - pr.scale.y) * k; pr.scale.z += (sc[2] - pr.scale.z) * k;
    if (this.kind === 'doll' || this.kind === 'chibi') { const sp = this.J.spine && this.J.spine.node, bs = P.bodyS || [1, 1, 1]; if (sp) { sp.scale.x += (bs[0] - sp.scale.x) * k; sp.scale.y += (bs[1] - sp.scale.y) * k; sp.scale.z += (bs[2] - sp.scale.z) * k; }
      const hd = this.J.head; if (hd) { if (!hd.rest) hd.rest = hd.node.position.clone(); hd.node.position.y = hd.rest.y + (P.headY || 0) / Math.max(1e-6, this.root3 ? this.root3.scale.y : 1); } }
    const tgt = _q.setFromEuler(_e.set(r.rx || 0, r.ry || 0, r.rz || 0, 'YXZ'));
    pr.quaternion.slerp(tgt, (this.act === 'spin' || this.act === 'fall') ? 1 : k);
  }
  setState(s) { if (s && s !== this.state) { this.state = s; if (!this.act) this.autoFace(); } }
  play(a, keep) { if (!a) return; if (!ONCE[a]) { this.setState(a); this.act = null; return; } this.act = a; this.actT = 0; this.autoFace(); const em = ACT_EMO[a]; if (em) this.emote(em); }
  autoFace() { const a = this.act || this.state; this.setFace(this.faceLock || ACT_FACE[a] || 'normal'); const em = !this.act && ACT_EMO[this.state]; if (em) this.emote(em, 999); else if (!this.act && this.emoT > 100) this.emote(null); }
  lockFace(f, sec) { this.faceLock = f; clearTimeout(this._fl); this.setFace(f || 'normal'); if (f && sec) this._fl = setTimeout(() => { this.faceLock = null; this.autoFace(); }, sec * 1000); }
  setFace(f) { this.faceName = f || 'normal'; this._face(this.faceName, 0); }
  talk(on) { this.talking = !!on; if (!on) this._face(this.faceName, 0); }
  _face() {}   // 各种模型自己实现
  emote(t, sec = 2.4) {
    if (this.emoSprite) { this.poseRoot.remove(this.emoSprite); this.emoSprite.material.map.dispose(); this.emoSprite.material.dispose(); this.emoSprite = null; }
    if (!t) return;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(t), transparent: true, depthWrite: false }));
    sp.scale.set(0.26, 0.26, 0.26); sp.position.set(0.3, 1.08, 0); sp.renderOrder = 10;
    this.poseRoot.add(sp); this.emoSprite = sp; this.emoT = sec;
  }
  update(dt) {
    this.t += dt * this.speed; if (this.act) { this.actT += dt; if (this.actT > (ONCE[this.act] || 2)) { this.act = null; this.autoFace(); } }
    const name = this.act || this.state, tt = this.act ? this.actT : this.t;
    this.apply(pose(name, tt, this), dt);
    // 眨眼 / 说话
    this.blinkT -= dt; if (this.blinkT < 0) { this.blinking = 0.14; this.blinkT = 2.2 + Math.random() * 3.5; }
    if (this.blinking > 0) this.blinking -= dt;
    const open = this.talking ? (Math.sin(this.t * 22) > -0.1 ? 1 : 0) : 0;
    const blink = this.blinking > 0 && this.faceName === 'normal';
    if (open !== this._lo || blink !== this._lb) { this._lo = open; this._lb = blink; this._face(blink ? 'closed' : this.faceName, open); }
    if (this.emoSprite) { this.emoT -= dt; this.emoSprite.position.y = 1.08 + 0.03 * Math.sin(this.t * 3); this.emoSprite.material.opacity = Math.min(1, this.emoT * 2); if (this.emoT <= 0) this.emote(null); }
    if (this.vrm) this.vrm.update(dt);
    if (this.mixer && this.useClips) this.mixer.update(dt);
  }
  setLight(yaw, pitch, contrast) { const L = lightOf(yaw, pitch, contrast); (this.mats || []).forEach(m => { if (!m.uniforms || !m.uniforms.lightDir) return; m.uniforms.lightDir.value.copy(L.dir); m.uniforms.ambient.value = L.amb; m.uniforms.gain.value = L.gain; }); }
  setDim(v) { (this.mats || []).forEach(m => { if (m.uniforms && m.uniforms.dim) m.uniforms.dim.value = v; }); }
  dispose() { this.holder.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); if (m.uniforms && m.uniforms.map && m.uniforms.map.value) m.uniforms.map.value.dispose(); m.dispose(); }); }); if (this._disposeFaces) this._disposeFaces(); }
}

// 让模型站好：朝 +z、高 1、脚底在 0、居中
function normalize(av, obj, faceFix) {
  const wrap = new THREE.Group(); wrap.add(obj); if (faceFix) wrap.rotation.y = PI;
  av.inner.add(wrap); av.inner.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(wrap, true); const sz = box.getSize(V(0, 0, 0)); const h = sz.y || 1;
  const s = 1 / h; wrap.scale.setScalar(s);
  av.inner.updateWorldMatrix(true, true); const b2 = new THREE.Box3().setFromObject(wrap, true); const c = b2.getCenter(V(0, 0, 0));
  wrap.position.x -= c.x; wrap.position.z -= c.z; wrap.position.y -= b2.min.y;
  av.inner.updateWorldMatrix(true, true);
  return wrap;
}

// 骨头名字 → 部位（混合 Mixamo / VRoid / Unity / MMD / Blender 常见命名）
function boneMap(root) {
  const bones = []; root.traverse(o => { if (o.isBone || o.type === 'Bone') bones.push(o); });
  const raw = b => String(b.name || '');
  const nm = b => raw(b).toLowerCase().replace(/mixamorig\d*:?|bip0?1/g, '').replace(/[\s_.:\-]/g, '');
  const side = b => { const r = raw(b), l = r.toLowerCase(); if (/左/.test(r)) return 'L'; if (/右/.test(r)) return 'R'; if (/left/.test(l)) return 'L'; if (/right/.test(l)) return 'R';
    if (/(^|[_.\s:\-])l([_.\s:\-]|$)/.test(l)) return 'L'; if (/(^|[_.\s:\-])r([_.\s:\-]|$)/.test(l)) return 'R'; if (/^l(upperarm|arm|upleg|thigh|leg)/.test(nm(b))) return 'L'; if (/^r(upperarm|arm|upleg|thigh|leg)/.test(nm(b))) return 'R'; return ''; };
  const find = (re, s, not) => bones.find(b => { const n = nm(b), r = raw(b); return (re.test(n) || re.test(r)) && !(not && (not.test(n) || not.test(r))) && (!s || side(b) === s); });
  const M = {};
  M.hips = find(/hips|pelvis/) || find(/センター|^center$|^cog$|^root$/i) || bones[0];
  M.spine = find(/spine$|^spine0?1$|上半身$|^chest$/, '', /spine[2-9]|上半身2/) || find(/spine|上半身|chest/);
  M.head = find(/head$|^頭$/, '', /top|end|nub|neck/) || find(/head|頭/, '', /top|end|nub|neck|先/);
  const ARM = /upperarm|arm$|腕$|^左腕|^右腕/, ARMX = /fore|lower|twist|捩|ひじ|肘|手首|hand|ik|shoulder|clavicle|肩|elbow/;
  M.armL = find(ARM, 'L', ARMX); M.armR = find(ARM, 'R', ARMX);
  const LEGD = /足d$|足Ｄ$/, LEG = /upleg|upperleg|thigh|^leg$|leg$|足$/, LEGX = /lower|calf|shin|knee|ひざ|首|foot|toe|ik|ＩＫ|先|end/;
  M.legL = find(LEGD, 'L') || find(LEG, 'L', LEGX); M.legR = find(LEGD, 'R') || find(LEG, 'R', LEGX);
  return M;
}
const firstChildBone = b => b && b.children.find(c => c.isBone || c.type === 'Bone');

// 表情 / 口型：在 morph 里找名字
function morphFace(av, root) {
  const metas = []; root.traverse(o => { if (o.morphTargetDictionary && o.morphTargetInfluences) metas.push(o); });
  if (!metas.length) return;
  const keys = { blink: /blink|まばたき|eyeclose|eyes?_?close|eye_close/i, aa: /^aa$|^a$|^あ$|mouth_?a|vrc\.v_aa|jawopen|mouthopen|^ah?$/i, happy: /happy|joy|笑い|smile|fun/i, angry: /angry|怒り|anger/i, sad: /sad|sorrow|困る|悲/i, surprised: /surpris|びっくり|驚/i };
  const map = {}; metas.forEach(m => Object.keys(m.morphTargetDictionary).forEach(k => { for (const key in keys) if (!map[key] && keys[key].test(k)) map[key] = k; }));
  const set = (key, v) => { const k = map[key]; if (!k) return; metas.forEach(m => { const i = m.morphTargetDictionary[k]; if (i != null) m.morphTargetInfluences[i] = v; }); };
  av._face = (f, open) => { set('blink', f === 'closed' ? 1 : 0); set('happy', f === 'happy' || f === 'shy' ? 1 : 0); set('angry', f === 'angry' ? 1 : 0); set('sad', f === 'sad' ? 1 : 0); set('surprised', f === 'surprised' ? 1 : 0); set('aa', open ? 0.8 : 0); };
}

// ---- 各种来源 ----
// 低模小人（kkeist 的做法）：desc = {N, front, back, labels, parts, thick, round, step, facet, backMirror, faces?(face, open)=>canvas}
export async function fromDoll(desc) {
  const av = new Avatar(); av.kind = desc.kind || 'doll';
  if (desc.shape === 'mii' && desc.look) return fromMii(desc.look, desc);
  const r = buildDoll(desc);
  av.inner.add(r.root); av.legLen = r.legLen; av.mats = r.mats;
  // 图里举着的手 / 分开的腿：静止姿势先转回下垂（动作都是按下垂写的）
  const base = b => r.rot && r.rot[b] ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), r.rot[b]) : undefined;
  const B = r.bones; [['hips', 'root'], ['spine', 'body'], ['head', 'head'], ['armL', 'armL'], ['armR', 'armR'], ['legL', 'legL'], ['legR', 'legR']].forEach(([n, b]) => av.addJoint(n, B[b], base(b)));
  av.root3 = r.root;
  if (desc.faces) {
    const tex = {}; const get = (f, o) => { const key = f + (o ? '1' : '0'); if (tex[key]) return tex[key]; const cv = desc.faces(f, o); if (!cv) return null; const t = new THREE.CanvasTexture(bleed(cv)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (r.pixel) { t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; } tex[key] = t; return t; };
    tex.normal0 = r.texF;
    av._face = (f, open) => { const t = get(f || 'normal', open); if (t && r.matF.uniforms.map.value !== t) r.matF.uniforms.map.value = t; };
  }
  return av;
}
export async function fromPic(desc) { return fromDoll(desc); }
export function chibiDesc(look, opt = {}) {
  const f = drawChibi(look, 'front'), b = drawChibi(look, 'back');
  const o = Object.assign({}, look || {}, opt || {});
  return { kind: 'chibi', N: f.N, front: f.canvas, back: b.canvas, labels: f.labels, parts: o.parts, thick: o.thick, round: o.round, step: o.step, facet: o.facet, shape: o.shape, block: o.block, pixel: o.pixel, lightYaw: o.lightYaw, lightPitch: o.lightPitch, lightContrast: o.lightContrast, backMirror: false, faces: (fc, op) => drawChibi(look, 'front', fc, op).canvas };
}
export async function fromChibi(look, opt) { const o = Object.assign({}, look || {}, opt || {}); if (o.shape === 'mii') return fromMii(look, o); return fromDoll(chibiDesc(look, opt)); }
// 「朋友收集」风：按捏人选项直接搭出来的圆润小人
export async function fromMii(look, opt = {}) {
  const av = new Avatar(); av.kind = 'chibi';
  const r = buildMii(look, opt);
  av.inner.add(r.root); av.legLen = r.legLen; av.mats = r.mats;
  const B = r.bones; [['hips', 'root'], ['spine', 'body'], ['head', 'head'], ['armL', 'armL'], ['armR', 'armR'], ['legL', 'legL'], ['legR', 'legR']].forEach(([n, b]) => av.addJoint(n, B[b]));
  av.root3 = r.root;
  av._face = (f, open) => { const t = r.getFace(f || 'normal', open ? 1 : 0); if (r.faceMat.uniforms.map.value !== t) r.faceMat.uniforms.map.value = t; };
  return av;
}

export async function fromVRM(buf) {
  const loader = new GLTFLoader(); loader.register(p => new VRMLoaderPlugin(p));
  const gltf = await loader.parseAsync(buf, '');
  const vrm = gltf.userData.vrm; if (!vrm) return fromGLTF(gltf);
  try { VRMUtils.removeUnnecessaryVertices(gltf.scene); VRMUtils.removeUnnecessaryJoints ? VRMUtils.removeUnnecessaryJoints(gltf.scene) : 0; } catch (e) {}
  try { VRMUtils.rotateVRM0(vrm); } catch (e) {}
  vrm.scene.traverse(o => { o.frustumCulled = false; if (o.isMesh) o.castShadow = true; });
  const av = new Avatar(); av.kind = 'vrm'; av.vrm = vrm;
  normalize(av, vrm.scene, false);
  const H = vrm.humanoid; const nb = n => H.getNormalizedBoneNode(n);
  vrm.update(0);
  av.addJoint('hips', nb('hips')); av.addJoint('spine', nb('spine')); av.addJoint('head', nb('head'));
  av.addJoint('armL', nb('leftUpperArm'), av.armBase('armL', nb('leftUpperArm'), nb('leftLowerArm'), 1));
  av.addJoint('armR', nb('rightUpperArm'), av.armBase('armR', nb('rightUpperArm'), nb('rightLowerArm'), -1));
  av.addJoint('legL', nb('leftUpperLeg')); av.addJoint('legR', nb('rightUpperLeg'));
  av.inner.updateWorldMatrix(true, true);
  const hp = V(0, 0, 0); nb('hips').getWorldPosition(hp); av.legLen = av.inner.worldToLocal(hp).y;
  const EM = vrm.expressionManager;
  av._face = (f, open) => { if (!EM) return; const set = (k, v) => { try { EM.setValue(k, v); } catch (e) {} }; ['happy', 'angry', 'sad', 'surprised', 'relaxed', 'blink', 'aa'].forEach(k => set(k, 0)); if (f === 'closed') set('blink', 1); if (f === 'happy') set('happy', 1); if (f === 'shy') set('relaxed', 1); if (f === 'angry') set('angry', 1); if (f === 'sad') set('sad', 1); if (f === 'surprised') set('surprised', 1); if (open) set('aa', 0.8); };
  return av;
}
function fromSkinned(obj, kind, gltfAnims) {
  const av = new Avatar(); av.kind = kind;
  obj.traverse(o => { o.frustumCulled = false; if (o.isMesh) { o.castShadow = true; } });
  // 先判断朝向：角色的左手应该在 +x
  obj.updateWorldMatrix(true, true);
  let M = boneMap(obj);
  let flip = false;
  if (M.armL && M.armR) { const a = V(0, 0, 0).setFromMatrixPosition(M.armL.matrixWorld), b = V(0, 0, 0).setFromMatrixPosition(M.armR.matrixWorld); flip = a.x < b.x; }
  else if (kind === 'pmx') flip = true;
  normalize(av, obj, flip);
  M = boneMap(obj);
  ['hips', 'spine', 'head', 'legL', 'legR'].forEach(n => M[n] && av.addJoint(n, M[n]));
  if (M.armL) av.addJoint('armL', M.armL, av.armBase('armL', M.armL, firstChildBone(M.armL), 1));
  if (M.armR) av.addJoint('armR', M.armR, av.armBase('armR', M.armR, firstChildBone(M.armR), -1));
  if (M.hips) { const hp = V(0, 0, 0); M.hips.getWorldPosition(hp); av.legLen = Math.max(0.1, av.inner.worldToLocal(hp).y); }
  if (!Object.keys(av.J).length) av.noBones = true;
  morphFace(av, obj);
  if (gltfAnims && gltfAnims.length) { av.mixer = new THREE.AnimationMixer(obj); av.clips = gltfAnims; }
  return av;
}
function fromGLTF(gltf) { return fromSkinned(gltf.scene, 'glb', gltf.animations); }
export async function fromGLB(buf) { const gltf = await new GLTFLoader().parseAsync(buf, ''); if (gltf.userData && gltf.userData.vrm) return fromVRM(buf); return fromGLTF(gltf); }
export async function fromFBX(buf) { const obj = new FBXLoader().parse(buf, ''); return fromSkinned(obj, 'fbx', obj.animations); }
// PMX：files = {相对路径: ArrayBuffer}（选整个文件夹，贴图跟着找）
export async function fromPMX(files, main) {
  const urls = {}; const low = {};
  Object.keys(files).forEach(k => { const u = URL.createObjectURL(new Blob([files[k]])); const n = k.replace(/\\/g, '/'); urls[n] = u; low[n.toLowerCase()] = u; low[n.split('/').pop().toLowerCase()] = low[n.split('/').pop().toLowerCase()] || u; });
  const mainKey = main || Object.keys(files).find(k => /\.pmx$|\.pmd$/i.test(k));
  const base = mainKey.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
  const mgr = new THREE.LoadingManager();
  mgr.setURLModifier(u => { if (/^blob:|^data:/.test(u)) return u; if (/gyx-main\.(pmx|pmd)$/.test(u)) return urls[mainKey.replace(/\\/g, '/')]; let p = decodeURIComponent(u).replace(/\\/g, '/').replace(/^\.\//, ''); const cands = [p, (base ? base + '/' : '') + p, p.split('/').pop()]; for (const c of cands) { const v = urls[c] || low[c.toLowerCase()]; if (v) return v; } return u; });
  const loader = new MMDLoader(mgr);
  const ext = /\.pmd$/i.test(mainKey) ? 'pmd' : 'pmx';
  const mesh = await new Promise((res, rej) => loader.load('gyx-main.' + ext, res, null, rej));
  // MMDLoader 用文件名猜格式；主文件名换成上面那个
  return fromSkinned(mesh, 'pmx');
}
// 统一入口：desc 是存起来的那份
export async function build(desc) {
  if (!desc) throw new Error('没有模型');
  if (desc.kind === 'chibi') return fromChibi(desc.look || {}, desc);
  if (desc.kind === 'pic' || desc.kind === 'doll') {
    const img = async s => { if (!s) return null; if (s instanceof HTMLCanvasElement) return s; const im = new Image(); im.src = s; await im.decode(); const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); return c; };
    if (desc.kind === 'pic') {   // 老版本存的：图 + W×H 的标签 → 换成方格
      const front = await img(desc.front), back = await img(desc.back); const labels = desc.labels instanceof Uint8Array ? desc.labels : unpackLabels(desc.labels, desc.W * desc.H);
      const d = imageToDoll(front, { labels, W: desc.W, H: desc.H, back }); return fromDoll(Object.assign(d, { thick: desc.thick, round: desc.round, step: desc.step }));
    }
    const d = await dollFromSaved(desc, img); return fromDoll(d);
  }
  if (desc.kind === 'vrm') return fromVRM(desc.buf);
  if (desc.kind === 'glb') return fromGLB(desc.buf);
  if (desc.kind === 'fbx') return fromFBX(desc.buf);
  if (desc.kind === 'pmx') return fromPMX(desc.files, desc.main);
  throw new Error('不认识的模型');
}
// 标签压缩（游程）：存起来小很多
// 存起来的低模小人 → 能画的那份：底图（捏的 / 图片）+ 你画的那层 + 改过的部位
export async function dollFromSaved(s, img) {
  img = img || (async x => { if (!x) return null; if (x instanceof HTMLCanvasElement) return x; const im = new Image(); im.src = x; await im.decode(); const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); return c; });
  const N = s.N || 256;
  const U8 = v => !v ? null : v instanceof Uint8Array ? v : unpackLabels(v, N * N);
  let front, back, labels, faces = null;
  if (s.look) { const f = drawChibi(s.look, 'front'), b = drawChibi(s.look, 'back'); front = f.canvas; back = b.canvas; labels = f.labels; }
  else { front = await img(s.front); back = s.back ? await img(s.back) : null; labels = U8(s.labels) || new Uint8Array(N * N); }
  const over = { f: await img(s.paintF), b: await img(s.paintB) }, er = { f: U8(s.eraseF), b: U8(s.eraseB) };
  const compose = (base, ov, erase) => { const c = document.createElement('canvas'); c.width = N; c.height = N; const x = c.getContext('2d'); if (base) x.drawImage(base, 0, 0, N, N); if (erase) { const im = x.getImageData(0, 0, N, N); for (let i = 0; i < N * N; i++) if (erase[i]) im.data[i * 4 + 3] = 0; x.putImageData(im, 0, 0); } if (ov) x.drawImage(ov, 0, 0, N, N); return c; };
  if (s.labEdit) { const E = U8(s.labEdit); labels = labels.slice(); for (let i = 0; i < E.length; i++) if (E[i] !== 255) labels[i] = E[i]; }
  if (!back) back = backFromFront(front, labels, N);
  if (s.look) faces = (fc, op) => compose(drawChibi(s.look, 'front', fc, op).canvas, over.f, er.f);
  return { kind: 'doll', N, front: compose(front, over.f, er.f), back: compose(back, over.b, er.b), labels, baseFront: front, baseBack: back, shape: s.shape, block: s.block, pixel: s.pixel, parts: s.parts, thick: s.thick, round: s.round, step: s.step, facet: s.facet, backMirror: false, faces, lightYaw: s.lightYaw, lightPitch: s.lightPitch, lightContrast: s.lightContrast, look: s.look, skel: s.skel, straight: s.straight, miiH: s.miiH, miiW: s.miiW, miiHead: s.miiHead };
}
export function packLabels(L) { const out = []; let v = L[0], n = 0; for (let i = 0; i < L.length; i++) { if (L[i] === v && n < 65535) n++; else { out.push(v, n); v = L[i]; n = 1; } } out.push(v, n); return out.join(','); }
export function unpackLabels(s, len) { const a = String(s || '').split(',').map(Number), L = new Uint8Array(len); let p = 0; for (let i = 0; i < a.length; i += 2) { L.fill(a[i], p, p + a[i + 1]); p += a[i + 1]; } return L; }

// ---------------------------------------------------------------------------
// 单人小舞台（桌面小 TA / 预览）：透明背景，能拖着转
// ---------------------------------------------------------------------------
export class Stage {
  constructor(canvas, opt = {}) {
    this.canvas = canvas; this.opt = opt;
    this.r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: !!opt.snap });
    this.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(opt.fov || 26, 1, 0.05, 50);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a8c9, 2.2));
    const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(1.5, 3, 4); this.scene.add(dl);
    if (opt.shadow !== false) {
      // 地上的影子：真的投影（光从左上前方来，跟小人的上色一个方向）+ 脚下一圈淡淡的
      this.r.shadowMap.enabled = true; this.r.shadowMap.type = THREE.PCFSoftShadowMap;
      const L = new THREE.DirectionalLight(0xffffff, 0.01); L.position.set(-0.335 * 4, 0.839 * 4 + 0.5, 0.429 * 4); L.target.position.set(0, 0.5, 0); L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.radius = 4; Object.assign(L.shadow.camera, { left: -1.2, right: 1.2, top: 1.6, bottom: -0.6, near: 0.1, far: 10 }); this.scene.add(L, L.target);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.18 })); pl.rotation.x = -PI / 2; pl.receiveShadow = true; this.scene.add(pl);
      const sh = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08, depthWrite: false })); sh.rotation.x = -PI / 2; sh.position.y = 0.002; this.scene.add(sh); this.sh = sh; }
    this.spin = 0; this.tilt = 0.08; this.zoom = opt.zoom || 1; this.av = null; this.last = performance.now(); this.alive = true;
    if (opt.drag !== false) this._drag();
    const loop = () => { if (!this.alive) return; this.raf = requestAnimationFrame(loop); if (document.hidden && !opt.always) return; this.frame(); };
    loop();
  }
  _drag() { let d = null; this.canvas.addEventListener('pointerdown', e => { d = { x: e.clientX, y: e.clientY, s: this.spin, t: this.tilt }; }); addEventListener('pointermove', e => { if (!d) return; this.spin = d.s + (e.clientX - d.x) * 0.012; this.tilt = Math.max(-0.3, Math.min(0.7, d.t + (e.clientY - d.y) * 0.006)); }); addEventListener('pointerup', () => d = null); this.canvas.addEventListener('wheel', e => { e.preventDefault(); this.zoom = Math.max(0.5, Math.min(2.5, this.zoom * (e.deltaY > 0 ? 0.92 : 1.08))); }, { passive: false }); }
  set(av) { if (this.av) { this.scene.remove(this.av.holder); this.av.dispose(); } this.av = av; if (av) { av.holder.traverse(o => { if (o.isMesh) o.castShadow = true; }); this.scene.add(av.holder); } }
  frame() {
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    const w = this.canvas.clientWidth || this.canvas.width, h = this.canvas.clientHeight || this.canvas.height;
    if (this.canvas.width !== Math.round(w * this.r.getPixelRatio()) || this.canvas.height !== Math.round(h * this.r.getPixelRatio())) this.r.setSize(w, h, false);
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    if (this.av) { this.av.update(dt); this.av.holder.rotation.y = this.spin; }
    const fit = (this.opt.fit || 1.25) / this.zoom, dist = fit / (2 * Math.tan(this.cam.fov * PI / 360)) / Math.min(1, w / h);
    this.cam.position.set(0, 0.52 + Math.sin(this.tilt) * dist, Math.cos(this.tilt) * dist); this.cam.lookAt(0, 0.5 - (this.opt.lift || 0), 0);
    this.r.render(this.scene, this.cam);
  }
  snap(type = 'image/png') { this.frame(); return this.canvas.toDataURL(type); }
  dispose() { this.alive = false; cancelAnimationFrame(this.raf); this.set(null); this.r.dispose(); }
}

// ---------------------------------------------------------------------------
// 3D 小屋
// ---------------------------------------------------------------------------
const box = (w, h, d, col, x, y, z, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: col, flatShading: true })); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m; };
const cyl = (r1, r2, h, col, x, y, z, seg, parent) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 8), new THREE.MeshLambertMaterial({ color: col, flatShading: true })); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m; };
export const ROOM_W = 8, ROOM_D = 6;
// 屋里能去的地方：pos 站/坐的位置，rot 朝向，state 到了做什么，y 坐/躺的高度
export const SPOTS = {
  bed: { n: '床上', pos: [2.2, -0.3], y: 0.5, rot: 0, state: 'sleep' },
  bed2: { n: '床上另一边', pos: [2.9, -0.3], y: 0.5, rot: 0, state: 'sleep' },
  bedside: { n: '床边', pos: [1.35, 0.1], rot: 1.2, state: 'sit', y: 0.36 },
  table1: { n: '餐桌', pos: [-1.95, 1.0], y: 0.3, rot: PI / 2, state: 'eat' },
  table2: { n: '餐桌对面', pos: [-0.45, 1.0], y: 0.3, rot: -PI / 2, state: 'eat' },
  sofa: { n: '沙发', pos: [-0.5, -1.95], y: 0.3, rot: 0, state: 'read' },
  sofa2: { n: '沙发另一头', pos: [0.45, -1.95], y: 0.3, rot: 0, state: 'daze' },
  window: { n: '窗边', pos: [-2.4, -2.2], rot: PI, state: 'daze' },
  shelf: { n: '书架前', pos: [-3.1, -1.6], rot: PI, state: 'think' },
  rug: { n: '地毯上', pos: [0.6, 0.6], rot: 0, state: 'idle' },
  door: { n: '门口', pos: [3.3, 2.4], rot: -2.4, state: 'idle' }
};
export class Room {
  constructor(canvas, overlay, opt = {}) {
    this.canvas = canvas; this.ov = overlay; this.opt = opt;
    this.r = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); this.r.outputColorSpace = THREE.SRGBColorSpace; this.r.shadowMap.enabled = true; this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(opt.bg || 0xf3ede6);
    this.cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.camYaw = 0.62; this.camDist = 14.5;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xd8c8b8, 1.9); this.scene.add(this.hemi);
    const dl = new THREE.DirectionalLight(0xfff4e6, 1.5); dl.position.set(4, 9, 5); dl.castShadow = true; dl.shadow.mapSize.set(1024, 1024); Object.assign(dl.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 }); this.scene.add(dl); this.sun = dl;
    this.avs = {}; this.items = new THREE.Group(); this.scene.add(this.items); this.tap = null; this.last = performance.now(); this.alive = true; this.bubbles = {};
    this.build(opt.wall || '#f6efe6', opt.floor || '#d9c3a5');
    this._input();
    const loop = () => { if (!this.alive) return; this.raf = requestAnimationFrame(loop); if (document.hidden) return; this.frame(); };
    loop();
  }
  build(wall, floor) {
    const opt = this.opt;
    const g = this.house = new THREE.Group(); this.scene.add(g);
    const W = ROOM_W, D = ROOM_D;
    const fl = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), new THREE.MeshLambertMaterial({ color: floor })); fl.position.y = -0.1; fl.receiveShadow = true; fl.name = 'floor'; g.add(fl); this.floor = fl;
    for (let i = -W / 2 + 0.5; i < W / 2; i += 1) { const ln = box(0.02, 0.005, D, new THREE.Color(floor).multiplyScalar(0.9), i, 0, 0, g); ln.castShadow = false; }
    this.wallMat = new THREE.MeshLambertMaterial({ color: wall });
    const bw = new THREE.Mesh(new THREE.BoxGeometry(W, 3, 0.2), this.wallMat); bw.position.set(0, 1.5, -D / 2 - 0.1); bw.receiveShadow = true; g.add(bw);
    const lw = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, D + 0.2), this.wallMat); lw.position.set(-W / 2 - 0.1, 1.5, -0.1); lw.receiveShadow = true; g.add(lw);
    box(W, 0.12, 0.06, '#ffffff', 0, 0, -D / 2 + 0.03, g); box(0.06, 0.12, D, '#ffffff', -W / 2 + 0.03, 0, 0, g);
    // 窗户（后墙偏左）
    const win = new THREE.Group(); win.position.set(-2.4, 1.15, -D / 2 + 0.02); g.add(win);
    box(1.5, 1.1, 0.06, '#ffffff', 0, 0, 0, win); const sky = box(1.36, 0.96, 0.07, '#bfe3ff', 0, 0.07, 0.005, win); sky.material = new THREE.MeshBasicMaterial({ color: '#bfe3ff' }); box(0.05, 0.96, 0.08, '#ffffff', 0, 0.07, 0.01, win); box(1.36, 0.05, 0.08, '#ffffff', 0, 0.52, 0.01, win);
    box(1.7, 0.06, 0.26, '#ffffff', 0, -0.04, 0.12, win);   // 窗台
    win.traverse(o => o.userData.tap = 'window'); this.winSky = sky;
    // 床（右后角）
    const bed = new THREE.Group(); bed.position.set(2.55, 0, -1.5); g.add(bed);
    box(1.5, 0.3, 2.6, '#c79f7d', 0, 0, 0, bed); box(1.42, 0.14, 2.5, '#ffffff', 0, 0.3, 0, bed); box(1.44, 0.1, 1.7, opt.blanket || '#f2a7b5', 0, 0.42, 0.4, bed); box(1.0, 0.12, 0.45, '#ffffff', 0, 0.44, -0.95, bed); box(1.5, 0.9, 0.12, '#b38664', 0, 0, -1.3, bed);
    bed.traverse(o => o.userData.tap = 'bed');
    // 餐桌 + 两个小凳子（左前）
    const tb = new THREE.Group(); tb.position.set(-1.2, 0, 1.0); g.add(tb);
    cyl(0.62, 0.62, 0.06, '#e9d3b4', 0, 0.55, 0, 12, tb); cyl(0.07, 0.1, 0.55, '#b48a64', 0, 0, 0, 6, tb); cyl(0.3, 0.3, 0.03, '#b48a64', 0, 0, 0, 8, tb);
    cyl(0.12, 0.12, 0.05, '#ffffff', -0.32, 0.61, 0.05, 10, tb); cyl(0.12, 0.12, 0.05, '#ffffff', 0.32, 0.61, -0.05, 10, tb);   // 两个碗
    [-0.75, 0.75].forEach(x => { cyl(0.22, 0.2, 0.06, '#f4c56a', x, 0.27, 0, 8, tb); cyl(0.04, 0.04, 0.27, '#b48a64', x, 0, 0, 5, tb); });
    tb.traverse(o => o.userData.tap = 'table');
    // 沙发（后墙中间）
    const sf = new THREE.Group(); sf.position.set(0, 0, -2.35); g.add(sf);
    box(2.3, 0.3, 0.9, opt.sofa || '#8fb3c9', 0, 0, 0, sf); box(2.3, 0.6, 0.25, opt.sofa || '#8fb3c9', 0, 0.3, -0.33, sf); box(0.25, 0.45, 0.9, new THREE.Color(opt.sofa || '#8fb3c9').multiplyScalar(0.9), -1.15, 0.0, 0, sf); box(0.25, 0.45, 0.9, new THREE.Color(opt.sofa || '#8fb3c9').multiplyScalar(0.9), 1.15, 0, 0, sf);
    box(0.4, 0.35, 0.12, '#ffe08a', -0.8, 0.32, -0.15, sf);
    sf.traverse(o => o.userData.tap = 'sofa');
    // 书架（左墙靠后）
    const sh = new THREE.Group(); sh.position.set(-3.65, 0, -1.6); g.add(sh);
    box(0.5, 1.9, 1.3, '#a77b56', 0, 0, 0, sh);
    const bc = ['#e66a6a', '#6a9ae6', '#f2c14e', '#6ac68f', '#a77be6', '#ef8fb0'];
    for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) box(0.36, 0.3 + (i % 3) * 0.04, 0.12, bc[(r + i) % 6], 0.08, 0.12 + r * 0.45, -0.5 + i * 0.18, sh);
    sh.traverse(o => o.userData.tap = 'shelf');
    // 地毯、植物、落地灯
    const rug = cyl(1.2, 1.2, 0.02, opt.rug || '#f6d6c8', 0.6, 0, 0.6, 20, g); rug.receiveShadow = true; rug.castShadow = false; rug.scale.z = 0.75; rug.userData.tap = 'rug';
    const pl = new THREE.Group(); pl.position.set(-3.4, 0, 2.4); g.add(pl); cyl(0.22, 0.17, 0.35, '#d98f62', 0, 0, 0, 7, pl); const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), new THREE.MeshLambertMaterial({ color: '#6cbf7a', flatShading: true })); leaf.position.y = 0.72; leaf.castShadow = true; pl.add(leaf);
    const lp = new THREE.Group(); lp.position.set(1.55, 0, -2.5); g.add(lp); cyl(0.2, 0.22, 0.04, '#555', 0, 0, 0, 8, lp); cyl(0.025, 0.025, 1.4, '#555', 0, 0, 0, 5, lp); cyl(0.18, 0.28, 0.3, '#fff3c8', 0, 1.4, 0, 8, lp);
    this.lamp = new THREE.PointLight(0xffd9a0, 0, 5); this.lamp.position.set(1.55, 1.5, -2.4); g.add(this.lamp);
    // 门
    box(0.9, 2.0, 0.06, '#c9a27e', 2.9, 0, -D / 2 + 0.03, g).userData.tap = 'door';
  }
  setColors(wall, floor) { this.wallMat.color.set(wall); this.floor.material.color.set(floor); }
  setNight(on) { this.scene.background.set(on ? 0x2a2c40 : (this.opt.bg || 0xf3ede6)); this.hemi.intensity = on ? 0.55 : 1.9; this.sun.intensity = on ? 0.25 : 1.5; this.lamp.intensity = on ? 6 : 0; this.night = on; Object.values(this.avs).forEach(a => a.av.setDim(on ? 0.62 : 1)); this.winSky.material.color.set(on ? '#2c3a6b' : '#bfe3ff'); }
  // 屋里的小物件：墙上的挂墙上，其它放地上（x,y 是 2D 小屋里的位置 0~1）
  setItems(list) {
    while (this.items.children.length) { const o = this.items.children.pop(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }
    (list || []).forEach(it => {
      let tex; if (it.img) { tex = new THREE.TextureLoader().load(it.img); tex.colorSpace = THREE.SRGBColorSpace; } else tex = emojiTex(it.ico || '🎁');
      const wallIt = it.y < 0.45;
      let m;
      if (wallIt) { const s = it.img ? 0.55 : 0.45; m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshLambertMaterial({ map: tex, transparent: !it.img, alphaTest: 0.1 })); m.position.set(-3.6 + it.x * 7.2, 2.6 - it.y * 3.2, -ROOM_D / 2 + 0.03); if (Math.abs(m.position.x + 2.4) < 0.9 && m.position.y < 1.8) m.position.y = 2.15; }
      else { m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true })); m.scale.set(0.42, 0.42, 0.42); m.position.set(-3.5 + it.x * 7, 0.22, -0.6 + (it.y - 0.45) * 5.6); }
      m.userData.item = it.id; this.items.add(m);
    });
  }
  add(key, av) { if (this.avs[key]) this.remove(key); const a = { av, key, tgt: null, path: [], onArrive: null }; this.avs[key] = a; av.holder.traverse(o => { if (o.isMesh) o.castShadow = true; o.userData.av = key; }); av.holder.scale.setScalar(this.opt.size || 1.15); this.scene.add(av.holder); if (this.night) av.setDim(0.62); return a; }
  remove(key) { const a = this.avs[key]; if (!a) return; this.scene.remove(a.av.holder); a.av.dispose(); delete this.avs[key]; if (this.bubbles[key]) { this.bubbles[key].remove(); delete this.bubbles[key]; } }
  place(key, x, z, rot) { const a = this.avs[key]; if (!a) return; a.av.holder.position.set(x, 0, z); if (rot != null) a.av.holder.rotation.y = rot; a.tgt = null; }
  // 走过去：to = {x,z} 或者地点名；到了以后做 state
  go(key, to, then) {
    const a = this.avs[key]; if (!a) return;
    let x, z, sp = null; if (typeof to === 'string') { sp = SPOTS[to]; if (!sp) return; [x, z] = sp.pos; } else ({ x, z } = to);
    x = Math.max(-ROOM_W / 2 + 0.35, Math.min(ROOM_W / 2 - 0.35, x)); z = Math.max(-ROOM_D / 2 + 0.35, Math.min(ROOM_D / 2 - 0.35, z));
    a.av.holder.position.y = 0;
    // 绕开大件：先走到「过道」再过去（很简单的两段路）
    const p = a.av.holder.position; const path = [];
    const blocked = (x0, z0) => (x0 > 1.7 && z0 < -0.4) || (x0 < -1.8 && z0 > 0.2 && z0 < 1.8 && Math.abs(x0 + 1.2) < 0.7) || (z0 < -1.8 && Math.abs(x0) < 1.3);
    if (blocked((p.x + x) / 2, (p.z + z) / 2)) path.push({ x: (p.x + x) / 2 * 0.3, z: 0.9 });
    path.push({ x, z }); a.path = path; a.spot = sp; a.then = then || null; a.av.setState(Math.hypot(x - p.x, z - p.z) > 3 ? 'run' : 'walk');
  }
  stop(key) { const a = this.avs[key]; if (!a) return; a.path = []; a.av.setState('idle'); }
  near(k1, k2) { const a = this.avs[k1], b = this.avs[k2]; if (!a || !b) return 99; return a.av.holder.position.distanceTo(b.av.holder.position); }
  face(key, otherKey) { const a = this.avs[key], b = this.avs[otherKey]; if (!a || !b) return; const d = b.av.holder.position.clone().sub(a.av.holder.position); a.av.holder.rotation.y = Math.atan2(d.x, d.z); }
  say(key, text, ms) {
    let b = this.bubbles[key]; if (!b) { b = document.createElement('div'); b.className = 'g3-bub'; this.ov.appendChild(b); this.bubbles[key] = b; }
    b.textContent = text; b.classList.add('on'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('on'), ms || Math.max(3500, String(text).length * 260));
    const a = this.avs[key]; if (a) { a.av.talk(true); clearTimeout(a._tt); a._tt = setTimeout(() => a.av.talk(false), Math.min(6000, 600 + String(text).length * 140)); }
  }
  _input() {
    const ray = new THREE.Raycaster(), m = new THREE.Vector2();
    let d = null;
    this.canvas.addEventListener('pointerdown', e => { d = { x: e.clientX, y: e.clientY, yaw: this.camYaw }; });
    addEventListener('pointermove', this._pm = e => { if (!d) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 6) { d.moved = true; this.camYaw = Math.max(-0.2, Math.min(1.35, d.yaw - dx * 0.005)); } });
    addEventListener('pointerup', this._pu = e => { if (!d) return; const was = d; d = null; if (was.moved || e.target !== this.canvas) return;
      const r = this.canvas.getBoundingClientRect(); m.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(m, this.cam);
      const hits = ray.intersectObjects(this.scene.children, true);
      for (const h of hits) { let o = h.object; let av = null, tap = null, item = null; while (o) { av = av || o.userData.av; tap = tap || o.userData.tap; item = item || o.userData.item; o = o.parent; }
        if (av) return this.tap && this.tap({ type: 'avatar', key: av });
        if (item) return this.tap && this.tap({ type: 'item', id: item });
        if (tap && tap !== 'rug') return this.tap && this.tap({ type: 'thing', name: tap, x: h.point.x, z: h.point.z });
        if (h.object === this.floor || tap === 'rug') return this.tap && this.tap({ type: 'floor', x: h.point.x, z: h.point.z }); }
    });
    this.canvas.addEventListener('wheel', e => { e.preventDefault(); this.camDist = Math.max(8, Math.min(22, this.camDist * (e.deltaY > 0 ? 1.08 : 0.93))); }, { passive: false });
  }
  frame() {
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight; if (!w || !h) return;
    if (this.canvas.width !== Math.round(w * this.r.getPixelRatio())) this.r.setSize(w, h, false);
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    const dist = this.camDist * (w / h < 1 ? 1.25 / (w / h) * 0.75 : 1);
    this.cam.position.set(Math.sin(this.camYaw) * dist * 0.72, dist * 0.68, Math.cos(this.camYaw) * dist * 0.72); this.cam.lookAt(0, 0.4, 0);
    for (const k in this.avs) {
      const a = this.avs[k], hd = a.av.holder;
      if (a.path.length) {
        const t = a.path[0], dx = t.x - hd.position.x, dz = t.z - hd.position.z, L = Math.hypot(dx, dz);
        const sp = (a.av.state === 'run' ? 2.4 : 1.25) * dt;
        const want = Math.atan2(dx, dz); let dr = want - hd.rotation.y; while (dr > PI) dr -= 2 * PI; while (dr < -PI) dr += 2 * PI; hd.rotation.y += dr * Math.min(1, dt * 10);
        if (L <= sp) { hd.position.x = t.x; hd.position.z = t.z; a.path.shift(); if (!a.path.length) { const s = a.spot; if (s) { hd.rotation.y = s.rot || 0; hd.position.y = s.y || 0; } a.av.setState((a.then && a.then.state) || (s && s.state) || 'idle'); if (a.then && a.then.fn) try { a.then.fn(); } catch (e) {} } }
        else { hd.position.x += dx / L * sp; hd.position.z += dz / L * sp; }
      }
      a.av.update(dt);
      const b = this.bubbles[k]; if (b) { const p = new THREE.Vector3(0, 1.25 * (this.opt.size || 1.15), 0); p.applyMatrix4(hd.matrixWorld).project(this.cam); b.style.left = ((p.x + 1) / 2 * w) + 'px'; b.style.top = ((1 - p.y) / 2 * h) + 'px'; }
    }
    this.r.render(this.scene, this.cam);
  }
  dispose() { this.alive = false; cancelAnimationFrame(this.raf); removeEventListener('pointermove', this._pm); removeEventListener('pointerup', this._pu); Object.keys(this.avs).forEach(k => this.remove(k)); this.r.dispose(); }
}
export const version = '1.0.0';
