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

// Color belongs to the transmitted light itself; geometry and motion stay shared.
const LIGHT_PALETTES = {
  arrival: {shadow:'#18283c', base:'#3d4b64', fold:'#975769', lit:'#e4a468', light:'#ffe1a3', edge:'#bb6676', air:'#81a9c7'},
  pearl: {shadow:'#14273f', base:'#284c6c', fold:'#678ca7', lit:'#9fc9c2', light:'#e6e8de', edge:'#997eac', air:'#8cb6ce', reflection:'#ce98af', undertone:'#80c0b7'},
  honey: {shadow:'#302433', base:'#523b50', fold:'#557b94', lit:'#d3a6b5', light:'#f3e8dd', edge:'#ac6f89', air:'#93bad1', reflection:'#93c7d6', undertone:'#ca87a5'},
  slate: {shadow:'#1b2931', base:'#345650', fold:'#689279', lit:'#a3c7ba', light:'#e3e5d3', edge:'#6d8eaa', air:'#89b9ba', reflection:'#9aa5d1', undertone:'#c18d9e'},
  linen: {shadow:'#182b35', base:'#355a67', fold:'#609c97', lit:'#b6c5bc', light:'#f1e2dc', edge:'#b57c92', air:'#9caed1', reflection:'#d998af', undertone:'#92bcb5'}
};
function rgba(hex, opacity) {
  return `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${opacity})`;
}

/** Pearl light transmitted through overlapping, olive-gray contours. */
function paintDiffusion(ctx, w, h, t, color = 'olive') {
  if (color === 'linen') { paintPrecious(ctx, w, h, t); return; }
  const p = LIGHT_PALETTES[color];
  const ink = (key, opacity=1) => p ? rgba(p[key], opacity) : null;
  const breathe = Math.sin(t * .25);
  const sway = Math.sin(t * .18 + .8);
  const cx = w * (.53 + .018 * sway);

  ground(ctx, w, h, [[0, (ink('shadow') || '#292e2e')], [.48, (ink('base') || '#454c49')], [1, (ink('shadow') || '#252b2b')]]);
  glow(ctx, cx, h * .48, w * .66, h * .78, [[0, (ink('air', .26) || 'rgba(196,199,177,.26)')], [.47, (ink('air', .15) || 'rgba(154,165,147,.15)')], [1, (ink('air', 0) || 'rgba(150,162,145,0)')]]);

  // A far translucent volume curves around the center instead of forming a flat panel.
  shape(ctx, [w * .12, 0, w * .82, h], [[0, (ink('shadow') || '#343b39')], [.36, (ink('fold') || '#606961')], [.63, (ink('lit') || '#8b9283')], [1, (ink('base') || '#4e5953')]], () => {
    ctx.moveTo(-w * .12, -h * .12);
    ctx.bezierCurveTo(w * .42, -h * .12, w * (.69 + .012 * breathe), h * .10, w * (.66 + .018 * breathe), h * .45);
    ctx.bezierCurveTo(w * .63, h * .76, w * .84, h * 1.10, w * .78, h * 1.13);
    ctx.lineTo(-w * .12, h * 1.13);
  });
  glow(ctx, cx - w * .12, h * .54, w * .30, h * .69, [[0, (ink('shadow', .31) || 'rgba(25,34,33,.31)')], [.58, (ink('shadow', .13) || 'rgba(29,39,36,.13)')], [1, (ink('shadow', 0) || 'rgba(29,39,36,0)')]]);

  // Wide luminous chamber, with the strongest light slightly off center.
  glow(ctx, cx + w * .09, h * .44, w * .42, h * .77, [[0, (ink('light', .70) || 'rgba(226,222,190,.70)')], [.33, (ink('lit', .48) || 'rgba(207,209,181,.48)')], [.7, (ink('air', .17) || 'rgba(185,193,169,.17)')], [1, (ink('air', 0) || 'rgba(185,193,169,0)')]]);
  glow(ctx, cx + w * .05, h * .53, w * .24, h * .58, [[0, (ink('light', .29) || 'rgba(239,230,200,.29)')], [.57, (ink('lit', .12) || 'rgba(220,222,195,.12)')], [1, (ink('lit', 0) || 'rgba(220,222,195,0)')]]);

  // Near membranes roll from shade into light, then back into shade.
  shape(ctx, [w * .10, h * .12, w * .78, h * .80], [[0, (ink('shadow') || '#252e2d')], [.32, (ink('base') || '#424c46')], [.64, (ink('fold') || '#828b7c')], [.83, (ink('lit', .55) || 'rgba(164,168,143,.55)')], [1, (ink('lit', 0) || 'rgba(174,177,153,0)')]], () => {
    ctx.moveTo(-w * .12, -h * .12);
    ctx.lineTo(w * (.35 + .012 * sway), -h * .12);
    ctx.bezierCurveTo(w * (.26 + .018 * breathe), h * .25, w * .31, h * .67, w * (.50 + .018 * sway), h * 1.12);
    ctx.lineTo(-w * .12, h * 1.12);
  });
  glow(ctx, w * .34, h * .57, w * .25, h * .77, [[0, (ink('shadow', .29) || 'rgba(30,39,37,.29)')], [.62, (ink('shadow', .11) || 'rgba(35,45,41,.11)')], [1, (ink('shadow', 0) || 'rgba(35,45,41,0)')]]);
  shape(ctx, [w * .67, 0, w * .96, h * .72], [[0, (ink('edge', 0) || 'rgba(168,174,151,0)')], [.23, (ink('edge', .28) || 'rgba(129,140,122,.28)')], [.55, (ink('base') || '#59645a')], [1, (ink('shadow') || '#2d3834')]], () => {
    ctx.moveTo(w * (.86 + .01 * breathe), -h * .12);
    ctx.bezierCurveTo(w * .73, h * .21, w * (.79 + .014 * sway), h * .59, w * .64, h * 1.12);
    ctx.lineTo(w * 1.12, h * 1.12);
    ctx.lineTo(w * 1.12, -h * .12);
  });
  glow(ctx, w * .57, h * 1.03, w * .59, h * .37, [[0, (ink('shadow', .23) || 'rgba(26,34,33,.23)')], [.62, (ink('shadow', .09) || 'rgba(29,37,35,.09)')], [1, (ink('shadow', 0) || 'rgba(29,37,35,0)')]]);
  if (p?.reflection) {
    // Broad reflected color follows the membrane, with no sparkle or global hue cycling.
    glow(ctx, w * (.68 + .015 * sway), h * .19, w * .38, h * .51,
      [[0, rgba(p.reflection, .25)], [.50, rgba(p.reflection, .12)], [1, rgba(p.reflection, 0)]]);
    glow(ctx, w * .46, h * (.80 + .018 * breathe), w * .44, h * .32,
      [[0, rgba(p.undertone, .24)], [.53, rgba(p.undertone, .10)], [1, rgba(p.undertone, 0)]]);
  }
}

