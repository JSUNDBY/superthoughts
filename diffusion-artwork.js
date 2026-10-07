import {diffusion, ripples, unfurling} from './diffusion-nature.js';
/**
 * Three quiet, procedural light studies. No images, libraries, or shader effects.
 * The compositions use broad lit planes, translucent veils, and occluding folds.
 */

const VARIANTS = new Set(["opening", "unwinding", "revealing", "diffusion", "ripples", "unfurling"]);
const TAU = Math.PI * 2;
const MAX_PIXELS = 1_500_000;
const FRAME_MS = 1000 / 24;

function fillGradient(ctx, x0, y0, x1, y1, stops) {
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [position, color] of stops) gradient.addColorStop(position, color);
  ctx.fillStyle = gradient;
}

function radialGradient(ctx, x0, y0, r0, x1, y1, r1, stops) {
  const gradient = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
  for (const [position, color] of stops) gradient.addColorStop(position, color);
  ctx.fillStyle = gradient;
}

function path(ctx, commands) {
  ctx.beginPath();
  for (const [type, ...points] of commands) {
    if (type === "M") ctx.moveTo(...points);
    else if (type === "L") ctx.lineTo(...points);
    else if (type === "C") ctx.bezierCurveTo(...points);
    else if (type === "Q") ctx.quadraticCurveTo(...points);
    else if (type === "Z") ctx.closePath();
  }
}

function plane(ctx, commands, gradientCoordinates, stops) {
  path(ctx, commands);
  fillGradient(ctx, ...gradientCoordinates, stops);
  ctx.fill();
}

function wash(ctx, w, h, x, y, rx, ry, stops) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  radialGradient(ctx, 0, 0, 0, 0, 0, 1, stops);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function rect(ctx, w, h, stops, vertical = true) {
  fillGradient(ctx, 0, 0, vertical ? 0 : w, vertical ? h : 0, stops);
  ctx.fillRect(0, 0, w, h);
}

function opening(ctx, w, h, t) {
  const breath = Math.sin(t * .24);
  const drift = Math.sin(t * .13 + .5);
  const seam = w * (.575 + breath * .017);

  rect(ctx,w,h,[[0,"#0e213d"],[.52,"#2d4967"],[1,"#142743"]]);
  wash(ctx,w,h,w*.54,h*.48,w*.69,h*.84,[[0,"rgba(132,166,190,.24)"],[.58,"rgba(94,129,168,.12)"],[1,"rgba(94,129,168,0)"]]);

  // A curved shadow plane conceals the light; both ends continue beyond the frame.
  plane(ctx, [["M",0,-h*.1],["L",seam-w*.02,-h*.1],["C",seam-w*.13,h*.23,seam-w*.17,h*.65,seam-w*.025,h*1.1],["L",0,h*1.1],["Z"]], [0,0,seam,h], [[0,"#132844"],[.57,"#294762"],[.86,"#5d788c"],[1,"#899ba2"]]);
  wash(ctx,w,h,seam-w*.09,h*.52,w*.24,h*.81,[[0,"rgba(17,36,59,.31)"],[.65,"rgba(21,42,66,.12)"],[1,"rgba(21,42,66,0)"]]);

  // The revealed volume has no framed opening or hard top and bottom edges.
  const start = seam-w*.13;
  const end = seam+w*.33;
  path(ctx, [["M",start,-h*.12],["C",start-w*.02,h*.3,start-w*.035,h*.65,start+w*.018,h*1.12],["L",end,h*1.12],["C",end-w*.09,h*.7,end-w*.045,h*.25,end,-h*.12],["Z"]]);
  fillGradient(ctx,start,0,end,0,[[0,"rgba(220,230,226,0)"],[.17,"rgba(226,235,229,.55)"],[.43,"rgba(251,246,229,.85)"],[.68,"rgba(255,245,222,.76)"],[1,"rgba(233,230,213,0)"]]);
  ctx.fill();
  wash(ctx,w,h,seam+w*.085+drift*w*.008,h*.47,w*.29,h*.91,[[0,"rgba(255,248,229,.67)"],[.38,"rgba(248,245,231,.42)"],[.74,"rgba(230,236,232,.15)"],[1,"rgba(230,236,232,0)"]]);
  wash(ctx,w,h,seam+w*.07,h*.52,w*.42,h*.72,[[0,"rgba(255,244,215,.18)"],[.65,"rgba(210,224,226,.09)"],[1,"rgba(210,224,226,0)"]]);

  // Off-center contact glow outlines the lifted surface without drawing a doorway.
  const edge = seam - w*.018;
  plane(ctx, [["M",edge-w*.075,-h*.1],["C",edge-w*.135,h*.25,edge-w*.16,h*.65,edge-w*.03,h*1.1],["L",edge+w*.045,h*1.1],["C",edge-w*.065,h*.64,edge-w*.04,h*.25,edge+w*.045,-h*.1],["Z"]], [edge-w*.12,0,edge+w*.055,0], [[0,"rgba(207,223,226,0)"],[.47,"rgba(218,231,226,.13)"],[.72,"rgba(255,245,218,.52)"],[1,"rgba(254,248,231,0)"]]);

  // A translucent overfold and a soft lower shadow establish near and far layers.
  plane(ctx, [["M",w*.91,-h*.1],["C",w*.76,h*.2,w*.82,h*.71,w*.73,h*1.1],["L",w*1.1,h*1.1],["L",w*1.1,-h*.1],["Z"]], [w*.73,0,w,h], [[0,"rgba(32,58,84,.1)"],[.36,"rgba(34,63,91,.37)"],[1,"rgba(15,37,66,.92)"]]);
  wash(ctx,w,h,w*.45,h*1.04,w*.74,h*.39,[[0,"rgba(16,33,54,.23)"],[.58,"rgba(18,37,61,.1)"],[1,"rgba(18,37,61,0)"]]);
}

