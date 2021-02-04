let genUlam = function*() {
  
  // Ulam spiral
  
  let dirs = [
    { x: +1, y:  0 },
    { x:  0, y: -1 },
    { x: -1, y:  0 },
    { x:  0, y: +1 }
  ];
  
  let pt = { x: 0, y: 0 };
  let dirInd = 0;
  let len = 1;
  
  yield { ...pt };
  
  while (true) {
    
    for (let n = 0; n < Math.floor(len); n++) {
      let d = dirs[dirInd];
      pt.x += d.x; pt.y += d.y;
      yield { ...pt };
    }
    
    dirInd = (dirInd + 1) % dirs.length;
    len += 0.5;
    
  }
  
};

let genSlice = (gen, n) => {
  
  let results = [];
  let count = 0;
  for (let item of gen()) {
    if (count++ >= n) break;
    results.push(item);
  }
  
  return results;
  
};

let fnToCleanStr = fn => {
  
  let spaces = Infinity;
  let lines = fn.toString().replace(/\r/g, '').split('\n');
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    let s = 0;
    while (s < line.length && line[s] === ' ') s++;
    if (s < spaces) spaces = s;
  }
  
  return lines.map(ln => ln.slice(spaces)).join('\n');
  
};

let elem = (cls=null, type='div') => {
  let ret = document.createElement(type);
  if (cls !== null) ret.classList.add(cls);
  return ret;
};

