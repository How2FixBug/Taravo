(() => {
  const canvas=document.getElementById("brick-breaker"),ctx=canvas.getContext("2d");
  const scoreEl=document.getElementById("score"),bestEl=document.getElementById("best"),levelEl=document.getElementById("level");
  const overlay=document.getElementById("overlay"),titleEl=document.getElementById("overlay-title"),button=document.getElementById("start-button"),secondaryButton=document.getElementById("secondary-button"),menuButton=document.getElementById("menu-button"),fullscreenButton=document.getElementById("fullscreen-button"),settingsButton=document.getElementById("settings-button"),settingsPopup=document.getElementById("game-settings"),closeSettings=document.getElementById("close-game-settings"),particlesInput=document.getElementById("particles"),sensitivityInput=document.getElementById("sensitivity"),sensitivityValue=document.getElementById("sensitivity-value");
  const W=1100,H=720,colors=["#ff5364","#ff9f32","#ffd447","#6bd65c","#25c7a8","#36a9ff","#8165ef","#e65ac1"];
  let score=0,best=Number(localStorage.getItem("taravo-breaker-best")||0),level=1,lives=3,bricks=[],particles=[],ball=null,paddle=null,running=false,paused=false,last=0,keys={};
  let pointerX=W/2,trail=[];
  let gamePrefs={particles:true,sensitivity:100};
  try{gamePrefs={...gamePrefs,...JSON.parse(localStorage.getItem("taravo-brick-breaker-settings")||localStorage.getItem("taravo-settings")||"{}")}}catch{}
  particlesInput.checked=gamePrefs.particles!==false;sensitivityInput.value=gamePrefs.sensitivity;sensitivityValue.textContent=gamePrefs.sensitivity+"%";
  function saveGamePrefs(){localStorage.setItem("taravo-brick-breaker-settings",JSON.stringify(gamePrefs))}
  function openGameSettings(){settingsPopup.classList.remove("hidden");settingsPopup.setAttribute("aria-hidden","false")}
  function closeGameSettings(){settingsPopup.classList.add("hidden");settingsPopup.setAttribute("aria-hidden","true")}
  bestEl.textContent=best;
  const rand=a=>a[Math.floor(Math.random()*a.length)];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function roundRect(x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill()}
  function makeBricks(){
    bricks=[];const cols=11,rows=Math.min(5+Math.floor((level-1)/2),7),gap=9,bw=78,bh=25,total=cols*bw+(cols-1)*gap,start=(W-total)/2;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const color=colors[(col+row*2+level-1)%colors.length];
      bricks.push({x:start+col*(bw+gap),y:135+row*(bh+gap),w:bw,h:bh,color,hp:level>3&&row<2?2:1,alive:true});
    }
  }
  function resetBall(){trail=[];ball={x:W/2,y:H-145,r:10,vx:(Math.random()>.5?1:-1)*245,vy:-360};paddle={x:W/2-66,y:H-78,w:132,h:15,speed:780}}
  function start(){score=0;level=1;lives=3;particles=[];scoreEl.textContent=score;levelEl.textContent=level;makeBricks();resetBall();running=true;paused=false;last=0;overlay.classList.add("hidden");requestAnimationFrame(loop)}
  function showMenu(mode="menu"){running=false;paused=true;overlay.classList.remove("hidden");titleEl.textContent=mode==="gameover"?"Game over":"Brick Breaker";button.textContent=mode==="gameover"?"Play again":mode==="pause"?"Resume":"Play";secondaryButton.textContent=mode==="pause"?"Restart":"Fullscreen";secondaryButton.dataset.action=mode==="pause"?"restart":"fullscreen"}
  function toggleFullscreen(){if(!document.fullscreenElement){const target=document.querySelector(".arcade-shell");if(target.requestFullscreen)target.requestFullscreen().catch(()=>{})}else if(document.exitFullscreen)document.exitFullscreen()}
  function pauseGame(){if(running){running=false;showMenu("pause")}else if(paused&&titleEl.textContent!=="Game over"){running=true;paused=false;last=0;overlay.classList.add("hidden");requestAnimationFrame(loop)}}
  function burst(x,y,color,n=12){if(gamePrefs.particles===false)return;for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=70+Math.random()*260;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,size:2+Math.random()*5,life:.35+Math.random()*.6,max:1,color,spin:(Math.random()-.5)*9,rot:Math.random()*6})}}
  function addScore(n){score+=n;scoreEl.textContent=score;if(score>best){best=score;bestEl.textContent=best;localStorage.setItem("taravo-breaker-best",String(best))}}
  function hitBrick(b){b.alive=false;burst(b.x+b.w/2,b.y+b.h/2,b.color,18);addScore(10*level);ball.vy*=-1;if(bricks.every(v=>!v.alive)){level++;levelEl.textContent=level;makeBricks();ball.vx*=1.07;ball.vy*=1.07;burst(W/2,340,rand(colors),65)}}
  function circleRect(c,r){const x=clamp(c.x,r.x,r.x+r.w),y=clamp(c.y,r.y,r.y+r.h),dx=c.x-x,dy=c.y-y;return dx*dx+dy*dy<c.r*c.r}
  function update(dt){
    const move=(keys.ArrowLeft||keys.KeyA?-1:0)+(keys.ArrowRight||keys.KeyD?1:0);
    if(move)paddle.x+=move*paddle.speed*dt;else paddle.x+=(pointerX-paddle.w/2-paddle.x)*Math.min(1,dt*13*(Number(gamePrefs.sensitivity)||100)/100);
    paddle.x=clamp(paddle.x,20,W-paddle.w-20);
    ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;trail.push({x:ball.x,y:ball.y});if(trail.length>10)trail.shift();
    if(ball.x<ball.r+10){ball.x=ball.r+10;ball.vx=Math.abs(ball.vx)}
    if(ball.x>W-ball.r-10){ball.x=W-ball.r-10;ball.vx=-Math.abs(ball.vx)}
    if(ball.y<ball.r+65){ball.y=ball.r+65;ball.vy=Math.abs(ball.vy)}
    if(ball.vy>0&&circleRect(ball,paddle)){
      ball.y=paddle.y-ball.r;
      const hit=(ball.x-(paddle.x+paddle.w/2))/(paddle.w/2);
      const speed=Math.min(680,Math.hypot(ball.vx,ball.vy)*1.025);
      const angle=hit*1.05;
      ball.vx=Math.sin(angle)*speed;ball.vy=-Math.cos(angle)*speed;
      burst(ball.x,paddle.y,"#62e6b5",5);
    }
    for(const b of bricks){if(!b.alive||!circleRect(ball,b))continue;hitBrick(b);break}
    if(ball.y>H+ball.r){lives--;if(lives<=0){endGame();return}resetBall()}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.vy+=440*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.spin*dt;if(p.life<=0)particles.splice(i,1)}
  }
  function drawBrick(b){
    roundRect(b.x+2,b.y+5,b.w,b.h,6,"#14201918");
    const g=ctx.createLinearGradient(b.x,b.y,b.x,b.y+b.h);g.addColorStop(0, "#ffffff");g.addColorStop(.16,b.color);g.addColorStop(1,b.color);
    roundRect(b.x,b.y,b.w,b.h,6,g);
    ctx.save();ctx.globalAlpha=.2;roundRect(b.x+5,b.y+4,b.w-10,3,2,"#ffffff");ctx.restore();
    ctx.save();ctx.globalAlpha=.15;roundRect(b.x+5,b.y+b.h-5,b.w-10,2,1,"#152018");ctx.restore();
    if(b.hp>1){ctx.beginPath();ctx.arc(b.x+b.w/2,b.y+b.h/2,5,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();ctx.strokeStyle="#ffffff99";ctx.stroke()}
  }
  function draw(){
    ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);
    // Quiet court markings keep the playfield clean.
    ctx.strokeStyle="#edf0ed";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(26,105);ctx.lineTo(W-26,105);ctx.stroke();
    bricks.forEach(b=>{if(b.alive)drawBrick(b)});
    if(paddle){
      roundRect(paddle.x-1,paddle.y+6,paddle.w+2,paddle.h,9,"#00000020");
      const pg=ctx.createLinearGradient(0,paddle.y,0,paddle.y+paddle.h);pg.addColorStop(0,"#46564b");pg.addColorStop(1,"#17221b");
      roundRect(paddle.x,paddle.y,paddle.w,paddle.h,9,pg);
      roundRect(paddle.x+12,paddle.y+3,paddle.w-24,3,2,"#62e6b5");
    }
    if(ball){
      trail.forEach((point,i)=>{const t=(i+1)/trail.length;ctx.beginPath();ctx.arc(point.x,point.y,ball.r*t*.72,0,Math.PI*2);ctx.fillStyle="rgba(98,230,181,"+(t*.16)+")";ctx.fill()});
      ctx.save();ctx.shadowColor="#62e6b5aa";ctx.shadowBlur=18;ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fillStyle="#26332b";ctx.fill();ctx.restore();
      ctx.beginPath();ctx.arc(ball.x-3,ball.y-3,3,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();
    }
    particles.forEach(p=>{ctx.save();ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);ctx.restore()});
    // lives are small circles in the lower corner
    for(let i=0;i<lives;i++){ctx.beginPath();ctx.arc(W-36-i*23,H-34,6,0,Math.PI*2);ctx.fillStyle="#62e6b5";ctx.fill()}
  }
  function loop(t){if(!running)return;const dt=Math.min((t-last)/1000||0,.025);last=t;update(dt);draw();if(running)requestAnimationFrame(loop)}
  function endGame(){showMenu("gameover")}
  function setPointer(e){const r=canvas.getBoundingClientRect();pointerX=(e.clientX-r.left)/r.width*W}
  canvas.addEventListener("pointermove",setPointer);
  canvas.addEventListener("pointerdown",e=>{setPointer(e);if(!running)start()});
  settingsButton.addEventListener("click",openGameSettings);closeSettings.addEventListener("click",closeGameSettings);settingsPopup.addEventListener("click",e=>{if(e.target===settingsPopup)closeGameSettings()});
  particlesInput.addEventListener("change",()=>{gamePrefs.particles=particlesInput.checked;saveGamePrefs()});
  sensitivityInput.addEventListener("input",()=>{gamePrefs.sensitivity=Number(sensitivityInput.value);sensitivityValue.textContent=gamePrefs.sensitivity+"%";saveGamePrefs()});
  document.getElementById("reset-best").addEventListener("click",()=>{best=0;bestEl.textContent="0";localStorage.removeItem("taravo-breaker-best")});
  button.addEventListener("click",()=>{if(paused&&titleEl.textContent!=="Game over"&&button.textContent==="Resume"){running=true;paused=false;last=0;overlay.classList.add("hidden");requestAnimationFrame(loop)}else start()});
  secondaryButton.addEventListener("click",()=>{if(secondaryButton.dataset.action==="restart")start();else toggleFullscreen()});
  menuButton.addEventListener("click",()=>{if(running)showMenu("pause");else showMenu("menu")});
  fullscreenButton.addEventListener("click",toggleFullscreen);
  document.addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==="Escape"&&!settingsPopup.classList.contains("hidden"))closeGameSettings();else if(e.code==="Escape"&&running)showMenu("pause");else if(e.code==="Space"&&!running){if(paused&&titleEl.textContent!=="Game over"){running=true;paused=false;last=0;overlay.classList.add("hidden");requestAnimationFrame(loop)}else start()}});
  document.addEventListener("keyup",e=>{keys[e.code]=false});
  makeBricks();resetBall();draw();
})();