function unwinding(ctx, w, h, t) {
  const release = (Math.sin(t*.21-.4)+1)*.5;
  const sway = Math.sin(t*.12+.6)*w*.015;
  const seam = w*(.47+release*.047)+sway;
  const ribbon = w*(.10+release*.025);

  rect(ctx,w,h,[[0,"#281c25"],[.48,"#573439"],[1,"#301f2a"]]);
  wash(ctx,w,h,w*.62,h*.53,w*.62,h*.73,[[0,"rgba(183,109,99,.28)"],[.65,"rgba(158,83,79,.1)"],[1,"rgba(158,83,79,0)"]]);

  // Broad folded surfaces use long gradients to round the shadow and catch warm light.
  plane(ctx, [["M",0,-h*.1],["L",w*.81,-h*.1],["C",w*.51,h*.1,w*.24,h*.31,w*.31,h*.49],["C",w*.41,h*.72,w*.59,h*.86,w*.91,h*1.1],["L",0,h*1.1],["Z"]], [0,0,w*.92,h], [[0,"#3c252b"],[.42,"#694040"],[.73,"#9b625b"],[1,"#432a30"]]);
  plane(ctx, [["M",w*.8,-h*.1],["L",w*1.1,-h*.1],["L",w*1.1,h*1.1],["L",w*.76,h*1.1],["C",w*.93,h*.7,seam-w*.04,h*.52,seam,h*.32],["C",seam+w*.015,h*.15,w*.7,h*.02,w*.8,-h*.1],["Z"]], [w,0,w*.48,h], [[0,"#30232b"],[.4,"#714543"],[.74,"#ad786d"],[1,"#432b31"]]);
  wash(ctx,w,h,seam-w*.02,h*.42,w*.26,h*.53,[[0,"rgba(33,21,28,.42)"],[.55,"rgba(44,25,30,.16)"],[1,"rgba(44,25,30,0)"]]);

  // One diffused ivory fold takes the place of thin drawn highlights.
  plane(ctx, [["M",w*.76-ribbon*.55,-h*.1],["C",seam-w*.06,h*.11,seam-w*.09,h*.23,seam-w*.07,h*.41],["C",seam-w*.025,h*.62,w*.87,h*.76,w*.78,h*1.1],["L",w*.78+ribbon*.73,h*1.1],["C",w*.98,h*.74,seam+ribbon*.38,h*.58,seam+ribbon*.44,h*.4],["C",seam+ribbon*.44,h*.19,w*.79,h*.06,w*.76+ribbon*.75,-h*.1],["Z"]], [seam-ribbon*.9,0,seam+ribbon*.8,h], [[0,"rgba(240,208,182,0)"],[.2,"rgba(249,223,195,.17)"],[.46,"rgba(255,239,209,.72)"],[.66,"rgba(246,219,192,.38)"],[1,"rgba(228,184,161,0)"]]);
  wash(ctx,w,h,seam+w*.055,h*.47,w*.22,h*.65,[[0,"rgba(255,237,210,.33)"],[.47,"rgba(253,223,194,.15)"],[1,"rgba(253,223,194,0)"]]);

  // Shadows cross the fold with transparent ends, preserving the sense of a deep recess.
  plane(ctx, [["M",-w*.1,h*.37],["C",w*.22,h*.28,w*.41,h*.3,seam-w*.04,h*.45],["C",seam-w*.15,h*.67,w*.13,h*.73,-w*.1,h*.91],["Z"]], [0,h*.35,seam,h*.78], [[0,"rgba(42,25,30,.07)"],[.55,"rgba(38,23,29,.41)"],[1,"rgba(54,30,34,0)"]]);
  wash(ctx,w,h,w*.31,h*.86,w*.65,h*.28,[[0,"rgba(236,180,155,.19)"],[.58,"rgba(205,142,128,.08)"],[1,"rgba(205,142,128,0)"]]);
}

