(()=>{
'use strict';
if(window.__ceciliaTopInfo)return;window.__ceciliaTopInfo=true;
const $=id=>document.getElementById(id);
const format=(v,d=0)=>Number(v).toLocaleString('es-PY',{minimumFractionDigits:d,maximumFractionDigits:d});
const paraguay=()=>new Date().toLocaleString('es-PY',{timeZone:'America/Asuncion',weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
function init(){
const dash=$('dashboard');if(!dash||$('ccTopInfo'))return;
const el=document.createElement('section');el.id='ccTopInfo';el.className='cc-top-info';
el.innerHTML='<div class="cc-info-tile"><span class="cc-info-icon" aria-hidden="true">◷</span><div><small>Fecha y hora · Paraguay</small><strong id="ccClock">—</strong></div></div>'+
'<div class="cc-info-tile"><span class="cc-info-icon" aria-hidden="true">☁</span><div><small>Clima · Santa María de Fe</small><strong id="ccWeather">Consultando...</strong><small id="ccWeatherInfo">Open-Meteo</small></div></div>'+
'<div class="cc-info-tile cc-fx"><span class="cc-info-icon" aria-hidden="true">$</span><div><small>Dólar · Cambios Chaco</small><strong id="ccRates">Consultando...</strong><small id="ccRatesInfo">Compra / venta · Gs. por USD</small><a href="https://www.cambioschaco.com.py/" target="_blank" rel="noopener noreferrer">Ver cotización oficial ↗</a></div></div>'+
'<div class="cc-info-tile cc-convert"><div><small>Conversor USD ⇄ PYG</small><div class="cc-convert-fields"><input id="ccFxAmount" type="number" min="0" step="any" value="1" aria-label="Cantidad a convertir"><select id="ccFxDirection" aria-label="Sentido de conversión"><option value="usd-pyg">USD → Gs.</option><option value="pyg-usd">Gs. → USD</option></select></div><strong id="ccFxResult">Esperando cotización</strong><small id="ccFxHelp">Usa compra al vender USD y venta al comprar USD.</small></div></div>';
const anchor=dash.querySelector('.page-head');if(anchor)anchor.insertAdjacentElement('afterend',el);else dash.insertBefore(el,dash.firstChild);
const tick=()=>{$('ccClock').textContent=paraguay()};tick();setInterval(tick,60000);
$('ccFxAmount').addEventListener('input',compute);$('ccFxDirection').addEventListener('change',compute);
loadWeather();loadRates();
}
let quote=null;
function compute(){
const amount=Number($('ccFxAmount')?.value||0),dir=$('ccFxDirection')?.value;
if(!quote){$('ccFxResult').textContent='Cotización no disponible';return}
if(!Number.isFinite(amount)||amount<0){$('ccFxResult').textContent='Ingresá un importe válido';return}
$('ccFxResult').textContent=dir==='usd-pyg'?'Gs. '+format(amount*quote.buy):'USD '+format(amount/quote.sell,2);
}
async function loadWeather(){
try{
const c=new AbortController();const timeout=setTimeout(()=>c.abort(),7000);
let r;try{r=await fetch('https://api.open-meteo.com/v1/forecast?latitude=-26.783&longitude=-56.95&current=temperature_2m,weather_code&timezone=America%2FAsuncion',{signal:c.signal})}finally{clearTimeout(timeout)}
if(!r.ok)throw Error('HTTP '+r.status);
const data=await r.json();const t=data?.current?.temperature_2m;
if(typeof t!=='number')throw Error('No temp');
const code=data.current.weather_code;
const icon=code===0?'☀️':code<=3?'⛅':code>=51&&code<=67?'🌧️':code>=80&&code<=82?'🌦️':code>=95?'⛈️':'☁️';
$('ccWeather').textContent=icon+' '+format(t,0)+' °C';
$('ccWeatherInfo').textContent='Temperatura actual · Open-Meteo';
}catch(e){$('ccWeather').textContent='Clima no disponible';$('ccWeatherInfo').textContent='Consultá más tarde'}
}
async function loadRates(){
/* Fuente oficial sin API pública documentada: lectura de su versión textual.
   No se inventan cotizaciones si la lectura no funciona o es inconsistente. */
try{
const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
let response;try{response=await fetch('https://r.jina.ai/https://www.cambioschaco.com.py/',{signal:controller.signal,headers:{Accept:'text/plain'}})}finally{clearTimeout(timeout)}
if(!response.ok)throw Error('HTTP '+response.status);
const text=await response.text();
const match=text.match(/D[oó]lar Americano\s*\|?\s*([\d.,]+)\s*\|?\s*([\d.,]+)/i);
if(!match)throw Error('Sin cotización');
const number=s=>Number(s.replace(/\./g,'').replace(',','.'));
const buy=number(match[1]),sell=number(match[2]);
if(!(buy>1000&&sell>buy&&sell<20000))throw Error('Cotización inválida');
const stamp=text.match(/Última Actualizaci[oó]n:\s*([0-9/:\s]+)/i);
quote={buy,sell};$('ccRates').textContent='Compra '+format(buy)+' · Venta '+format(sell);
$('ccRatesInfo').textContent=stamp?'Actualización fuente: '+stamp[1].trim():'Fuente: Cambios Chaco · verificar vigencia';
compute();
}catch(e){quote=null;$('ccRates').textContent='Cotización no disponible';$('ccRatesInfo').textContent='Abrí Cambios Chaco para consultar tasas actuales';compute()}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();