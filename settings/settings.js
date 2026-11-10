(() => {
  const KEY="taravo-settings";
  const defaults={particles:true,sensitivity:100};
  let prefs={...defaults};
  try{prefs={...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{}
  const particles=document.getElementById("particles"),sensitivity=document.getElementById("sensitivity"),value=document.getElementById("sensitivity-value"),status=document.getElementById("settings-status");
  function save(){localStorage.setItem(KEY,JSON.stringify(prefs));status.textContent="Saved on this device."}
  particles.checked=prefs.particles!==false;sensitivity.value=prefs.sensitivity;value.textContent=prefs.sensitivity+"%";
  particles.addEventListener("change",()=>{prefs.particles=particles.checked;save()});
  sensitivity.addEventListener("input",()=>{prefs.sensitivity=Number(sensitivity.value);value.textContent=prefs.sensitivity+"%";save()});
  document.getElementById("reset-best").addEventListener("click",()=>{localStorage.removeItem("taravo-breaker-best");status.textContent="Brick Breaker best score reset."});
})();