function revealing(ctx,w,h,t) {
  const rise = Math.sin(t*.17-.5)*h*.016;
  const slide = Math.sin(t*.11+1.3)*w*.013;
  const y = h*.40+rise;

  rect(ctx,w,h,[[0,"#0d1a2b"],[.53,"#1b3859"],[1,"#0b1b2d"]]);
  wash(ctx,w,h,w*.52,h*.49,w*.76,h*.67,[[0,"rgba(116,158,186,.29)"],[.55,"rgba(69,117,155,.12)"],[1,"rgba(69,117,155,0)"]]);
  ctx.save();
  ctx.translate(0,-h*.08);
  ctx.transform(1,h*.16/w,0,1,0,0);

  // A shaded upper volume and near occlusion part to expose one long light seam.
  plane(ctx, [["M",0,-h*.1],["L",w*1.1,-h*.1],["L",w*1.1,y-h*.14],["C",w*.78,y-h*.045,w*.38,y-h*.22,-w*.1,y-h*.055],["L",-w*.1,-h*.1],["Z"]], [0,0,w,h*.5], [[0,"#13263e"],[.5,"#335577"],[.8,"#1f3d5e"],[1,"#122944"]]);
  wash(ctx,w,h,w*.53,y-h*.06,w*.71,h*.23,[[0,"rgba(11,29,48,.27)"],[.55,"rgba(17,39,63,.11)"],[1,"rgba(17,39,63,0)"]]);

  // Transparent outer edges make the ivory light appear suspended in the gap.
  plane(ctx, [["M",-w*.1,y-h*.075],["C",w*.3,y-h*.2,w*.67,y+h*.005,w*1.1,y-h*.15],["L",w*1.1,y+h*.11],["C",w*.69,y+h*.24,w*.31,y+h*.01,-w*.1,y+h*.17],["Z"]], [0,y-h*.18,0,y+h*.2], [[0,"rgba(169,194,206,0)"],[.25,"rgba(203,219,215,.18)"],[.44,"rgba(252,242,218,.75)"],[.57,"rgba(254,246,224,.79)"],[.76,"rgba(166,198,209,.16)"],[1,"rgba(97,145,178,0)"]]);
  wash(ctx,w,h,w*.48,y+h*.008,w*.72,h*.19,[[0,"rgba(255,246,220,.53)"],[.49,"rgba(241,238,220,.2)"],[1,"rgba(241,238,220,0)"]]);

  plane(ctx, [["M",-w*.1,y+h*.13],["C",w*.27,y+h*.045,w*.69,y+h*.23,w*1.1,y+h*.035],["L",w*1.1,h*1.1],["L",-w*.1,h*1.1],["Z"]], [0,y+h*.12,w,h], [[0,"#173653"],[.45,"#315472"],[.74,"#163753"],[1,"#0d2239"]]);
  wash(ctx,w,h,w*.57,y+h*.17,w*.66,h*.24,[[0,"rgba(9,24,41,.32)"],[.56,"rgba(10,28,46,.11)"],[1,"rgba(10,28,46,0)"]]);

  // A restrained gold reflection follows the slow parting motion.
  const gx=w*.73+slide, gy=y+h*.12;
  wash(ctx,w,h,gx,gy,w*.15,h*.063,[[0,"rgba(244,210,154,.29)"],[.58,"rgba(241,204,148,.09)"],[1,"rgba(241,204,148,0)"]]);
  ctx.restore();
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{variant?: 'opening'|'unwinding'|'revealing'|'diffusion'|'ripples'|'unfurling', layout?: 'normal'|'mirror'|'cross'|'inverted', phase?:number}} options
 * @returns {{setVariant(name:string):void,setPaused(value:boolean):void,setDim(value:boolean):void,getState():object,destroy():void,readonly state:object}}
 */
