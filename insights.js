(()=>{
'use strict';
if(window.__ccAnalytics)return;window.__ccAnalytics=true;
const $=id=>document.getElementById(id),active=k=>(state[k]||[]).filter(x=>!x.deletedAt);
const fmt=n=>money(n),safe=s=>esc(s),sum=a=>a.reduce((n,x)=>n+Number(x.amount||0),0);
const group=(d,unit)=>{if(unit==='month')return d.slice(0,7);if(unit==='day')return d;const t=new Date(d+'T12:00:00');t.setDate(t.getDate()-((t.getDay()+6)%7));return t.toISOString().slice(0,10)};
function init(){
const dash=$('dashboard');if(!dash||$('ccInsights'))return;
const panel=document.createElement('section');panel.id='ccInsights';panel.className='cc-insights';
panel.innerHTML='<h3>Análisis comercial</h3><p>Indicadores de ventas, cobros y clientes. Datos del registro existente.</p><div class="cc-filters"><label>Desde<input type="date" id="ccFrom"></label><label>Hasta<input type="date" id="ccTo"></label><label>Cliente<select id="ccClient"><option value="">Todos</option></select></label><label>Agrupar por<select id="ccGrouping"><option value="month">Mes</option><option value="week">Semana</option><option value="day">Día</option></select></label><button id="ccClear" class="btn btn-secondary btn-small">Limpiar</button></div><div id="ccStats" class="cc-stats"></div><div class="cc-graphs"><article class="panel"><h4>Ventas y cobros en el tiempo</h4><div class="cc-legend" aria-label="Leyenda de tipos de movimiento"><span><i class="cc-key cc-key-cash" aria-hidden="true"></i>Contado</span><span><i class="cc-key cc-key-credit" aria-hidden="true"></i>Crédito</span><span><i class="cc-key cc-key-paid" aria-hidden="true"></i>Cobros</span></div><div id="ccTrend"></div><p id="ccTrendStatus" class="cc-trend-status" aria-live="polite"></p></article><article class="panel"><h4>Distribución de ventas</h4><div id="ccMix"></div></article><article class="panel"><h4>Clientes con mayor saldo actual</h4><p class="cc-note">Saldos actuales, independientes del rango de fechas.</p><div id="ccBalances"></div></article><article class="panel"><h4>Clientes con más ventas</h4><div id="ccFrequent"></div></article><article class="panel cc-items-panel"><h4>Ítems más vendidos (estimación)</h4><p class="cc-note">Agrupados por el concepto escrito en cada venta. Indica número de ventas, no unidades; para cantidades exactas se requiere registrar productos y unidades por venta.</p><div id="ccTopItems"></div></article></div>';
const anchor=$('incomeDashboard')||dash.querySelector('.grid-2');if(anchor)anchor.insertAdjacentElement('beforebegin',panel);else dash.appendChild(panel);
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
$('ccTrend').innerHTML=points.length?'<div class="cc-bars">'+points.map(p=>'<div class="cc-col"><div class="cc-col-bars">'+[['cash','#5d9f75','Contado'],['credit','#8975b8','Crédito'],['paid','#5999c8','Cobros']].map(t=>'<span role="img" aria-label="'+t[2]+': '+fmt(p[1][t[0]])+'" title="'+t[2]+' · '+safe(p[0])+' · '+fmt(p[1][t[0]])+'" style="background:'+t[1]+';height:'+(p[1][t[0]]?Math.max(3,p[1][t[0]]/max*100):0)+'%"></span>').join('')+'</div><small>'+safe(p[0].slice(unit==='month'?2:5))+'</small></div>').join('')+'</div>':'<p class="cc-empty">Sin movimientos en el período.</p>';
const pct=(a+b)?a/(a+b)*100:0;
$('ccMix').innerHTML=(a+b)?'<div class="cc-mix"><span style="background:#5d9f75;width:'+pct+'%"></span><span style="background:#8975b8;width:'+(100-pct)+'%"></span></div><p>Contado: '+fmt(a)+' ('+Math.round(pct)+'%)</p><p>Crédito: '+fmt(b)+' ('+Math.round(100-pct)+'%)</p>':'<p class="cc-empty">Sin ventas en el período.</p>';
const balances=clients.filter(x=>!cid||x.id===cid).map(x=>({name:x.name,value:Math.max(0,totalDebt(x.id)-totalPaid(x.id))})).filter(x=>x.value>0).sort((x,y)=>y.value-x.value).slice(0,5);
rank('ccBalances',balances,fmt);
const counts=new Map();sales.forEach(x=>{const name=clients.find(c=>c.id===x.clientId)?.name||'Venta sin cliente',key=x.clientId||'_anonymous',entry=counts.get(key)||{name,value:0};entry.value++;counts.set(key,entry)});
rank('ccFrequent',[...counts.values()].sort((x,y)=>y.value-x.value).slice(0,5),n=>n+' venta(s)');

const items=new Map();sales.forEach(x=>{const name=String(x.concept||'').trim().replace(/\s+/g,' ');if(!name)return;const key=name.toLocaleLowerCase('es-PY');const record=items.get(key)||{name,value:0,total:0};record.value++;record.total+=Number(x.amount||0);items.set(key,record)});
const best=[...items.values()].sort((x,y)=>y.value-x.value||y.total-x.total).slice(0,5);
$('ccTopItems').innerHTML=best.length?best.map((x,i)=>'<div class="cc-item-row"><span><b>'+(i+1)+'.</b> '+safe(x.name)+'</span><span><strong>'+x.value+' venta(s)</strong><small>'+fmt(x.total)+' en ventas</small></span></div>').join(''):'<p class="cc-empty">No hay conceptos de venta en el período.</p>';
const byMonth=new Map();[['Contado',cash],['Crédito',credit],['Cobros',payments]].forEach(([label,rows])=>rows.forEach(x=>{const key=String(x.date||'').slice(0,7);if(!/^\d{4}-\d{2}$/.test(key))return;const m=byMonth.get(key)||{Contado:0,Crédito:0,Cobros:0};m[label]+=Number(x.amount||0);byMonth.set(key,m)}));
const monthly=[...byMonth].sort((a,b)=>a[0].localeCompare(b[0]));
const totals=monthly.map(([ym,v])=>({ym,total:v.Contado+v.Cobros}));
const recent=totals.slice(-3),prev=totals.at(-2),last=totals.at(-1);
const pctChange=(prev&&last&&prev.total)?((last.total-prev.total)/prev.total*100):null;
const trendLabel=pctChange===null?'Sin base para variación mensual':(pctChange>0?'+':'')+pctChange.toFixed(1)+'% vs. mes anterior';
const el=$('ccTrendStatus');if(el)el.textContent=last?'Tendencia de ingresos · '+trendLabel:'Tendencia sin datos';

}
const previous=renderAll;renderAll=function(){previous();draw()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();