/** A long, rounded opening: rose-pearl light turns through sea-glass and blue shadow. */
function paintPrecious(ctx, w, h, t) {
  const drift = Math.sin(t * .17 + .6);
  const rise = Math.sin(t * .12 - .4);
  const y = h * (.52 + .014 * rise);
  ground(ctx,w,h,[[0,'#233043'],[.52,'#345d66'],[1,'#202e3d']]);
  glow(ctx,w*.70,h*.32,w*.57,h*.76,[[0,'rgba(176,126,157,.37)'],[.52,'rgba(114,135,174,.21)'],[1,'rgba(114,135,174,0)']]);

  // The distant rounded underside holds warm color above a cool deep recess.
  shape(ctx,[w*.08,h*.08,w*.92,h*.71],[[0,'#293d57'],[.35,'#577d91'],[.68,'#ba8eab'],[1,'#627b98']],()=>{
    ctx.moveTo(-w*.12,-h*.12);ctx.lineTo(w*1.12,-h*.12);
    ctx.lineTo(w*1.12,y-h*.11);
    ctx.bezierCurveTo(w*.80,y-h*.25,w*(.53+.02*drift),y+h*.06,-w*.12,y-h*.18);
  });
  glow(ctx,w*.49,y-h*.03,w*.67,h*.24,[[0,'rgba(19,38,56,.39)'],[.6,'rgba(24,45,59,.16)'],[1,'rgba(24,45,59,0)']]);

  // A continuous softly illuminated arc, rather than another vertical light column.
  shape(ctx,[0,y-h*.16,w,y+h*.24],[[0,'rgba(151,191,202,0)'],[.25,'rgba(123,188,184,.62)'],[.49,'rgba(238,202,219,.65)'],[.73,'rgba(216,195,230,.45)'],[1,'rgba(139,178,205,0)']],()=>{
    ctx.moveTo(-w*.12,y-h*.13);
    ctx.bezierCurveTo(w*.25,y+h*.18,w*.67,y-h*.26,w*1.12,y-h*.05);
    ctx.lineTo(w*1.12,y+h*.16);
    ctx.bezierCurveTo(w*.65,y-h*.07,w*.25,y+h*.36,-w*.12,y+h*.06);
  });
  glow(ctx,w*(.57+.017*drift),y+h*.04,w*.47,h*.28,[[0,'rgba(243,220,225,.43)'],[.42,'rgba(225,185,210,.21)'],[1,'rgba(225,185,210,0)']]);
  glow(ctx,w*.22,y+h*.07,w*.34,h*.35,[[0,'rgba(132,201,184,.30)'],[.58,'rgba(119,182,186,.13)'],[1,'rgba(119,182,186,0)']]);

  // A nearby curved surface partly veils the light, establishing a second depth.
  shape(ctx,[w*.06,y+h*.12,w*.88,h],[[0,'#29495b'],[.33,'rgba(89,157,148,.85)'],[.63,'rgba(132,128,166,.67)'],[1,'#253646']],()=>{
    ctx.moveTo(-w*.12,y+h*.20);
    ctx.bezierCurveTo(w*.27,y+h*.44,w*.70,y+h*.07,w*1.12,y+h*.30);
    ctx.lineTo(w*1.12,h*1.12);ctx.lineTo(-w*.12,h*1.12);
  });
  glow(ctx,w*.66,h*.82,w*.42,h*.39,[[0,'rgba(199,129,158,.19)'],[.56,'rgba(140,140,186,.09)'],[1,'rgba(140,140,186,0)']]);
  glow(ctx,w*.13,h*.63,w*.33,h*.74,[[0,'rgba(15,33,47,.31)'],[.61,'rgba(18,34,49,.12)'],[1,'rgba(18,34,49,0)']]);
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
function soften(paint, ctx, w, h, t, edge=480, color='olive') {
  if (!surface) surface = document.createElement('canvas');
  const scale = Math.min(1, edge / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * scale));
  const sh = Math.max(1, Math.round(h * scale));
  if (surface.width !== sw || surface.height !== sh) {surface.width = sw; surface.height = sh;}
  const small = surface.getContext('2d', {alpha:false});
  small.clearRect(0,0,sw,sh);
  paint(small,sw,sh,t,color);
  ctx.save();
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(surface,0,0,w,h);
  ctx.restore();
}
export function diffusion(ctx,w,h,t,color='olive'){soften(paintDiffusion,ctx,w,h,t,480,color);}
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