export function createArtwork(canvas, { variant = "opening", layout = "normal", phase = 0 } = {}) {
  if (!VARIANTS.has(variant)) throw new Error(`Unknown artwork variant: ${variant}`);
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D is unavailable");

  const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let current = variant;
  let paused = !!media?.matches;
  let dim = false;
  let dimOpacity = 0;
  let dimTarget = 0;
  let hidden = document.hidden;
  let destroyed = false;
  let raf = 0;
  let previousFrame = 0;
  let elapsed = 0;
  let frameCount = 0;
  let lastSize = "";

  function size() {
    const box = canvas.getBoundingClientRect();
    const cssW = Math.max(1, box.width || canvas.clientWidth || 1);
    const cssH = Math.max(1, box.height || canvas.clientHeight || 1);
    const density = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(MAX_PIXELS / (cssW * cssH)));
    const pixelW = Math.max(1, Math.floor(cssW * density));
    const pixelH = Math.max(1, Math.floor(cssH * density));
    const key = `${pixelW}x${pixelH}`;
    if (key !== lastSize) {
      canvas.width = pixelW;
      canvas.height = pixelH;
      lastSize = key;
    }
    ctx.setTransform(pixelW / cssW, 0, 0, pixelH / cssH, 0, 0);
    return [cssW, cssH];
  }

  function render() {
    if (destroyed) return;
    const [w, h] = size();
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    if (current === "opening") opening(ctx,w,h,elapsed);
    else if (current === "unwinding") unwinding(ctx,w,h,elapsed);
    else if (current === "revealing") revealing(ctx,w,h,elapsed);
    else if (current === "diffusion") {
      if(layout === 'mirror'){ctx.translate(w,0);ctx.scale(-1,1);diffusion(ctx,w,h,elapsed+phase);}
      else if(layout === 'cross'){ctx.translate(w,0);ctx.rotate(Math.PI/2);diffusion(ctx,h,w,elapsed+phase);}
      else if(layout === 'inverted'){ctx.translate(w,h);ctx.rotate(Math.PI);diffusion(ctx,w,h,elapsed+phase);}
      else diffusion(ctx,w,h,elapsed+phase);
    }
    else if (current === "ripples") ripples(ctx,w,h,elapsed);
    else unfurling(ctx,w,h,elapsed);
    if (dimOpacity > 0) {
      ctx.fillStyle = `rgba(5, 12, 23, ${dimOpacity})`;
      ctx.fillRect(0,0,w,h);
    }
    ctx.restore();
    frameCount++;
    canvas.dataset.frameCount = String(frameCount);
    canvas.dataset.elapsed = elapsed.toFixed(3);
    canvas.dataset.dimCurrent = dimOpacity.toFixed(3);
  }

  function tick(now) {
    raf = 0;
    if (paused || hidden || destroyed) return;
    if (!previousFrame) previousFrame = now;
    const delta = now - previousFrame;
    if (delta >= FRAME_MS) {
      elapsed += Math.min(delta, 100) / 1000;
      if (dimOpacity !== dimTarget) {
        const step = .36 * Math.min(delta, 100) / 1500;
        dimOpacity += Math.sign(dimTarget - dimOpacity) * Math.min(Math.abs(dimTarget - dimOpacity), step);
      }
      previousFrame = now;
      render();
    }
    raf = requestAnimationFrame(tick);
  }

  function schedule() {
    if (!raf && !paused && !hidden && !destroyed) {
      previousFrame = 0;
      raf = requestAnimationFrame(tick);
    }
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    previousFrame = 0;
  }

  function visibility() {
    hidden = document.hidden;
    if (hidden) stop();
    else { render(); schedule(); }
  }

  function motionChange(event) {
    paused = event.matches;
    if (paused) { stop(); render(); }
    else schedule();
  }

  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(render) : null;
  observer?.observe(canvas);
  window.addEventListener("resize", render);
  document.addEventListener("visibilitychange", visibility);
  media?.addEventListener?.("change", motionChange);
  render();
  schedule();

  function snapshot() {
    return Object.freeze({ variant: current, paused, dim, dimOpacity, hidden, frameCount, time: elapsed, width: canvas.width, height: canvas.height });
  }

  return {
    setVariant(name) {
      if (!VARIANTS.has(name)) throw new Error(`Unknown artwork variant: ${name}`);
      current = name;
      elapsed = 0;
      render();
    },
    setPaused(value) {
      paused = !!value;
      if (paused) { stop(); render(); }
      else schedule();
    },
    setDim(value) {
      dim = !!value;
      dimTarget = dim ? .36 : 0;
      if (paused || hidden) {
        dimOpacity = dimTarget;
        render();
      } else schedule();
    },
    getState: snapshot,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      observer?.disconnect();
      window.removeEventListener("resize", render);
      document.removeEventListener("visibilitychange", visibility);
      media?.removeEventListener?.("change", motionChange);
    },
    get state() {
      return snapshot();
    }
  };
}
