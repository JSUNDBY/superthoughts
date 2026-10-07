/** Quiet, abstract studies of light passing through natural forms. Time is seconds. */
const TAU = Math.PI * 2;

function linear(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [p, color] of stops) g.addColorStop(p, color);
  ctx.fillStyle = g;
}

function ground(ctx, w, h, stops) {
  linear(ctx, 0, 0, w * .18, h, stops);
  ctx.fillRect(0, 0, w, h);
}

function glow(ctx, x, y, rx, ry, stops) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const [p, color] of stops) g.addColorStop(p, color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function shape(ctx, coords, stops, draw) {
  ctx.beginPath();
  draw();
  ctx.closePath();
  linear(ctx, ...coords, stops);
  ctx.save();
  ctx.filter = "blur(7px)";
  ctx.fill();
  ctx.restore();
}

/** Pearl light transmitted through overlapping, olive-gray contours. */
function paintDiffusion(ctx, w, h, t) {
  const breathe = Math.sin(t * .25);
  const sway = Math.sin(t * .18 + .8);
  const cx = w * (.53 + .018 * sway);

  ground(ctx, w, h, [[0, '#292e2e'], [.48, '#454c49'], [1, '#252b2b']]);
  glow(ctx, cx, h * .48, w * .66, h * .78, [[0, 'rgba(196,199,177,.26)'], [.47, 'rgba(154,165,147,.15)'], [1, 'rgba(150,162,145,0)']]);

  // A far translucent volume curves around the center instead of forming a flat panel.
  shape(ctx, [w * .12, 0, w * .82, h], [[0, '#343b39'], [.36, '#606961'], [.63, '#8b9283'], [1, '#4e5953']], () => {
    ctx.moveTo(-w * .12, -h * .12);
    ctx.bezierCurveTo(w * .42, -h * .12, w * (.69 + .012 * breathe), h * .10, w * (.66 + .018 * breathe), h * .45);
    ctx.bezierCurveTo(w * .63, h * .76, w * .84, h * 1.10, w * .78, h * 1.13);
    ctx.lineTo(-w * .12, h * 1.13);
  });
  glow(ctx, cx - w * .12, h * .54, w * .30, h * .69, [[0, 'rgba(25,34,33,.31)'], [.58, 'rgba(29,39,36,.13)'], [1, 'rgba(29,39,36,0)']]);

  // Wide luminous chamber, with the strongest light slightly off center.
  glow(ctx, cx + w * .09, h * .44, w * .42, h * .77, [[0, 'rgba(226,222,190,.70)'], [.33, 'rgba(207,209,181,.48)'], [.7, 'rgba(185,193,169,.17)'], [1, 'rgba(185,193,169,0)']]);
  glow(ctx, cx + w * .05, h * .53, w * .24, h * .58, [[0, 'rgba(239,230,200,.29)'], [.57, 'rgba(220,222,195,.12)'], [1, 'rgba(220,222,195,0)']]);

  // Near membranes roll from shade into light, then back into shade.
  shape(ctx, [w * .10, h * .12, w * .78, h * .80], [[0, '#252e2d'], [.32, '#424c46'], [.64, '#828b7c'], [.83, 'rgba(164,168,143,.55)'], [1, 'rgba(174,177,153,0)']], () => {
    ctx.moveTo(-w * .12, -h * .12);
    ctx.lineTo(w * (.35 + .012 * sway), -h * .12);
    ctx.bezierCurveTo(w * (.26 + .018 * breathe), h * .25, w * .31, h * .67, w * (.50 + .018 * sway), h * 1.12);
    ctx.lineTo(-w * .12, h * 1.12);
  });
  glow(ctx, w * .34, h * .57, w * .25, h * .77, [[0, 'rgba(30,39,37,.29)'], [.62, 'rgba(35,45,41,.11)'], [1, 'rgba(35,45,41,0)']]);
  shape(ctx, [w * .67, 0, w * .96, h * .72], [[0, 'rgba(168,174,151,0)'], [.23, 'rgba(129,140,122,.28)'], [.55, '#59645a'], [1, '#2d3834']], () => {
    ctx.moveTo(w * (.86 + .01 * breathe), -h * .12);
    ctx.bezierCurveTo(w * .73, h * .21, w * (.79 + .014 * sway), h * .59, w * .64, h * 1.12);
    ctx.lineTo(w * 1.12, h * 1.12);
    ctx.lineTo(w * 1.12, -h * .12);
  });
  glow(ctx, w * .57, h * 1.03, w * .59, h * .37, [[0, 'rgba(26,34,33,.23)'], [.62, 'rgba(29,37,35,.09)'], [1, 'rgba(29,37,35,0)']]);
}

/** Warm stone and almond membranes slowly opening around transmitted light. */
function paintUnfurling(ctx, w, h, t) {
  const open = Math.sin(t * .22 - .4);
  const lean = Math.sin(t * .17 + 1.1);
  const seam = w * (.50 + .018 * open);
  ground(ctx, w, h, [[0, '#373733'], [.50, '#585850'], [1, '#343632']]);
  glow(ctx, seam, h * .47, w * .61, h * .78, [[0, 'rgba(179,172,150,.25)'], [.62, 'rgba(151,149,132,.09)'], [1, 'rgba(151,149,132,0)']]);

  // The interior glow stays broad and low in contrast as its enclosure shifts.
  glow(ctx, seam + w * .08, h * .46, w * .40, h * .73, [[0, 'rgba(224,210,179,.56)'], [.37, 'rgba(207,195,167,.35)'], [.72, 'rgba(181,177,157,.13)'], [1, 'rgba(181,177,157,0)']]);
  shape(ctx, [w * .03, h * .10, w * .76, h * .88], [[0, '#343833'], [.35, '#61655b'], [.61, '#999b88'], [.82, 'rgba(185,180,153,.43)'], [1, 'rgba(202,191,163,0)']], () => {
    ctx.moveTo(-w * .12, -h * .12);
    ctx.lineTo(w * (.76 + .010 * lean), -h * .12);
    ctx.bezierCurveTo(w * .56, h * .19, seam - w * .19, h * .35, seam - w * (.10 + .009 * open), h * .53);
    ctx.bezierCurveTo(seam - w * .02, h * .77, w * .66, h * .92, w * .84, h * 1.12);
    ctx.lineTo(-w * .12, h * 1.12);
  });
  glow(ctx, seam - w * .10, h * .54, w * .31, h * .55, [[0, 'rgba(32,37,33,.32)'], [.59, 'rgba(41,45,39,.12)'], [1, 'rgba(41,45,39,0)']]);

  // A gently lit underside rounds the opening; its ends continue off canvas.
  shape(ctx, [w * .20, h * .26, w * .94, h * .90], [[0, 'rgba(178,177,155,0)'], [.23, 'rgba(186,179,153,.32)'], [.52, '#9b9984'], [.78, '#62665b'], [1, '#353a35']], () => {
    ctx.moveTo(w * (.87 + .011 * lean), -h * .12);
    ctx.lineTo(w * 1.12, -h * .12);
    ctx.lineTo(w * 1.12, h * 1.12);
    ctx.lineTo(w * .57, h * 1.12);
    ctx.bezierCurveTo(w * .80, h * .78, seam + w * (.13 + .010 * open), h * .51, w * .67, h * .29);
    ctx.bezierCurveTo(w * .70, h * .10, w * .78, h * .02, w * (.87 + .011 * lean), -h * .12);
  });
  glow(ctx, seam + w * .12, h * .48, w * .22, h * .62, [[0, 'rgba(224,210,177,.19)'], [.55, 'rgba(213,200,168,.07)'], [1, 'rgba(213,200,168,0)']]);
  shape(ctx, [0, h * .58, w * .80, h * 1.04], [[0, 'rgba(41,46,40,.16)'], [.43, 'rgba(50,53,46,.31)'], [.75, 'rgba(91,91,76,.28)'], [1, 'rgba(130,124,101,0)']], () => {
    ctx.moveTo(-w * .12, h * .62);
    ctx.bezierCurveTo(w * .20, h * .49, w * .38, h * .58, w * .70, h * 1.12);
    ctx.lineTo(-w * .12, h * 1.12);
  });
}

// A small soft-focus drawing surface avoids large per-layer filters on phone displays.
let surface;
function soften(paint, ctx, w, h, t, edge=480) {
  if (!surface) surface = document.createElement('canvas');
  const scale = Math.min(1, edge / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * scale));
  const sh = Math.max(1, Math.round(h * scale));
  if (surface.width !== sw || surface.height !== sh) {surface.width = sw; surface.height = sh;}
  const small = surface.getContext('2d', {alpha:false});
  small.clearRect(0,0,sw,sh);
  paint(small,sw,sh,t);
  ctx.save();
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(surface,0,0,w,h);
  ctx.restore();
}
export function diffusion(ctx,w,h,t){soften(paintDiffusion,ctx,w,h,t);}
export function unfurling(ctx,w,h,t){soften(paintUnfurling,ctx,w,h,t);}

