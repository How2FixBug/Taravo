(() => {
  const canvas=document.getElementById("stackrush"),ctx=canvas.getContext("2d");
  const scoreNode=document.getElementById("score"),bestNode=document.getElementById("best");
  const overlay=document.getElementById("overlay"),startButton=document.getElementById("start-button"),titleNode=document.getElementById("overlay-title");
  const W=1100,H=720,N=4,CELL=54,BLOCK_H=35;
  const colors=["#ff4b55","#ff9f1c","#ffd92f","#65cf48","#20c6a8","#36a9ff","#8165ef","#e45ac1","#ff7043"];
  let layers=[],active=null,particles=[],score=0,best=Number(localStorage.getItem("taravo-stackrush-best")||0),angle=0,running=false,last=0;
  bestNode.textContent=best;
  const pick=()=>colors[Math.floor(Math.random()*colors.length)];
  const shade=(hex,k)=>{const n=parseInt(hex.slice(1),16),r=Math.min(255,Math.max(0,((n>>16)*k)|0)),g=Math.min(255,Math.max(0,(((n>>8)&255)*k)|0)),b=Math.min(255,Math.max(0,((n&255)*k)|0));return "rgb("+r+","+g+","+b+")"};
  function project(x,y,z){const a=angle*Math.PI/2,rx=x*Math.cos(a)-z*Math.sin(a),rz=x*Math.sin(a)+z*Math.cos(a);return {x:W/2+(rx-rz)*.86,y:545+(rx+rz)*.43-y*BLOCK_H};}
  function face(points,color){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle="#17231b20";ctx.lineWidth=1;ctx.stroke();}
  function cube(x,y,z,color){const s=CELL,h=BLOCK_H,p=[project(x,y,z),project(x+s,y,z),project(x+s,y,z+s),project(x,y,z+s)],top=p.map(v=>({x:v.x,y:v.y-h}));face([p[0],p[1],top[1],top[0]],shade(color,.76));face([p[1],p[2],top[2],top[1]],shade(color,.55));face(top,shade(color,1.12));}
  function newLayer(){return Array.from({length:N},()=>Array(N).fill(null))}
  function drawTower(){
    ctx.fillStyle="#0000000d";ctx.beginPath();ctx.ellipse(W/2,560,250,72,0,0,Math.PI*2);ctx.fill();
    for(let l=0;l<layers.length;l++)for(let z=0;z<N;z++)for(let x=0;x<N;x++){const c=layers[l][z][x];if(c)cube((x-2)*CELL,(l+1)*.95,(z-2)*CELL,c)}
    for(let z=0;z<N;z++)for(let x=0;x<N;x++){const px=(x-2)*CELL,pz=(z-2)*CELL,p=[project(px,layers.length,pz),project(px+CELL,layers.length,pz),project(px+CELL,layers.length,pz+CELL),project(px,layers.length,pz+CELL)];ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);p.slice(1).forEach(v=>ctx.lineTo(v.x,v.y));ctx.closePath();ctx.strokeStyle="#17231b20";ctx.stroke()}
    if(active){const y=layers.length+8-active.progress*7;cube((active.x-2)*CELL,y,(active.z-2)*CELL,active.color)}
  }
  function burst(x,y,color,count=20){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=80+Math.random()*250;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-100,size:2+Math.random()*5,life:.45+Math.random()*.65,color,rot:Math.random()*6})}}
  function drawParticles(dt){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.vy+=480*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=dt*8;if(p.life<=0){particles.splice(i,1);continue}ctx.save();ctx.globalAlpha=Math.min(1,p.life);ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);ctx.restore()}}
  function spawn(){active={x:Math.floor(Math.random()*N),z:Math.floor(Math.random()*N),color:pick(),progress:0}}
  function reset(){layers=[newLayer()];score=0;angle=0;particles=[];scoreNode.textContent="0";spawn();running=true;last=0;overlay.classList.add("hidden");requestAnimationFrame(loop)}
  function rotate(dir){angle=(angle+dir+4)%4}
  function drop(){
    if(!running||!active)return;
    const {x,z,color}=active;
    if(layers[0][z][x]){finish();return}
    layers[0][z][x]=color;
    const p=project((x-2)*CELL,layers.length,(z-2)*CELL);burst(p.x,p.y-15,color,18);
    score++;scoreNode.textContent=score;
    if(score>best){best=score;bestNode.textContent=best;localStorage.setItem("taravo-stackrush-best",String(best))}
    if(layers[0].every(row=>row.every(Boolean))){
      burst(W/2,365,pick(),75);layers.unshift(newLayer());if(layers.length>8)layers.pop();
      score+=8;scoreNode.textContent=score;
      if(score>best){best=score;bestNode.textContent=best;localStorage.setItem("taravo-stackrush-best",String(best))}
    }
    spawn();
  }
  function finish(){running=false;active=null;titleNode.textContent="Game over";startButton.textContent="Play again";overlay.classList.remove("hidden")}
  function draw(dt){ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);drawTower();drawParticles(dt)}
  function loop(t){if(!running)return;const dt=Math.min((t-last)/1000||0,.04);last=t;if(active){active.progress+=dt*.34;if(active.progress>=1){finish()}}draw(dt);if(running)requestAnimationFrame(loop)}
  canvas.addEventListener("pointerdown",e=>{if(!running)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W;if(x<W*.34)rotate(-1);else if(x>W*.66)rotate(1);else drop()});
  startButton.addEventListener("click",reset);
  document.addEventListener("keydown",e=>{if(e.code==="Space"){e.preventDefault();if(!running)reset();else drop()}if(running&&(e.code==="ArrowLeft"||e.code==="KeyA"))rotate(-1);if(running&&(e.code==="ArrowRight"||e.code==="KeyD"))rotate(1)});
  draw(0);
})();