(async () => {
  
  await new Promise(rsv => window.addEventListener('load', rsv));
  
  let body = document.querySelector('body');
  let options = elem('options');
  
  let note = elem('note');
  note.textContent = 'ctrl+alt+o toggles options';
  options.appendChild(note);
  
  let stats = elem('stats');
  options.appendChild(stats);
  
  let genLabel = elem('label');
  genLabel.textContent = 'Yield any series of { x, y } coordinates';
  options.appendChild(genLabel);
  
  let genCode = elem('code', 'textarea'); genCode.classList.add('gen');
  genCode.value = fnToCleanStr(genUlam);
  options.appendChild(genCode);
  
  let fnLabel = elem('label');
  fnLabel.textContent = [
    'Maps a point at index n to index f(n, v) where v is a continuously',
    'incrementing counter, making it useful for animation.'
  ].join(' ');
  options.appendChild(fnLabel);
  
  let fnCode = elem('code', 'textarea'); fnCode.classList.add('fn');
  fnCode.value = '(n, v) => n * v * 0.005';
  options.appendChild(fnCode);
  
  let optsLabel = elem('label');
  optsLabel.textContent = 'Options to control output';
  options.appendChild(optsLabel);
  
  let optsCode = elem('code', 'textarea'); optsCode.classList.add('opts');
  optsCode.value = JSON.stringify({
    dotVisibility: 0.6, lineVisibility: 0.2, zoom: 50, pan: { x: 0, y: 0 }, fps: 60 },
  null, 2);
  options.appendChild(optsCode);
  
  body.appendChild(options);
  
  window.addEventListener('focus', () => body.style.opacity = 1);
  window.addEventListener('blur', () => body.style.opacity = 0.6);
  
  let c = document.createElement('canvas');
  body.appendChild(c);
  
  let ctx = c.getContext('2d');
  Object.assign(ctx, { strokeStyle: '#000', fillStyle: '#000' });
  
  let clear = () => {
    ctx.clearRect(0, 0, c.width, c.height);
  };
  let line = ({ x: x1, y: y1 }, { x: x2, y: y2 }, { line='#000', lw=1, fill='#000' }={}) => {
    ctx.beginPath();
    Object.assign(ctx, { strokeStyle: line, fillStyle: fill, lineWidth: lw });
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  let circle = ({ x, y }, r, { line='#000', lw=1, fill='#000' }={}) => {
    ctx.beginPath();
    Object.assign(ctx, { strokeStyle: line, fillStyle: fill, lineWidth: lw });
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  };
  
  let params = { gen: null, fn: null, opts: null };
  let animVals = { v1: 0 };
  let updateParams = () => {
    try {
      animVals = { v1: 0 };
      Object.assign(params, {
        gen: eval(`(${genCode.value})`),
        fn: eval(`(${fnCode.value})`),
        opts: JSON.parse(optsCode.value)
      });
      body.classList.remove('err');
    } catch(err) {
      console.log(err.stack);
      body.classList.add('err');
    }
  };
  let drawWithParams = (opts={}) => draw(params.gen, params.fn, { ...params.opts, ...opts }, animVals);
  let draw = (gen, fn, { dotVisibility=0.5, lineVisibility=0.2, zoom=10, pan={ x: 0, y: 0 }, num=Math.pow(10, 6), ms=1000/30 }={}, animVals={ v1: 0 }) => {
    
    clear();
    let t = performance.now();
    let hx = c.width >> 1;
    let hy = c.height >> 1;
    let visPt = ({ x, y }) => ({ x: hx + x * zoom + pan.x, y: hy + y * zoom + pan.y });
    
    let pts = [];
    for (let pt of gen()) { if (pts.length >= num) break; pts.push(pt); }
    for (let pt of pts) circle(visPt(pt), 1, { line: 'rgba(0, 0, 0, 0.3)', lw: dotVisibility });
    for (let ind = 0; ind < num; ind++) {
      
      let fnInd = fn(ind, animVals.v1);
      if (fnInd < 0) continue;
      
      let f = Math.floor(fnInd); // truncate decimal
      if (f >= (pts.length - 1)) continue;
      
      try {
        let pt1 = (fnInd === f)
          ? pts[fnInd]
          : ((ipt0, ipt1, amt1, amt0=1-amt1) => ({
              x: ipt0.x * amt0 + ipt1.x * amt1,
              y: ipt0.y * amt0 + ipt1.y * amt1
            }))(pts[f + 0], pts[f + 1], fnInd - f)
        
        line(visPt(pts[ind]), visPt(pt1), { line: 'rgba(0, 0, 0, 0.5)', lw: lineVisibility });
      } catch(err) {
        console.log({ ind, fnInd, f, 'pts[ind]': pts[ind], 'pts[f + 0]': pts[f + 0], 'pts[f + 1]': pts[f + 1] });
        throw err;
      }
      
    }
    
    return;
    
  };
  
  body.focus();
  updateParams();
  drawWithParams();
  
  body.addEventListener('keydown', evt => {
    if (evt.key !== 'o') return;
    evt.preventDefault();
    
    if (!evt.altKey || !evt.ctrlKey) return;
    options.classList.toggle('active');
    if (!options.classList.contains('active')) updateParams();
  });
  let resize = () => {
    let { width, height } = body.getBoundingClientRect();
    Object.assign(c, { width, height });
  };
  window.addEventListener('resize', resize); resize();
  
  let goalMs = 1000 / 60 - 1; // 60fps (with 1ms to spare)
  let latMs = goalMs;
  let curNum = 1;
  let cnt = 0;
  let updTimer = Infinity;
  
  let anim = () => {
    
    let goalMs = (1000 / params.opts.fps) - 1;
    
    let t = performance.now();
    drawWithParams({ num: curNum, ms: latMs * 4 });
    let dt = performance.now() - t;
    animVals.v1 += dt * 0.001;
    
    // Rolling average
    latMs = latMs * 0.95 + dt * 0.05;
    
    let numPerMs = curNum / latMs;
    let idealNum = numPerMs * goalMs;
    curNum = curNum * 0.95 + idealNum * 0.05;
    
    updTimer += dt;
    
    if (updTimer >= 1000) {
      updTimer = 0;
      stats.textContent = `${curNum.toFixed(0)} samples @ ${(1000 / latMs).toFixed(2)}fps`;
    }
    
    requestAnimationFrame(anim);
    
  };
  requestAnimationFrame(anim);
  
})();
