(() => {
  const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
  const scoreEl=document.getElementById('score'),perfectEl=document.getElementById('perfect'),bestEl=document.getElementById('best');
  const overlay=document.getElementById('overlay'),startButton=document.getElementById('start');
  const titleEl=document.getElementById('overlay-title'),copyEl=document.getElementById('overlay-copy');
  const W=1000,H=680,BASE_Y=540,UNIT=34,DEPTH=27;
  const palette=['#ff4d6d','#ff9f1c','#ffd60a','#70e000','#00c2a8','#00a6fb','#7b61ff','#ed5ab0','#f15bb5','#9bdeac'];
  let stack=[],moving=null,particles=[],score=0,perfect=0,best=Number(localStorage.getItem('taravo-stackrush-best')||0);
  let running=false,last=0,elapsed=0,camera=0;
  bestEl.textContent=best;

  const randColor=()=>palette[Math.floor(Math.random()*palette.length)];
  const shade=(hex,factor)=>{const n=parseInt(hex.slice(1),16);const r=Math.min(255,Math.max(0,Math.round((n>>16)*factor))),g=Math.min(255,Math.max(0,Math.round(((n>>8)&255)*factor))),b=Math.min(255,Math.max(0,Math.round((n&255)*factor)));return 'rgb('+r+','+g+','+b+')';};
  function project(x,y,z){return {x:W/2+(x-z)*1.0,y:BASE_Y-y+z*.48-camera};}
  function poly(points,color){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();ctx.fillStyle=color;ctx.fill();}
  function cube(b){
    const x=b.x,w=b.w,y=b.y,z=b.z||0,d=DEPTH,h=UNIT;
    const p=[project(x,y,z),project(x+w,y,z),project(x+w,y+h,z),project(x,y+h,z)];
    const q=[project(x,y,z+d),project(x+w,y,z+d),project(x+w,y+h,z+d),project(x,y+h,z+d)];
    // front, right and top faces
    poly([p[0],p[1],p[2],p[3]],shade(b.color,.78));
    poly([p[1],q[1],q[2],p[2]],shade(b.color,.58));
    poly([p[0],p[1],q[1],q[0]],shade(b.color,1.18));
    ctx.strokeStyle='#17231b22';ctx.lineWidth=1;
    [p,q].forEach(face=>{ctx.beginPath();ctx.moveTo(face[0].x,face[0].y);face.forEach(v=>ctx.lineTo(v.x,v.y));ctx.closePath();ctx.stroke();});
    // subtle seams
    for(let k=1;k<Math.floor(w/65);k++){const sx=x+k*65;const a=project(sx,y,z),b2=project(sx,y+h,z);ctx.strokeStyle='#17231b18';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b2.x,b2.y);ctx.stroke();}
  }
  function spawn(){const prev=stack[stack.length-1];moving={x:-prev.w,w:prev.w,y:score*UNIT,z:0,color:randColor(),dir:1,speed:230+Math.min(score*13,420)};}
  function reset(){stack=[{x:-155,w:310,y:0,z:0,color:'#667eea'}];score=0;perfect=0;particles=[];camera=0;elapsed=0;scoreEl.textContent='0';perfectEl.textContent='0';spawn();running=true;last=0;overlay.classList.add('hidden');requestAnimationFrame(loop);}
  function emit(x,y,color,count=26,power=230){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=power*(.25+Math.random()*.75);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-power*.22,size:2+Math.random()*5,life:.55+Math.random()*.65,max:1,color,spin:(Math.random()-.5)*12,angle:Math.random()*6.28});}}
  function drop(){
    if(!running||!moving)return;
    const prev=stack[stack.length-1],left=Math.max(moving.x,prev.x),right=Math.min(moving.x+moving.w,prev.x+prev.w),overlap=right-left;
    if(overlap<=0){finish();return;}
    const centerDiff=Math.abs((moving.x+moving.w/2)-(prev.x+prev.w/2));
    if(centerDiff<5){moving.x=prev.x;moving.w=prev.w;perfect++;emit(W/2,BASE_Y-(stack.length+1)*UNIT-camera,randColor(),34,260);}
    else{
      if(moving.x<prev.x)emit(W/2+(moving.x-prev.x),BASE_Y-(stack.length+1)*UNIT-camera,moving.color,14,130);
      if(moving.x+moving.w>prev.x+prev.w)emit(W/2+(moving.x+moving.w-prev.x-prev.w),BASE_Y-(stack.length+1)*UNIT-camera,moving.color,14,130);
      moving.x=left;moving.w=overlap;
    }
    stack.push({...moving});score++;scoreEl.textContent=score;perfectEl.textContent=perfect;
    if(score>best){best=score;bestEl.textContent=best;localStorage.setItem('taravo-stackrush-best',String(best));}
    camera=Math.max(0,(stack.length-9)*UNIT);spawn();
  }
  function finish(){running=false;moving=null;titleEl.textContent='Stack fell.';copyEl.textContent='You stacked '+score+'. Best: '+best+'.';startButton.textContent='Try again';overlay.classList.remove('hidden');}
  function drawBackground(){
    ctx.clearRect(0,0,W,H);ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
    // faint floor shadow and grounded platform
    ctx.fillStyle='#f5f6f5';ctx.beginPath();ctx.ellipse(W/2,BASE_Y+45,300,38,0,0,Math.PI*2);ctx.fill();
    const a=project(-230,-12,0),b=project(230,-12,0),c=project(230,-12,DEPTH*2),d=project(-230,-12,DEPTH*2);
    poly([a,b,c,d],'#ecefec');poly([a,b,{x:b.x,y:b.y+10},{x:a.x,y:a.y+10}],'#e2e6e2');
    for(let i=0;i<18;i++){ctx.fillStyle='#f0f2f0';ctx.beginPath();ctx.arc((i*173+53)%W,80+(i*79)%470,1.5,0,Math.PI*2);ctx.fill();}
  }
  function draw(){
    drawBackground();
    stack.forEach(cube);if(moving)cube(moving);
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=1/60;p.vy+=390/60;p.x+=p.vx/60;p.y+=p.vy/60;p.angle+=p.spin/60;p.vx*=.992;
      if(p.life<=0){particles.splice(i,1);continue;}
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);ctx.restore();
    }
  }
  function loop(t){if(!running)return;const dt=Math.min((t-last)/1000||0,.04);last=t;elapsed+=dt;
    if(moving){moving.x+=moving.dir*moving.speed*dt;if(moving.x+moving.w>W*.72){moving.x=W*.72-moving.w;moving.dir=-1;}if(moving.x<-W*.72){moving.x=-W*.72;moving.dir=1;}}
    draw();requestAnimationFrame(loop);
  }
  function action(){if(running)drop();}
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();action();});
  startButton.addEventListener('click',reset);
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat){e.preventDefault();if(!running)reset();else action();}});
  draw();
})();