// Continuous refraction: broad light ridges and their shadows bend together,
// without joining separate cut-out planes. The small field has no random noise.
function flowingField(ctx,w,h,t){
  const image=ctx.createImageData(w,h), pixels=image.data;
  const drift=t*.18;
  for(let y=0;y<h;y++){
    const v=y/h;
    for(let x=0;x<w;x++){
      const u=x/w;
      const curve=.13*Math.sin(u*4.4+drift)+.045*Math.sin(u*7.2-drift*.6);
      const d1=v-(.36+curve), d2=v-(.70+curve*.65+.035*Math.sin(drift*.8));
      const light=29*Math.exp(-d1*d1/.014)+20*Math.exp(-d2*d2/.021);
      const shadow=12*Math.exp(-Math.pow(d1+.10,2)/.014)+8*Math.exp(-Math.pow(d2+.09,2)/.012);
      const volume=6*Math.sin(u*3+v*2-drift*.3);
      const vignette=12*Math.pow(Math.abs(u-.5)*2,2)+7*Math.pow(Math.abs(v-.5)*2,2);
      const l=light-shadow+volume-vignette, i=(y*w+x)*4;
      pixels[i]=59+l;pixels[i+1]=76+l*.96;pixels[i+2]=85+l*.88;pixels[i+3]=255;
    }
  }
  ctx.putImageData(image,0,0);
}
export function ripples(ctx,w,h,t){soften(flowingField,ctx,w,h,t,320);}
