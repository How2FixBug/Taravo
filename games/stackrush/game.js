(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const perfectEl = document.getElementById('perfect');
  const bestEl = document.getElementById('best');
  const overlay = document.getElementById('overlay');
  const startButton = document.getElementById('start');
  const titleEl = document.getElementById('overlay-title');
  const copyEl = document.getElementById('overlay-copy');
  const kickerEl = document.getElementById('overlay-kicker');
  const W = 900, H = 560, BLOCK_H = 31, GROUND = 486;
  const colors = ['#bd7951','#d29a63','#7e9b87','#b5a06d','#718c91','#c18a68'];
  let blocks = [], moving = null, score = 0, perfect = 0, best = Number(localStorage.getItem('stackrush-best') || 0);
  let running = false, gameOver = false, last = 0, camera = 0, particles = [];
  bestEl.textContent = best;

  function reset() {
    blocks = [{x:275,w:350,color:'#657f70'}];
    moving = null; score = 0; perfect = 0; camera = 0; particles = [];
    scoreEl.textContent = '0'; perfectEl.textContent = '0';
    spawn(); running = true; gameOver = false; last = 0;
    overlay.classList.add('hidden');
    requestAnimationFrame(loop);
  }
  function spawn() {
    const prev = blocks[blocks.length-1];
    moving = {x: -prev.w, y: GROUND-(blocks.length+1)*BLOCK_H, w:prev.w, color:colors[score%colors.length], dir:1, speed:190+Math.min(score*10,300)};
  }
  function drop() {
    if (!running || !moving) return;
    const prev = blocks[blocks.length-1];
    const left = Math.max(moving.x,prev.x);
    const right = Math.min(moving.x+moving.w,prev.x+prev.w);
    const overlap = right-left;
    if (overlap <= 0) { endGame(); return; }
    const diff = Math.abs((moving.x+moving.w/2)-(prev.x+prev.w/2));
    if (diff < 5) {
      perfect++;
      moving.x = prev.x; moving.w = prev.w;
      burst(moving.x+moving.w/2, GROUND-(blocks.length+1)*BLOCK_H+camera, '#c96e43');
    } else {
      if (moving.x < prev.x) particles.push({x:moving.x,y:GROUND-(blocks.length+1)*BLOCK_H+camera,w:prev.x-moving.x,life:1,color:moving.color});
      if (moving.x+moving.w > prev.x+prev.w) particles.push({x:prev.x+prev.w,y:GROUND-(blocks.length+1)*BLOCK_H+camera,w:moving.x+moving.w-(prev.x+prev.w),life:1,color:moving.color});
      moving.x=left; moving.w=overlap;
    }
    blocks.push({...moving});
    score++; scoreEl.textContent=score; perfectEl.textContent=perfect;
    if (score>best) { best=score; bestEl.textContent=best; localStorage.setItem('stackrush-best',best); }
    camera=Math.max(0,(blocks.length-8)*BLOCK_H);
    spawn();
  }
  function endGame() {
    running=false; gameOver=true; moving=null;
    kickerEl.textContent='SHIFT COMPLETE';
    titleEl.innerHTML='That’s a<br>wrap.';
    copyEl.textContent='You placed '+score+' '+(score===1?'crate':'crates')+'. Your best is '+best+'. Fancy another shift?';
    startButton.innerHTML='Try again <span>↻</span>';
    overlay.classList.remove('hidden');
  }
  function burst(x,y,color){for(let i=0;i<10;i++)particles.push({x,y,w:2+Math.random()*3,life:.8,color,dx:(Math.random()-.5)*100,dy:-20-Math.random()*70});}
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  function drawBlock(b,y){
    rect(b.x,y,b.w,BLOCK_H,b.color);
    rect(b.x,y,b.w,4,'#ffffff24');
    ctx.strokeStyle='#273b332d';ctx.lineWidth=1;
    for(let x=b.x+9;x<b.x+b.w-4;x+=13){ctx.beginPath();ctx.moveTo(x,y+6);ctx.lineTo(x,y+BLOCK_H-3);ctx.stroke();}
    rect(b.x,y+BLOCK_H-4,b.w,4,'#263c3426');
    rect(b.x+Math.min(12,b.w/3),y+9,Math.min(24,b.w/4),2,'#f4ead45c');
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    rect(0,0,W,H,'#d8e3dc');
    // distant hills and harbor
    ctx.fillStyle='#b8c9bd';ctx.beginPath();ctx.moveTo(0,320);ctx.lineTo(110,255);ctx.lineTo(205,302);ctx.lineTo(330,238);ctx.lineTo(455,310);ctx.lineTo(590,260);ctx.lineTo(730,310);ctx.lineTo(900,250);ctx.lineTo(900,430);ctx.lineTo(0,430);ctx.fill();
    rect(0,365,W,125,'#9eb9b2');
    for(let i=0;i<12;i++){rect((i*103+24)%W,390+(i%3)*22,42,2,'#dbe4d9a0');}
    // cranes
    ctx.strokeStyle='#71877c';ctx.lineWidth=5;ctx.lineCap='square';
    [[125,250,235],[710,230,180]].forEach(([x,y,len])=>{ctx.beginPath();ctx.moveTo(x,365);ctx.lineTo(x,y);ctx.lineTo(x+len,y);ctx.moveTo(x+len-28,y);ctx.lineTo(x+len-28,y+65);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+len-28,y+65);ctx.lineTo(x+len-22,y+75);ctx.stroke();ctx.lineWidth=5;});
    // dock
    rect(0,GROUND,W,74,'#9b8b70');rect(0,GROUND,W,8,'#b5a58a');
    for(let x=0;x<W;x+=92){rect(x,GROUND+15,2,52,'#796e5d');}
    rect(0,GROUND+66,W,8,'#766b5b');
    // tower
    blocks.forEach((b,i)=>drawBlock(b,GROUND-(i+1)*BLOCK_H+camera));
    if(moving)drawBlock(moving,GROUND-(blocks.length+1)*BLOCK_H+camera);
    particles=particles.filter(p=>p.life>0);
    particles.forEach(p=>{p.life-=.025;if(p.dx!==undefined){p.x+=p.dx*.016;p.y+=p.dy*.016;}rect(p.x,p.y,p.w,Math.max(2,p.w),p.color);});
    // subtle dock markings
    rect(22,GROUND+31,72,2,'#d9c9a5');rect(806,GROUND+31,72,2,'#d9c9a5');
  }
  function loop(time){
    if(!running)return;
    const dt=Math.min((time-last)/1000||0,.04);last=time;
    if(moving){moving.x+=moving.dir*moving.speed*dt;if(moving.x+moving.w>W){moving.x=W-moving.w;moving.dir=-1;}if(moving.x<0){moving.x=0;moving.dir=1;}}
    draw();requestAnimationFrame(loop);
  }
  function action(){if(!running){if(gameOver||!moving)reset();return;}drop();}
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();action();});
  startButton.addEventListener('click',reset);
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat){e.preventDefault();action();}});
  draw();
})();