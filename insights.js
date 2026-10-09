(()=>{
'use strict';
if(window.__ccAnalytics)return;window.__ccAnalytics=true;
const $=id=>document.getElementById(id),active=k=>(state[k]||[]).filter(x=>!x.deletedAt);
const fmt=n=>money(n),safe=s=>esc(s),sum=a=>a.reduce((n,x)=>n+Number(x.amount||0),0);
const group=(d,unit)=>{if(unit==='month')return d.slice(0,7);if(unit==='day')return d;const t=new Date(d+'T12:00:00');t.setDate(t.getDate()-((t.getDay()+6)%7));return t.toISOString().slice(0,10)};
function init(){
const dash=$('dashboard');if(!dash||$('ccInsights'))return;
const panel=document.createElement('section');panel.id='ccInsights';panel.className='cc-insights';
panel.innerHTML='<h3>Análisis comercial</h3><p>Indicadores de ventas, cobros y clientes. Datos del registro existente.</p><div class="cc-filters"><label>Desde<input type="date" id="ccFrom"></label><label>Hasta<input type="date" id="ccTo"></label><label>Cliente<select id="ccClient"><option value="">Todos</option></select></label><label>Agrupar por<select id="ccGrouping"><option value="month">Mes</option><option value="week">Semana</option><option value="day">Día</option></select></label><button id="ccClear" class="btn btn-secondary btn-small">Limpiar</button></div><div id="ccStats" class="cc-stats"></div><div class="cc-graphs"><article class="panel"><h4>Ventas y cobros en el tiempo</h4><div class="cc-legend"><span>■ Contado</span><span>■ Crédito</span><span>■ Cobros</span></div><div id="ccTrend"></div></article><article class="panel"><h4>Distribución de ventas</h4><div id="ccMix"></div></article><article class="panel cc-monthly-panel"><h4>Comparativo por mes</h4><p class="cc-note">Ventas, cobros e ingresos; las ventas a crédito no son ingresos hasta cobrarse.</p><div id="ccMonthly"></div></article><article class="panel"><h4>Clientes con mayor saldo actual</h4><p class="cc-note">Saldos actuales, independientes del rango de fechas.</p><div id="ccBalances"></div></article><article class="panel"><h4>Clientes con más ventas</h4><div id="ccFrequent"></div></article></div>';
const anchor=$('incomeDashboard')||dash.querySelector('.grid-2');if(anchor)anchor.insertAdjacentElement('afterend',panel);else dash.appendChild(panel);
const now=new Date(),from=new Date(now.getFullYear(),now.getMonth()-5,1);
$('ccFrom').value=from.getFullYear()+'-'+String(from.getMonth()+1).padStart(2,'0')+'-01';$('ccTo').value=today();
panel.querySelectorAll('select,input').forEach(n=>n.addEventListener('change',draw));
$('ccClear').addEventListener('click',()=>{$('ccFrom').value='';$('ccTo').value='';$('ccClient').value='';$('ccGrouping').value='month';draw()});
draw();
}
function rank(id,data,render){const mx=Math.max(1,...data.map(x=>x.value));$(id).innerHTML=data.length?data.map(x=>'<div class="cc-rank"><div><span>'+safe(x.name)+'</span><b>'+render(x.value)+'</b></div><div class="cc-track"><span style="width:'+(x.value/mx*100)+'%"></span></div></div>').join(''):'<p class="cc-empty">Sin datos en la selección.</p>'}
function draw(){
if(!$('ccInsights'))return;
const clients=active('clients'),sel=$('ccClient'),previous=sel.value;
sel.innerHTML='<option value="">Todos</option>'+clients.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(c=>'<option value="'+safe(c.id)+'">'+safe(c.name)+'</option>').join('');
sel.value=clients.some(c=>c.id===previous)?previous:'';
const cid=sel.value,from=$('ccFrom').value,to=$('ccTo').value,unit=$('ccGrouping').value;
const match=x=>(!cid||x.clientId===cid)&&(!from||x.date>=from)&&(!to||x.date<=to);
const sales=active('sales').filter(match),payments=active('payments').filter(match);
const cash=sales.filter(x=>x.type==='Contado'),credit=sales.filter(x=>x.type==='Crédito');
const a=sum(cash),b=sum(credit),c=sum(payments);
$('ccStats').innerHTML=[['Ventas al contado',a],['Ventas a crédito',b],['Cobros registrados',c],['Ingresos recibidos',a+c]].map(x=>'<div class="cc-stat"><small>'+x[0]+'</small><strong>'+fmt(x[1])+'</strong></div>').join('');
const buckets=new Map();
[['cash',cash],['credit',credit],['paid',payments]].forEach(pair=>pair[1].forEach(x=>{if(!x.date)return;const k=group(x.date,unit),v=buckets.get(k)||{cash:0,credit:0,paid:0};v[pair[0]]+=Number(x.amount||0);buckets.set(k,v)}));
const points=[...buckets].sort((x,y)=>x[0].localeCompare(y[0])).slice(-18);
const max=Math.max(1,...points.map(x=>Math.max(x[1].cash,x[1].credit,x[1].paid)));
$('ccTrend').innerHTML=points.length?'<div class="cc-bars">'+points.map(p=>'<div class="cc-col"><div class="cc-col-bars">'+[['cash','#5d9f75'],['credit','#8975b8'],['paid','#5999c8']].map(t=>'<span title="'+safe(p[0])+' · '+fmt(p[1][t[0]])+'" style="background:'+t[1]+';height:'+(p[1][t[0]]?Math.max(3,p[1][t[0]]/max*100):0)+'%"></span>').join('')+'</div><small>'+safe(p[0].slice(unit==='month'?2:5))+'</small></div>').join('')+'</div>':'<p class="cc-empty">Sin movimientos en el período.</p>';
const pct=(a+b)?a/(a+b)*100:0;
$('ccMix').innerHTML=(a+b)?'<div class="cc-mix"><span style="background:#5d9f75;width:'+pct+'%"></span><span style="background:#8975b8;width:'+(100-pct)+'%"></span></div><p>Contado: '+fmt(a)+' ('+Math.round(pct)+'%)</p><p>Crédito: '+fmt(b)+' ('+Math.round(100-pct)+'%)</p>':'<p class="cc-empty">Sin ventas en el período.</p>';

const mixed=a+b;
$('ccMix').innerHTML=mixed?'<div class="cc-donut-layout"><div class="cc-donut" role="img" aria-label="Ventas al contado '+Math.round(pct)+'%, ventas a crédito '+Math.round(100-pct)+'%" style="background:conic-gradient(#5d9f75 0% '+pct+'%,#8975b8 '+pct+'% 100%)"><div class="cc-hole"><b>'+fmt(mixed)+'</b><small>Total vendido</small></div></div><div class="cc-donut-info"><p><i style="background:#5d9f75"></i>Contado: '+fmt(a)+' ('+Math.round(pct)+'%)</p><p><i style="background:#8975b8"></i>Crédito: '+fmt(b)+' ('+Math.round(100-pct)+'%)</p></div></div>':'<p class="cc-empty">Sin ventas en el período.</p>';
const monthly=new Map();
[['cash',cash],['credit',credit],['paid',payments]].forEach(([type,items])=>items.forEach(x=>{const key=String(x.date||'').slice(0,7);if(!/^\d{4}-\d{2}$/.test(key))return;const v=monthly.get(key)||{cash:0,credit:0,paid:0};v[type]+=Number(x.amount||0);monthly.set(key,v)}));
const months=[...monthly].sort((x,y)=>x[0].localeCompare(y[0]));
function prevMonth(key){const [year,month]=key.split('-').map(Number);const d=new Date(year,month-2,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
$('ccMonthly').innerHTML=months.length?'<div class="cc-monthly-scroll"><table class="cc-monthly-table"><thead><tr><th>Mes</th><th>Contado</th><th>Crédito</th><th>Cobros</th><th>Ingresos</th><th>Vs. mes anterior</th></tr></thead><tbody>'+months.map(([key,v])=>{const income=v.cash+v.paid,prev=monthly.get(prevMonth(key)),previous=prev?prev.cash+prev.paid:null;let diff='—';if(previous!==null){diff=previous===0?(income===0?'0%':'Sin base'):(income-previous)/previous*100;diff=typeof diff==='number'?(diff>0?'+':'')+diff.toFixed(1)+'%':diff}return '<tr><td>'+safe(key.slice(5)+'/'+key.slice(0,4))+'</td><td>'+fmt(v.cash)+'</td><td>'+fmt(v.credit)+'</td><td>'+fmt(v.paid)+'</td><td><b>'+fmt(income)+'</b></td><td>'+safe(diff)+'</td></tr>'}).join('')+'</tbody></table></div>':'<p class="cc-empty">Sin movimientos mensuales en el período.</p>';

const balances=clients.filter(x=>!cid||x.id===cid).map(x=>({name:x.name,value:Math.max(0,totalDebt(x.id)-totalPaid(x.id))})).filter(x=>x.value>0).sort((x,y)=>y.value-x.value).slice(0,5);
rank('ccBalances',balances,fmt);
const counts=new Map();sales.forEach(x=>{const name=clients.find(c=>c.id===x.clientId)?.name||'Venta sin cliente',key=x.clientId||'_anonymous',entry=counts.get(key)||{name,value:0};entry.value++;counts.set(key,entry)});
rank('ccFrequent',[...counts.values()].sort((x,y)=>y.value-x.value).slice(0,5),n=>n+' venta(s)');
}
const previous=renderAll;renderAll=function(){previous();draw()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();