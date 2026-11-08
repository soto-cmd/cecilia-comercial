(()=>{
'use strict';
if(window.__ccAnalytics)return;window.__ccAnalytics=true;
const $=id=>document.getElementById(id),active=k=>(state[k]||[]).filter(x=>!x.deletedAt);
const fmt=n=>money(n),safe=s=>esc(s),sum=a=>a.reduce((n,x)=>n+Number(x.amount||0),0);
function init(){
const dash=$('dashboard');if(!dash||$('ccInsights'))return;
const panel=document.createElement('section');panel.id='ccInsights';panel.className='cc-insights';
panel.innerHTML='<h3>Análisis comercial</h3><p>Indicadores de ventas, cobros y clientes. Datos del registro existente.</p><div class="cc-filters"><label>Desde<input type="date" id="ccFrom"></label><label>Hasta<input type="date" id="ccTo"></label><label>Cliente<select id="ccClient"><option value="">Todos</option></select></label><button id="ccClear" class="btn btn-secondary btn-small">Limpiar</button></div><div class="cc-graphs"><article class="panel cc-collection-panel"><h4>Cartera por cobrar</h4><p class="cc-note">Saldo pendiente actual de los clientes.</p><div id="ccCollectionPending" aria-live="polite"></div></article><article class="panel cc-collection-panel"><h4>Cobrado este mes</h4><p class="cc-note">Pagos registrados durante el mes actual.</p><div id="ccCollectionMonthly" aria-live="polite"></div></article><article class="panel"><h4>Clientes con más ventas</h4><div id="ccFrequent"></div></article><article class="panel cc-items-panel"><h4>Ítems más vendidos (estimación)</h4><p class="cc-note">Agrupados por el concepto escrito en cada venta. Indica número de ventas, no unidades; para cantidades exactas se requiere registrar productos y unidades por venta.</p><div id="ccTopItems"></div></article></div>';
const anchor=$('incomeDashboard')||dash.querySelector('.grid-2');if(anchor)anchor.insertAdjacentElement('beforebegin',panel);else dash.appendChild(panel);
const now=new Date(),from=new Date(now.getFullYear(),now.getMonth()-5,1);
$('ccFrom').value=from.getFullYear()+'-'+String(from.getMonth()+1).padStart(2,'0')+'-01';$('ccTo').value=today();
panel.querySelectorAll('select,input').forEach(n=>n.addEventListener('change',draw));
$('ccClear').addEventListener('click',()=>{$('ccFrom').value='';$('ccTo').value='';$('ccClient').value='';draw()});
draw();
}
function rank(id,data,render){const mx=Math.max(1,...data.map(x=>x.value));$(id).innerHTML=data.length?data.map(x=>'<div class="cc-rank"><div><span>'+safe(x.name)+'</span><b>'+render(x.value)+'</b></div><div class="cc-track"><span style="width:'+(x.value/mx*100)+'%"></span></div></div>').join(''):'<p class="cc-empty">Sin datos en la selección.</p>'}
function draw(){
if(!$('ccInsights'))return;
const clients=active('clients'),sel=$('ccClient'),previous=sel.value;
sel.innerHTML='<option value="">Todos</option>'+clients.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(c=>'<option value="'+safe(c.id)+'">'+safe(c.name)+'</option>').join('');
sel.value=clients.some(c=>c.id===previous)?previous:'';
const cid=sel.value,from=$('ccFrom').value,to=$('ccTo').value;
const match=x=>(!cid||x.clientId===cid)&&(!from||x.date>=from)&&(!to||x.date<=to);
const sales=active('sales').filter(match);



// Los indicadores de cobranza son actuales, independientes del filtro histórico de ventas.
const allDebts=active('debts'),allPayments=active('payments');
const debtors=clients.filter(client=>balance(client.id)>0);
const pending=debtors.reduce((n,client)=>n+Math.max(0,balance(client.id)),0);
const overdue=allDebts.filter(debt=>debt.due&&debt.due<today()).reduce((n,debt)=>n+Math.max(0,debtRemaining(debt)),0);
const month=today().slice(0,7);
const monthlyPayments=allPayments.filter(payment=>String(payment.date||'').slice(0,7)===month);
const monthPaid=sum(monthlyPayments);
const safeOverdue=Math.min(pending,overdue);
$('ccCollectionPending').innerHTML='<div class="cc-collection-main"><div><span class="cc-collection-caption">Clientes con deuda</span><strong class="cc-collection-count">'+debtors.length+'</strong><small>clientes con saldo pendiente</small></div><div><span class="cc-collection-caption">Total por cobrar</span><strong>'+fmt(pending)+'</strong><small>Saldo actual de todas las cuentas</small></div></div><div class="cc-collection-foot"><span>Deuda vencida</span><strong>'+fmt(safeOverdue)+'</strong></div>';
$('ccCollectionMonthly').innerHTML='<div class="cc-collection-month"><span class="cc-collection-caption">Total recibido este mes</span><strong>'+fmt(monthPaid)+'</strong><small>'+monthlyPayments.length+' pago(s) registrado(s) · '+new Intl.DateTimeFormat('es-PY',{month:'long',year:'numeric'}).format(new Date())+'</small></div><div class="cc-collection-foot"><span>Último cobro registrado</span><strong>'+(allPayments.length?fmtDate([...allPayments].sort((x,y)=>String(y.date||'').localeCompare(String(x.date||'')))[0].date):'Sin pagos')+'</strong></div>';

const counts=new Map();sales.forEach(x=>{const name=clients.find(c=>c.id===x.clientId)?.name||'Venta sin cliente',key=x.clientId||'_anonymous',entry=counts.get(key)||{name,value:0};entry.value++;counts.set(key,entry)});
rank('ccFrequent',[...counts.values()].sort((x,y)=>y.value-x.value).slice(0,5),n=>n+' venta(s)');

const items=new Map();sales.forEach(x=>{const name=String(x.concept||'').trim().replace(/\s+/g,' ');if(!name)return;const key=name.toLocaleLowerCase('es-PY');const record=items.get(key)||{name,value:0,total:0};record.value++;record.total+=Number(x.amount||0);items.set(key,record)});
const best=[...items.values()].sort((x,y)=>y.value-x.value||y.total-x.total).slice(0,5);
$('ccTopItems').innerHTML=best.length?best.map((x,i)=>'<div class="cc-item-row"><span><b>'+(i+1)+'.</b> '+safe(x.name)+'</span><span><strong>'+x.value+' venta(s)</strong><small>'+fmt(x.total)+' en ventas</small></span></div>').join(''):'<p class="cc-empty">No hay conceptos de venta en el período.</p>';


}
const previous=renderAll;renderAll=function(){previous();draw()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();