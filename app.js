const KEY='cecilia_comercial_v1';
let state=loadState();
let currentClientId=null;
let deferredPrompt=null;
const el=id=>document.getElementById(id);

function loadState(){
  try{
    const raw=localStorage.getItem(KEY);
    if(!raw)return {clients:[],debts:[],payments:[]};
    const data=JSON.parse(raw);
    if(!Array.isArray(data.clients)||!Array.isArray(data.debts)||!Array.isArray(data.payments))throw new Error('Formato inválido');
    return data;
  }catch{
    alert('No se pudieron leer los datos guardados. Cecilia iniciará sin cargar información hasta que restaures un respaldo válido.');
    return {clients:[],debts:[],payments:[]};
  }
}
function save(){localStorage.setItem(KEY,JSON.stringify(state));renderAll()}
function id(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function money(v){return 'Gs. '+Math.round(Number(v)||0).toLocaleString('es-PY')}
function today(){const d=new Date();const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,'0');const day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function clientById(cid){return state.clients.find(c=>c.id===cid)}
function totalDebt(cid){return state.debts.filter(d=>!cid||d.clientId===cid).reduce((s,d)=>s+Number(d.amount||0),0)}
function totalPaid(cid){return state.payments.filter(p=>!cid||p.clientId===cid).reduce((s,p)=>s+Number(p.amount||0),0)}
function rawBalance(cid){return totalDebt(cid)-totalPaid(cid)}
function balance(cid){return Math.max(0,rawBalance(cid))}
function debtRemaining(debt){
  const clientDebts=state.debts.filter(d=>d.clientId===debt.clientId).sort((a,b)=>a.date.localeCompare(b.date)||(a.createdAt||0)-(b.createdAt||0));
  let availablePaid=totalPaid(debt.clientId);
  for(const d of clientDebts){const used=Math.min(Number(d.amount),Math.max(0,availablePaid));const rem=Number(d.amount)-used;availablePaid-=used;if(d.id===debt.id)return Math.max(0,rem)}
  return Number(debt.amount||0);
}
function navSetup(){document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>goView(b.dataset.view)))}
function goView(v){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.view===v));
  const target=el(v);if(!target)return;target.classList.add('active');
  renderAll();
}
function renderDashboard(){
  const ym=today().slice(0,7);
  const paidMonth=state.payments.filter(p=>String(p.date||'').startsWith(ym)).reduce((s,p)=>s+Number(p.amount||0),0);
  const overdue=state.debts.filter(d=>d.due&&d.due<today()).reduce((s,d)=>s+debtRemaining(d),0);
  el('kpiSaldo').textContent=money(balance());el('kpiMes').textContent=money(paidMonth);el('kpiVencida').textContent=money(overdue);el('kpiClientes').textContent=state.clients.filter(c=>balance(c.id)>0).length;
  const top=[...state.clients].map(c=>({c,b:balance(c.id)})).filter(x=>x.b>0).sort((a,b)=>b.b-a.b).slice(0,5);
  el('topClientes').innerHTML=top.length?top.map(x=>`<div class="list-row"><span>${esc(x.c.name)}</span><strong>${money(x.b)}</strong></div>`).join(''):'<div class="empty">Sin saldos pendientes.</div>';
  const last=[...state.payments].sort((a,b)=>String(b.date).localeCompare(String(a.date))+(Number(b.createdAt||0)-Number(a.createdAt||0))).slice(0,5);
  el('ultimosPagos').innerHTML=last.length?last.map(p=>`<div class="list-row"><span>${esc(clientById(p.clientId)?.name||'Cliente')}</span><strong>${money(p.amount)}</strong></div>`).join(''):'<div class="empty">Aún no hay pagos registrados.</div>';
}
function renderClients(){
  const q=(el('clientSearch').value||'').toLowerCase();
  const arr=state.clients.filter(c=>[c.name,c.doc,c.phone].join(' ').toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name));
  el('clientsTable').innerHTML=arr.length?arr.map(c=>`<tr><td><button class="client-link" onclick="showClient('${c.id}')">${esc(c.name)}</button></td><td>${esc(c.doc||'-')}</td><td>${esc(c.phone||'-')}</td><td><strong>${money(balance(c.id))}</strong></td><td><button class="btn btn-secondary" onclick="showClient('${c.id}')">Ver cuenta</button></td></tr>`).join(''):'<tr><td colspan="5" class="empty-row">No hay clientes registrados.</td></tr>';
}
function renderDebts(){
  const arr=[...state.debts].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  el('debtsTable').innerHTML=arr.length?arr.map(d=>{const rem=debtRemaining(d),overdue=d.due&&d.due<today()&&rem>0;const cls=rem<=0?'ok':overdue?'bad':'warn';const label=rem<=0?'Pagada':overdue?'Vencida':'Pendiente';return `<tr><td>${esc(clientById(d.clientId)?.name||'-')}</td><td>${esc(d.concept)}</td><td>${fmtDate(d.date)}</td><td>${d.due?fmtDate(d.due):'-'}</td><td>${money(d.amount)}</td><td><strong>${money(rem)}</strong></td><td><span class="status ${cls}">${label}</span></td></tr>`}).join(''):'<tr><td colspan="7" class="empty-row">No hay deudas registradas.</td></tr>';
}
function renderPayments(){
  const arr=[...state.payments].sort((a,b)=>String(b.date).localeCompare(String(a.date))||Number(b.createdAt||0)-Number(a.createdAt||0));
  el('paymentsTable').innerHTML=arr.length?arr.map(p=>`<tr><td>${fmtDate(p.date)}</td><td>${esc(clientById(p.clientId)?.name||'-')}</td><td><strong>${money(p.amount)}</strong></td><td>${esc(p.method)}</td><td>${esc(p.ref||'-')}</td></tr>`).join(''):'<tr><td colspan="5" class="empty-row">No hay pagos registrados.</td></tr>';
}
function renderReports(){
  el('repDeuda').textContent=money(totalDebt());el('repPagado').textContent=money(totalPaid());el('repSaldo').textContent=money(balance());
  const rows=state.clients.map(c=>({name:c.name,debt:totalDebt(c.id),paid:totalPaid(c.id),bal:balance(c.id)})).sort((a,b)=>b.bal-a.bal);
  el('reportClientBalances').innerHTML=rows.length?`<div class="table-wrap embedded"><table><thead><tr><th>Cliente</th><th>Deuda</th><th>Pagado</th><th>Saldo</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${money(r.debt)}</td><td>${money(r.paid)}</td><td><strong>${money(r.bal)}</strong></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Sin datos para reportar.</div>';
}
function populateClientSelects(){
  const ordered=[...state.clients].sort((a,b)=>a.name.localeCompare(b.name));
  const opts='<option value="">Seleccionar...</option>'+ordered.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
  el('dClient').innerHTML=opts;el('pClient').innerHTML=opts;
}
function renderClientDetail(){
  const c=clientById(currentClientId);if(!c)return;
  el('detailName').textContent=c.name;el('detailMeta').textContent=[c.doc,c.phone,c.address].filter(Boolean).join(' · ');
  el('detailDebt').textContent=money(totalDebt(c.id));el('detailPaid').textContent=money(totalPaid(c.id));el('detailBalance').textContent=money(balance(c.id));
  const mov=[...state.debts.filter(d=>d.clientId===c.id).map(d=>({date:d.date,createdAt:d.createdAt||0,type:'Deuda',detail:d.concept,cargo:Number(d.amount),abono:0})),...state.payments.filter(p=>p.clientId===c.id).map(p=>({date:p.date,createdAt:p.createdAt||0,type:'Pago',detail:p.method+(p.ref?' · '+p.ref:''),cargo:0,abono:Number(p.amount)}))].sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.createdAt-b.createdAt);
  let running=0;
  el('detailLedger').innerHTML=mov.length?mov.map(m=>{running+=m.cargo-m.abono;return `<tr><td>${fmtDate(m.date)}</td><td>${m.type}</td><td>${esc(m.detail)}</td><td>${m.cargo?money(m.cargo):'-'}</td><td>${m.abono?money(m.abono):'-'}</td><td><strong>${money(Math.max(0,running))}</strong></td></tr>`}).join(''):'<tr><td colspan="6" class="empty-row">Este cliente todavía no tiene movimientos.</td></tr>';
}
function showClient(cid){currentClientId=cid;goView('clientDetail')}
function openClientModal(){el('clientForm').reset();el('clientModal').showModal()}
function openDebtModal(cid=null){if(!state.clients.length)return alert('Primero registrá al menos un cliente.');populateClientSelects();el('debtForm').reset();el('dDate').value=today();if(cid)el('dClient').value=cid;el('debtModal').showModal()}
function openPaymentModal(cid=null){if(!state.clients.length)return alert('Primero registrá al menos un cliente.');populateClientSelects();el('paymentForm').reset();el('pDate').value=today();if(cid)el('pClient').value=cid;el('paymentModal').showModal()}
function bindForms(){
  el('saveClientBtn').addEventListener('click',e=>{e.preventDefault();const name=el('cName').value.trim();if(!name)return alert('Ingresá el nombre del cliente.');state.clients.push({id:id(),name,doc:el('cDoc').value.trim(),phone:el('cPhone').value.trim(),address:el('cAddress').value.trim(),notes:el('cNotes').value.trim(),createdAt:Date.now()});save();el('clientModal').close()});
  el('saveDebtBtn').addEventListener('click',e=>{e.preventDefault();const cid=el('dClient').value;const amount=Number(el('dAmount').value);if(!cid||!el('dConcept').value.trim()||amount<=0)return alert('Completá cliente, concepto y un monto válido.');state.debts.push({id:id(),clientId:cid,concept:el('dConcept').value.trim(),amount,date:el('dDate').value||today(),due:el('dDue').value||'',createdAt:Date.now()});save();el('debtModal').close()});
  el('savePaymentBtn').addEventListener('click',e=>{e.preventDefault();const cid=el('pClient').value;const amount=Number(el('pAmount').value);if(!cid||amount<=0)return alert('Completá cliente y un monto válido.');const saldo=balance(cid);if(saldo<=0)return alert('Este cliente no tiene saldo pendiente.');if(amount>saldo)return alert(`El pago no puede superar el saldo pendiente de ${money(saldo)}. Si necesitás registrar anticipos, podemos agregar esa función por separado.`);state.payments.push({id:id(),clientId:cid,amount,date:el('pDate').value||today(),method:el('pMethod').value,ref:el('pRef').value.trim(),createdAt:Date.now()});save();el('paymentModal').close()});
}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='cecilia-comercial-respaldo-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function exportExcel(){
  if(typeof XLSX==='undefined'){alert('No se pudo cargar el módulo de Excel. Verificá tu conexión a internet e intentá nuevamente.');return}
  const clientes=state.clients.map(c=>({Cliente:c.name,'Cédula/RUC':c.doc||'',Teléfono:c.phone||'',Dirección:c.address||'',Observaciones:c.notes||'','Deuda total':totalDebt(c.id),'Total pagado':totalPaid(c.id),'Saldo pendiente':balance(c.id)}));
  const deudas=state.debts.map(d=>({Cliente:clientById(d.clientId)?.name||'',Concepto:d.concept,Fecha:fmtDate(d.date),Vencimiento:d.due?fmtDate(d.due):'',Monto:Number(d.amount),'Saldo pendiente':debtRemaining(d),Estado:debtRemaining(d)<=0?'Pagada':(d.due&&d.due<today()?'Vencida':'Pendiente')}));
  const pagos=state.payments.map(p=>({Fecha:fmtDate(p.date),Cliente:clientById(p.clientId)?.name||'',Monto:Number(p.amount),'Medio de pago':p.method,Referencia:p.ref||''}));
  const resumen=[{Indicador:'Deuda total registrada',Monto:totalDebt()},{Indicador:'Total cobrado',Monto:totalPaid()},{Indicador:'Saldo pendiente',Monto:balance()},{Indicador:'Cantidad de clientes',Monto:state.clients.length}];
  const wb=XLSX.utils.book_new();const addSheet=(rows,name,widths)=>{const ws=XLSX.utils.json_to_sheet(rows.length?rows:[{'Sin datos':''}]);ws['!cols']=widths.map(w=>({wch:w}));XLSX.utils.book_append_sheet(wb,ws,name)};
  addSheet(resumen,'Resumen',[28,18]);addSheet(clientes,'Clientes',[28,18,18,30,35,18,18,18]);addSheet(deudas,'Deudas',[28,30,14,14,16,18,14]);addSheet(pagos,'Pagos',[14,28,16,18,24]);XLSX.writeFile(wb,'Cecilia_Comercial_'+today()+'.xlsx');
}
function resetData(){
  if(!state.clients.length&&!state.debts.length&&!state.payments.length)return alert('No hay datos para borrar.');
  if(!confirm('ATENCIÓN: vas a eliminar TODOS los clientes, deudas y pagos de este dispositivo.\n\nRecomendamos exportar un respaldo antes de continuar.\n\n¿Querés continuar?'))return;
  if(prompt('Confirmación de seguridad:\nEscribí BORRAR en mayúsculas para continuar.')!=='BORRAR')return alert('Eliminación cancelada. No se borró ningún dato.');
  if(!confirm('Última confirmación: esta acción no se puede deshacer desde Cecilia Comercial. ¿Borrar definitivamente?'))return;
  state={clients:[],debts:[],payments:[]};currentClientId=null;save();goView('dashboard');alert('Todos los datos locales fueron eliminados.');
}
function fmtDate(s){if(!s)return'-';const [y,m,d]=String(s).split('-');return y&&m&&d?`${d}/${m}/${y}`:s}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function renderAll(){renderDashboard();renderClients();renderDebts();renderPayments();renderReports();populateClientSelects();if(el('clientDetail').classList.contains('active'))renderClientDetail()}

el('clientSearch').addEventListener('input',renderClients);
el('importFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!Array.isArray(data.clients)||!Array.isArray(data.debts)||!Array.isArray(data.payments))throw new Error();if(!confirm(`Se reemplazarán los datos actuales por el respaldo seleccionado.\n\nClientes: ${data.clients.length}\nDeudas: ${data.debts.length}\nPagos: ${data.payments.length}\n\n¿Continuar?`))return;state=data;currentClientId=null;save();goView('dashboard');alert('Respaldo importado correctamente.')}catch{alert('El archivo no es un respaldo válido de Cecilia Comercial.')}finally{e.target.value=''}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;el('installBtn').classList.remove('hidden')});
el('installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;el('installBtn').classList.add('hidden')});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
navSetup();bindForms();renderAll();
