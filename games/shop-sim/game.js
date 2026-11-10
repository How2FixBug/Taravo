(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const canvas = $("store-canvas"), ctx = canvas.getContext("2d");
  const SAVE_KEY = "taravo-shop-sim-save-v1";
  const products = [
    {id:"apples",name:"Apples",icon:"🍎",base:2,cost:0.75,price:2,stock:18,capacity:30,color:"#e75c50",unlock:1},
    {id:"bread",name:"Bread",icon:"🍞",base:3,cost:1.15,price:3,stock:15,capacity:25,color:"#d9a75b",unlock:1},
    {id:"milk",name:"Milk",icon:"🥛",base:3.5,cost:1.4,price:3.5,stock:14,capacity:24,color:"#75b8dc",unlock:1},
    {id:"coffee",name:"Coffee",icon:"☕",base:5,cost:2.1,price:5,stock:10,capacity:20,color:"#9b7458",unlock:2},
    {id:"flowers",name:"Flowers",icon:"💐",base:7,cost:3,price:7,stock:8,capacity:16,color:"#d88cc0",unlock:3},
    {id:"snacks",name:"Snack boxes",icon:"🍪",base:4.5,cost:1.7,price:4.5,stock:0,capacity:22,color:"#e5a34e",unlock:4},
    {id:"plants",name:"House plants",icon:"🪴",base:12,cost:5,price:12,stock:0,capacity:12,color:"#64a878",unlock:5}
  ];
  const upgradeDefs = [
    {id:"shelves",name:"Bigger shelves",desc:"More room for every product. +8 capacity each.",cost:180,max:3},
    {id:"sign",name:"Bright shop sign",desc:"Attract more shoppers to your store.",cost:240,max:3},
    {id:"staff",name:"Hire an employee",desc:"Staff keep shelves topped up and improve service.",cost:320,max:3},
    {id:"expansion",name:"Expand the store",desc:"Unlock another shelf and welcome more customers.",cost:500,max:3}
  ];
  const freshState = () => ({cash:350,day:1,level:1,xp:0,reputation:50,totalCustomers:0,totalRevenue:0,upgrades:{shelves:0,sign:0,staff:0,expansion:0},stocks:Object.fromEntries(products.map(p=>[p.id,p.stock])),prices:Object.fromEntries(products.map(p=>[p.id,p.price])),dayRevenue:0,dayCustomers:0,dayLost:0,elapsed:0,open:true,paused:false,customers:[],nextCustomer:2.5,lastReport:null});
  let state = freshState();
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (saved && saved.version === 1) state = {...state,...saved.state,upgrades:{...state.upgrades,...saved.state.upgrades},stocks:{...state.stocks,...saved.state.stocks},prices:{...state.prices,...saved.state.prices},customers:[]};
  } catch {}
  let lastFrame = performance.now(), animation = 0, feed = [];
  const rand = (a,b) => a + Math.random()*(b-a);
  const money = n => "$" + Math.max(0,n).toFixed(2).replace(/\.00$/,"");
  const unlocked = p => p.unlock <= state.level;
  const shelfCapacity = p => p.capacity + state.upgrades.shelves*8;
  function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,state:{...state,customers:[]}}))}catch{}}
  function log(message){feed.unshift(message);feed=feed.slice(0,3);$("activity-feed").innerHTML="";feed.forEach(line=>{const p=document.createElement("p");p.textContent=line;$("activity-feed").append(p)})}
  function levelForXP(xp){return 1+Math.floor(xp/90)}
  function addXP(amount){const old=state.level;state.xp+=amount;state.level=levelForXP(state.xp);if(state.level>old){log("Level "+state.level+" reached! New products unlocked.");renderProducts();renderUpgrades()}}
  function availableProducts(){return products.filter(unlocked)}
  function renderProducts(){
    const list=$("product-list");list.replaceChildren();
    availableProducts().forEach(p=>{
      const stock=state.stocks[p.id]||0,price=state.prices[p.id]||p.base;
      const row=document.createElement("div");row.className="product-row";
      const icon=document.createElement("div");icon.className="product-icon";icon.textContent=p.icon;
      const info=document.createElement("div");info.className="product-info";
      const name=document.createElement("strong");name.textContent=p.name;
      const detail=document.createElement("span");detail.textContent="Cost "+money(p.cost)+" · "+money(price)+" each";
      info.append(name,detail);
      const controls=document.createElement("div");controls.className="product-controls";
      const count=document.createElement("span");count.className="stock-count";count.textContent=stock+" / "+shelfCapacity(p);
      const prices=document.createElement("div");prices.className="price-controls";
      const down=document.createElement("button");down.type="button";down.textContent="−";down.setAttribute("aria-label","Lower "+p.name+" price");down.disabled=price<=p.base*.6;
      const priceText=document.createElement("b");priceText.textContent=money(price);
      const up=document.createElement("button");up.type="button";up.textContent="+";up.setAttribute("aria-label","Raise "+p.name+" price");up.disabled=price>=p.base*2;
      down.addEventListener("click",()=>changePrice(p.id,-.25));up.addEventListener("click",()=>changePrice(p.id,.25));
      prices.append(down,priceText,up);controls.append(count,prices);row.append(icon,info,controls);list.append(row);
    });
    $("shelf-count").textContent=(4+state.upgrades.expansion)+" shelves";
  }
  function changePrice(id,delta){state.prices[id]=Math.round((state.prices[id]+delta)*100)/100;renderProducts();save()}
  function restock(id,quantity=12){
    const p=products.find(x=>x.id===id),current=state.stocks[id]||0,amount=Math.min(quantity,shelfCapacity(p)-current);
    if(amount<=0){log(p.name+" shelf is already full.");return}
    const cost=amount*p.cost;if(state.cash<cost){log("Not enough cash to order "+p.name+".");return}
    state.cash-=cost;state.stocks[id]=current+amount;log("Restocked "+amount+" "+p.name.toLowerCase()+".");renderStats();renderProducts();save();
  }
  function renderUpgrades(){
    const root=$("upgrade-list");root.replaceChildren();
    upgradeDefs.forEach(def=>{
      const level=state.upgrades[def.id],cost=Math.round(def.cost*Math.pow(1.65,level)),maxed=level>=def.max;
      const card=document.createElement("div");card.className="upgrade-card";
      const top=document.createElement("div");top.className="upgrade-card-top";
      const title=document.createElement("strong");title.textContent=def.name+" · "+level+"/"+def.max;
      const price=document.createElement("strong");price.textContent=maxed?"MAX":money(cost);top.append(title,price);
      const desc=document.createElement("p");desc.textContent=def.desc;
      const button=document.createElement("button");button.type="button";button.textContent=maxed?"Fully upgraded":"Purchase upgrade";button.disabled=maxed||state.cash<cost;
      button.addEventListener("click",()=>buyUpgrade(def.id,cost));card.append(top,desc,button);root.append(card);
    });
    $("rent-value").textContent=money(35+state.upgrades.expansion*22);$("wages-value").textContent=money(state.upgrades.staff*24);
  }
  function buyUpgrade(id,cost){
    if(state.cash<cost||state.upgrades[id]>=upgradeDefs.find(x=>x.id===id).max)return;
    state.cash-=cost;state.upgrades[id]++;
    if(id==="expansion"){const next=availableProducts();const nextLocked=products.find(p=>!unlocked(p));if(nextLocked){state.level=Math.max(state.level,nextLocked.unlock);state.xp=Math.max(state.xp,(state.level-1)*90);log("New department unlocked: "+nextLocked.name+".")}}
    log(upgradeDefs.find(x=>x.id===id).name+" upgraded.");renderAll();save();
  }
  function renderStats(){
    $("cash-value").textContent=money(state.cash);$("today-value").textContent=money(state.dayRevenue);$("customer-value").textContent=state.dayCustomers;$("reputation-value").textContent=Math.round(state.reputation);
    $("day-number").textContent=state.day;$("store-level").textContent="Level "+state.level+" · "+(["New business","Local favorite","Neighborhood staple","Busy destination","Market leader"][Math.min(4,Math.floor((state.level-1)/2))]);
    $("clock-value").textContent=clockText(state.elapsed);$("day-progress").style.width=Math.min(100,state.elapsed/120*100)+"%";
    $("open-status").innerHTML=state.open?"<i></i> OPEN":"<i></i> CLOSED";
    $("visitor-message").textContent=state.customers.length?state.customers.length+" shoppers in store":"Waiting for shoppers";
    $("pause-button").textContent=state.paused?"▶":"Ⅱ";$("pause-button").setAttribute("aria-label",state.paused?"Resume simulation":"Pause simulation");
  }
  function clockText(t){const minutes=Math.min(8*60+Math.floor(t/120*10*60),18*60);const h=Math.floor(minutes/60),m=minutes%60;return (h%12||12)+":"+String(m).padStart(2,"0")+" "+(h>=12?"PM":"AM")}
  function renderAll(){renderStats();renderProducts();renderUpgrades()}
  function spawnCustomer(){
    const available=availableProducts().filter(p=>(state.stocks[p.id]||0)>0);
    if(!available.length){state.dayLost++;state.reputation=Math.max(0,state.reputation-.04);return}
    const wants=available.filter(()=>Math.random()<.48);const chosen=(wants.length?wants: [available[Math.floor(Math.random()*available.length)]]).slice(0,2);
    const expensive=chosen.some(p=>state.prices[p.id]>p.base*1.35);
    const mood=expensive?"hesitant":"happy";
    const x=rand(115,840),y=rand(125,390);
    const customer={x:-25,y:rand(155,390),tx:x,ty:y,phase:"browse",wait:rand(5,10),cart:[],color:["#5b91d5","#e58b69","#8c78c9","#55a98c","#d6a64f"][Math.floor(Math.random()*5)],speed:rand(48,72),mood,spent:0};
    chosen.forEach(p=>customer.cart.push({id:p.id,qty:Math.random()<.25?2:1}));state.customers.push(customer);
  }
  function finishShopping(c){
    let bought=0,subtotal=0;
    c.cart.forEach(item=>{const p=products.find(x=>x.id===item.id),qty=Math.min(item.qty,state.stocks[p.id]||0);if(qty>0){state.stocks[p.id]-=qty;subtotal+=qty*state.prices[p.id];bought+=qty}});
    if(bought){const serviceBonus=state.upgrades.staff*.04;const total=subtotal*(1+serviceBonus);state.cash+=total;state.dayRevenue+=total;state.totalRevenue+=total;state.dayCustomers++;state.totalCustomers++;state.reputation=Math.min(100,state.reputation+.12);addXP(Math.max(2,bought*2));c.spent=total;log("Sale: "+money(total)+" · "+bought+" item"+(bought===1?"":"s")+".")}
    else{state.dayLost++;state.reputation=Math.max(0,state.reputation-.25);log("A shopper left empty-handed.")}
    c.phase="exit";c.tx=990;c.ty=c.y;
  }
  function updateCustomers(dt){
    for(let i=state.customers.length-1;i>=0;i--){
      const c=state.customers[i];
      if(c.phase==="browse"){c.wait-=dt;if(c.wait<=0){c.phase="checkout";c.tx=765;c.ty=470}}
      const dx=c.tx-c.x,dy=c.ty-c.y,dist=Math.hypot(dx,dy);
      if(dist>3){const step=Math.min(dist,c.speed*dt);c.x+=dx/dist*step;c.y+=dy/dist*step}
      else if(c.phase==="checkout")finishShopping(c);
      else if(c.phase==="exit"){state.customers.splice(i,1)}
    }
  }
  function drawStore(){
    const w=960,h=560;ctx.clearRect(0,0,w,h);ctx.fillStyle="#f2f1eb";ctx.fillRect(0,0,w,h);
    ctx.fillStyle="#e7e6de";ctx.fillRect(24,24,912,512);
    ctx.strokeStyle="#d4d4ca";ctx.lineWidth=2;ctx.strokeRect(24,24,912,512);
    ctx.fillStyle="#e3e0d4";ctx.fillRect(40,40,880,44);
    ctx.fillStyle="#6d7b70";ctx.font="700 14px system-ui";ctx.fillText("FRESH • LOCAL • DAILY",58,67);
    ctx.fillStyle="#b6c4b9";ctx.fillRect(750,40,150,44);ctx.fillStyle="#496151";ctx.font="800 12px system-ui";ctx.fillText("ENTRANCE  ↓",780,67);
    const shelfSlots=4+state.upgrades.expansion;
    for(let i=0;i<shelfSlots;i++){
      const x=80+(i%4)*202,y=140+Math.floor(i/4)*165;
      const p=availableProducts()[i%availableProducts().length];
      ctx.fillStyle="#c18a4f";ctx.fillRect(x,y,155,78);ctx.fillStyle="#e7bd7d";ctx.fillRect(x+5,y+5,145,13);
      ctx.fillStyle="#946b42";ctx.fillRect(x+7,y+24,141,48);
      const stock=state.stocks[p.id]||0,cap=shelfCapacity(p);
      for(let n=0;n<Math.min(10,Math.ceil(stock/cap*10));n++){ctx.fillStyle=p.color;ctx.fillRect(x+12+n*13,y+32,10,31)}
      ctx.fillStyle="#fff";ctx.font="700 10px system-ui";ctx.fillText(p.name.toUpperCase(),x+9,y+68);
      ctx.fillStyle="#8c7252";ctx.fillRect(x+10,y+78,9,10);ctx.fillRect(x+136,y+78,9,10);
    }
    ctx.fillStyle="#7b9c86";ctx.fillRect(710,438,176,58);ctx.fillStyle="#eaf2eb";ctx.font="800 12px system-ui";ctx.fillText("CHECKOUT",750,472);
    ctx.fillStyle="#d6e4d9";ctx.fillRect(720,448,155,8);
    state.customers.forEach(c=>{
      ctx.save();ctx.translate(c.x,c.y);
      ctx.fillStyle="#00000018";ctx.beginPath();ctx.ellipse(0,13,12,5,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=c.color;ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#f3d1b1";ctx.beginPath();ctx.arc(0,-12,7,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#46564d";ctx.fillRect(10,5,10,7);ctx.strokeStyle="#46564d";ctx.strokeRect(10,5,10,7);
      ctx.restore();
    });
    ctx.fillStyle="#8a958b";ctx.font="10px system-ui";ctx.fillText("AISLE 01",52,123);ctx.fillText("AISLE 02",52,290);
  }
  function endDay(){
    if(!state.open)return;
    state.open=false;state.paused=true;state.customers.forEach(c=>{if(c.phase!=="exit")state.dayLost++});state.customers=[];
    const rent=35+state.upgrades.expansion*22,wages=state.upgrades.staff*24,expenses=rent+wages,profit=state.dayRevenue-expenses;
    state.cash-=expenses;state.reputation=Math.max(0,Math.min(100,state.reputation+(profit>0?1.2:-1.8)));
    addXP(Math.max(8,Math.floor(Math.max(0,profit)/12)));
    $("report-title").textContent="Day "+state.day+" complete";
    $("report-content").innerHTML='<div class="report-grid"><span>Sales</span><strong>'+money(state.dayRevenue)+'</strong><span>Rent & wages</span><strong>−'+money(expenses)+'</strong><span>Net profit</span><strong>'+money(profit)+'</strong><span>Customers served</span><strong>'+state.dayCustomers+'</strong><span>Missed shoppers</span><strong>'+state.dayLost+'</strong><span>Reputation</span><strong>'+Math.round(state.reputation)+'/100</strong></div><p class="report-note">'+(profit>=0?"A profitable day. Keep the shelves stocked and grow your neighborhood reputation.":"A rough day. Try adjusting prices and keeping popular items available.")+'</p>';
    $("day-report").classList.remove("hidden");$("open-status").innerHTML="<i></i> CLOSED";renderStats();save();
  }
  function nextDay(){
    state.day++;state.dayRevenue=0;state.dayCustomers=0;state.dayLost=0;state.elapsed=0;state.open=true;state.paused=false;state.customers=[];state.nextCustomer=2;
    $("day-report").classList.add("hidden");log("Day "+state.day+" is open. Let's make it count.");renderStats();save();
  }
  function frame(now){
    const dt=Math.min(.05,(now-lastFrame)/1000||0);lastFrame=now;
    if(state.open&&!state.paused){
      state.elapsed+=dt;
      if(state.elapsed>=120){endDay()}
      else{state.nextCustomer-=dt;if(state.nextCustomer<=0){if(state.customers.length<5+state.upgrades.sign*2)spawnCustomer();state.nextCustomer=rand(3.8,6.5)/(1+state.upgrades.sign*.16)}updateCustomers(dt)}
      if(Math.floor(state.elapsed)%5===0)renderStats();
    }
    drawStore();animation=requestAnimationFrame(frame);
  }
  $("restock-all").addEventListener("click",()=>availableProducts().forEach(p=>restock(p.id,12)));
  $("product-list").addEventListener("click",()=>{});
  $("management-tabs").addEventListener?.("click",()=>{});
  document.querySelectorAll(".management-tab").forEach(tab=>tab.addEventListener("click",()=>{
    document.querySelectorAll(".management-tab").forEach(t=>t.classList.toggle("active",t===tab));
    $("stock-tab").classList.toggle("hidden",tab.dataset.tab!=="stock");$("business-tab").classList.toggle("hidden",tab.dataset.tab!=="business");
  }));
  $("pause-button").addEventListener("click",()=>{state.paused=!state.paused;renderStats();save()});
  $("close-day").addEventListener("click",endDay);$("next-day").addEventListener("click",nextDay);
  $("fullscreen-button").addEventListener("click",async()=>{try{if(!document.fullscreenElement)await document.querySelector(".shop-main").requestFullscreen();else await document.exitFullscreen()}catch{}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.fullscreenElement)document.exitFullscreen()});
  window.addEventListener("beforeunload",save);
  renderAll();log("Your shop is ready. Open for business!");drawStore();animation=requestAnimationFrame(frame);
})();