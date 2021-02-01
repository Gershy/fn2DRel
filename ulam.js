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

let interpolatedPt = (pts, ind) => {
  
  if (ind < 0) throw new Error('ind < 0');
  if (ind === Math.round(ind)) return pts[ind];
  
  let f = Math.floor(ind);
  if (f + 0 >= pts.length) throw new Error('oob');
  if (f + 1 >= pts.length) throw new Error('oob');
  
  let { x: x0, y: y0 } = pts[f + 0];
  let { x: x1, y: y1 } = pts[f + 1];
  let amt0 = ind - f;
  let amt1 = 1 - amt0;
  
  return {
    x: x0 * amt0 + y0 * amt1,
    y: x1 * amt0 + y1 * amt1
  };
  
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
  
  let genLabel = elem('label');
  genLabel.textContent = 'Yield any series of { x, y } coordinates';
  options.appendChild(genLabel);
  
  let genCode = elem('code', 'textarea'); genCode.classList.add('gen');
  genCode.value = fnToCleanStr(genUlam);
  options.appendChild(genCode);
  
  let fnLabel = elem('label');
  fnLabel.textContent = 'Maps a point at index n to index f(n)';
  options.appendChild(fnLabel);
  
  let fnCode = elem('code', 'textarea'); fnCode.classList.add('fn');
  fnCode.value = 'n => Math.sqrt(n)';
  options.appendChild(fnCode);
  
  let optsLabel = elem('label');
  optsLabel.textContent = 'Options to control output';
  options.appendChild(optsLabel);
  
  let optsCode = elem('code', 'textarea'); optsCode.classList.add('opts');
  optsCode.value = JSON.stringify({ dotVisibility: 0.5, lineVisibility: 0.2, num: 1000, spread: 10, pan: {x: 0, y: 0} }, null, 2);
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
  
  let drawWithInput = () => {
    
    try {
      let gen = eval(`(${genCode.value})`);
      let fn = eval(`(${fnCode.value})`);
      let opts = JSON.parse(optsCode.value);
      draw(gen, fn, opts);
      body.classList.remove('err');
    } catch(err) {
      body.classList.add('err');
    }
    
  };
  let draw = (gen, fn, { dotVisibility=0.5, lineVisibility=0.2, num=200, spread=10, pan={ x: 0, y: 0 } }={}) => {
    
    clear();
    let hx = c.width >> 1;
    let hy = c.height >> 1;
    let visPt = ({ x, y }) => ({ x: hx + x * spread + pan.x, y: hy + y * spread + pan.y });
    
    let pts = genSlice(gen, num); //.map(({ x, y }) => ({ x: 300 + x * spread + pan.x, y: hy + y * spread + pan.y }));
    for (let pt of pts) circle(visPt(pt), 1, { line: 'rgba(0, 0, 0, 0.3)', lw: dotVisibility });
    
    for (let n = 0; n < num; n++) {
      try {
        let p1 = pts[n];
        let p2 = interpolatedPt(pts, fn(n));
        line(visPt(p1), visPt(p2), { line: 'rgba(0, 0, 0, 0.5)', lw: lineVisibility });
      } catch(err) {}
    }
    
  };
  
  body.focus();
  drawWithInput();
  
  body.addEventListener('keydown', evt => {
    if (evt.key === 'o' && evt.altKey && evt.ctrlKey) options.classList.toggle('active');
    if (!options.classList.contains('active')) drawWithInput();
  });
  let resize = () => {
    let { width, height } = body.getBoundingClientRect();
    Object.assign(c, { width, height });
    drawWithInput();
  };
  window.addEventListener('resize', resize); resize();
  
})();
