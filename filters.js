(()=>{
'use strict';
if(window.__ceciliaFiltersInstalled)return;
window.__ceciliaFiltersInstalled=true;
const definitions=[
 {view:'clientes',table:'clientsTable',search:'clientSearch',date:-1,filters:[['saldo','Saldo',[['','Todos'],['positive','Con saldo'],['zero','Sin saldo']]]]},
 {view:'ventas',table:'salesTable',date:0,client:1,filters:[['tipo','Tipo',[['','Todas'],['Contado','Contado'],['Crédito','Crédito']]]]},
 {view:'deudas',table:'debtsTable',date:2,client:0,filters:[['estado','Estado',[['','Todos'],['Pendiente','Pendiente'],['Vencida','Vencida'],['Pagada','Pagada']]]]},
 {view:'pagos',table:'paymentsTable',date:0,client:1,filters:[['medio','Medio',[['','Todos'],['Efectivo','Efectivo'],['Transferencia','Transferencia'],['QR','QR'],['Otro','Otro']]]]},
 {view:'proveedores',table:'suppliersTable',search:'supplierSearch',date:-1,filters:[['estado','Estado',[['','Todos'],['Activo','Activos'],['Inactivo','Inactivos']]]]},
 {view:'inventario',table:'productsTable',search:'productSearch',date:-1,filters:[['estado','Estado',[['','Todos'],['Normal','Normal'],['Stock bajo','Stock bajo'],['Inactivo','Inactivos']]]]},
 {view:'inventario',table:'inventoryMovementsTable',date:0,client:4,clientLabel:'Proveedor',filters:[['tipo','Movimiento',[['','Todos'],['Entrada','Entrada'],['Salida','Salida'],['Ajuste','Ajuste']]]]}
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readDate=s=>{const m=String(s||'').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?`${m[3]}-${m[2]}-${m[1]}`:''};
const findRows=d=>Array.from(document.getElementById(d.table)?.querySelectorAll('tr')||[]).filter(r=>r.querySelector('td')&&!r.querySelector('.empty-row'));
function options(d,field){const idx=d.client;const values=new Set(findRows(d).map(r=>r.cells[idx]?.textContent.trim()).filter(x=>x&&x!=='-'));return [...values].sort((a,b)=>a.localeCompare(b,'es')).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}
function apply(d){
 const bar=document.getElementById('filters-'+d.table);if(!bar)return;
 const term=(bar.querySelector('[data-filter="text"]')?.value||'').trim().toLocaleLowerCase();
 const from=bar.querySelector('[data-filter="from"]')?.value||'';
 const to=bar.querySelector('[data-filter="to"]')?.value||'';
 const customer=bar.querySelector('[data-filter="client"]')?.value||'';
 const extra=bar.querySelector('[data-filter="extra"]')?.value||'';
 const rows=findRows(d);let shown=0;
 for(const row of rows){
  const cells=row.cells;const date=d.date>=0?readDate(cells[d.date]?.textContent):'';
  const text=cells.length?row.textContent.toLocaleLowerCase():'';
  let match=(!term||text.includes(term))&&(!customer||cells[d.client]?.textContent.trim()===customer)&&(!from||date>=from)&&(!to||date<=to);
  const status=row.querySelector('.status')?.textContent.trim()||'';
  if(extra){
   if(d.table==='clientsTable'){const amount=cells[3]?.textContent.replace(/[^\d-]/g,'')||'0';match=match&&(extra==='positive'?Number(amount)>0:Number(amount)===0)}
   else if(d.table==='suppliersTable'||d.table==='productsTable'||d.table==='debtsTable')match=match&&status===extra;
   else if(d.table==='salesTable'||d.table==='inventoryMovementsTable')match=match&&cells[3-(d.table==='inventoryMovementsTable'?2:0)]?.textContent.trim()===extra;
   else if(d.table==='paymentsTable')match=match&&cells[3]?.textContent.trim()===extra;
  }
  row.hidden=!match;row.style.display=match?'':'none';if(match)shown++;
 }
 const count=bar.querySelector('[data-count]');if(count)count.textContent=`${shown} de ${rows.length} registros`;
}
function mount(d){
 const body=document.getElementById(d.table),section=document.getElementById(d.view);if(!body||!section)return;
 const table=body.closest('.table-wrap');if(!table||document.getElementById('filters-'+d.table))return;
 const bar=document.createElement('div');bar.id='filters-'+d.table;bar.className='cecilia-filter-bar';
 let html=d.search?'':`<label>Buscar<input data-filter="text" type="search" placeholder="Buscar en registros" /></label>`;
 if(d.client!==undefined)html+=`<label>${d.clientLabel||'Cliente'}<select data-filter="client"><option value="">Todos</option></select></label>`;
 if(d.date>=0)html+='<label>Desde<input data-filter="from" type="date" /></label><label>Hasta<input data-filter="to" type="date" /></label>';
 if(d.filters?.length){const f=d.filters[0];html+=`<label>${f[1]}<select data-filter="extra">${f[2].map(o=>`<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select></label>`}
 html+='<button type="button" data-clear class="btn btn-secondary btn-small">Limpiar filtros</button><span data-count aria-live="polite"></span>';
 bar.innerHTML=html;table.parentNode.insertBefore(bar,table);
 bar.addEventListener('input',()=>apply(d));bar.addEventListener('change',()=>apply(d));
 bar.querySelector('[data-clear]').addEventListener('click',()=>{bar.querySelectorAll('input,select').forEach(x=>x.value='');if(d.search){const source=document.getElementById(d.search);if(source){source.value='';source.dispatchEvent(new Event('input',{bubbles:true}))}}apply(d)});
 if(d.search)document.getElementById(d.search)?.addEventListener('input',()=>apply(d));
 const update=()=>{
  if(d.client!==undefined){const s=bar.querySelector('[data-filter="client"]');const previous=s.value;s.innerHTML='<option value="">Todos</option>'+options(d);if([...s.options].some(x=>x.value===previous))s.value=previous}
  apply(d)
 };
 new MutationObserver(update).observe(body,{childList:true});
 update();
}
function init(){
 const css=document.createElement('style');css.textContent='.cecilia-filter-bar{display:flex;flex-wrap:wrap;align-items:end;gap:10px;margin:12px 0;padding:12px;border:1px solid #d8c69b;border-radius:12px;background:rgba(201,162,39,.07)}.cecilia-filter-bar label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;min-width:135px;flex:1 1 140px}.cecilia-filter-bar input,.cecilia-filter-bar select{width:100%;min-height:38px;padding:7px 9px;border-radius:8px;border:1px solid #c5c5c5;background:var(--surface,#fff);color:inherit}.cecilia-filter-bar [data-count]{font-size:12px;opacity:.75;white-space:nowrap;padding:8px}';document.head.appendChild(css);
 definitions.forEach(mount);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();