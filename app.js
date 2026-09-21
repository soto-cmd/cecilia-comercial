const KEY='cecilia_comercial_v1';
let state=loadState();
let currentClientId=null;
let deferredPrompt=null;
function loadState(){const raw=localStorage.getItem(KEY);if(raw)return JSON.parse(raw);return {clients:[],debts:[],payments:[]}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));renderAll()}
function id(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function money(v){return 'Gs. '+Math.round(Number(v)||0).toLocaleString('es-PY')}
function today(){return new Date().toISOString().slice(0,10)}
function clientById(cid){return state.clients.find(c=>c.id===cid)}
function totalDebt(cid){return state.debts.filter(d=>!cid||d.clientId===cid).reduce((s,d)=>s+Number(d.amount),0)}
function totalPaid(cid){return state.payments.filter(p=>!cid||p.clientId===cid).reduce((s,p)=>s+Number(p.amount),0)}
function balance(cid){return Math.max(0,totalDebt(cid)-totalPaid(cid))}
function debtRemaining(debt){const clientDebts=state.debts.filter(d=>d.clientId===debt.clientId).sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt-b.createdAt);let availablePaid=totalPaid(debt.clientId);for(const d of clientDebts){const used=Math.min(Number(d.amount),availablePaid);const rem=Number(d.amount)-used;availablePaid-=used;if(d.id===debt.id)return rem}return Number(debt.amount)}
function navSetup(){document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>goView(b.dataset.view)))}
function goView(v){document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.view===v));document.getElementById(v).classList.add('active');renderAll()}
function renderDashboard(){const saldo=balance();const now=new Date(),ym=now.toISOString().slice(0,7);const paidMonth=state.payments.filter(p=>p.date.startsWith(ym)).reduce((s,p)=>s+Number(p.amount),0);const overdue=state.debts.filter(d=>d.due&&d.due<today()).reduce((s,d)=>s+debtRemaining(d),0);const clientsWith=state.clients.filter(c=>balance(c.id)>0).length;kpiSaldo.textContent=money(saldo);kpiMes.textContent=money(paidMonth);kpiVencida.textContent=money(overdue);kpiClientes.textContent=clientsWith;const top=[...state.clients].map(c=>({c,b:balance(c.id)})).filter(x=>x.b>0).sort((a,b)=>b.b-a.b).slice(0,5);topClientes.innerHTML=top.length?top.map(x=>`<div class="list-row"><span>${esc(x.c.name)}</span><strong>${money(x.b)}</strong></div>`).join(''):'<div class="empty">Sin saldos pendientes.</div>';const last=[...state.payments].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt).slice(0,5);ultimosPagos.innerHTML=last.length?last.map(p=>`<div class="list-row"><span>${esc(clientById(p.clientId)?.name||'Cliente')}</span><strong>${money(p.amount)}</strong></div>`).join(''):'<div class="empty">Aún no hay pagos registrados.</div>'}
function renderClients(){const q=(clientSearch.value||'').toLowerCase();const arr=state.clients.filter(c=>[c.name,c.doc,c.phone].join(' ').toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name));clientsTable.innerHTML=arr.length?arr.map(c=>`<tr><td><button class="client-link" onclick="showClient('${c.id}')">${esc(c.name)}</button></td><td>${esc(c.doc||'-')}</td><td>${esc(c.phone||'-')}</td><td><strong>${money(balance(c.id))}</strong></td><td><button class="secondary" onclick="showClient('${c.id}')">Ver cuenta</button></td></tr>`).join(''):'<tr><td colspan="5" class="empty">No hay clientes.</td></tr>'}
function renderDebts(){const arr=[...state.debts].sort((a,b)=>b.date.localeCompare(a.date));debtsTable.innerHTML=arr.length?arr.map(d=>{const rem=debtRemaining(d),overdue=d.due&&d.due<today()&&rem>0;const cls=rem<=0?'ok':overdue?'bad':'warn';const label=rem<=0?'Pagada':overdue?'Vencida':'Pendiente';return `<tr><td>${esc(clientById(d.clientId)?.name||'-')}</td><td>${esc(d.concept)}</td><td>${fmtDate(d.date)}</td><td>${d.due?fmtDate(d.due):'-'}</td><td>${money(d.amount)}</td><td>${money(rem)}</td><td><span class="status ${cls}">${label}</span></td></tr>`}).join(''):'<tr><td colspan="7" class="empty">No hay deudas registradas.</td></tr>'}
function renderPayments(){const arr=[...state.payments].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);paymentsTable.innerHTML=arr.length?arr.map(p=>`<tr><td>${fmtDate(p.date)}</td><td>${esc(clientById(p.clientId)?.name||'-')}</td><td><strong>${money(p.amount)}</strong></td><td>${esc(p.method)}</td><td>${esc(p.ref||'-')}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">No hay pagos registrados.</td></tr>'}
function renderReports(){repDeuda.textContent=money(totalDebt());repPagado.textContent=money(totalPaid());repSaldo.textContent=money(balance());const rows=state.clients.map(c=>({name:c.name,debt:totalDebt(c.id),paid:totalPaid(c.id),bal:balance(c.id)})).sort((a,b)=>b.bal-a.bal);reportClientBalances.innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Deuda</th><th>Pagado</th><th>Saldo</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${money(r.debt)}</td><td>${money(r.paid)}</td><td><strong>${money(r.bal)}</strong></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Sin datos.</div>'}
function populateClientSelects(){const opts='<option value="">Seleccionar...</option>'+state.clients.sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');dClient.innerHTML=opts;pClient.innerHTML=opts}
function showClient(cid){currentClientId=cid;const c=clientById(cid);if(!c)return;detailName.textContent=c.name;detailMeta.textContent=[c.doc,c.phone,c.address].filter(Boolean).join(' · ');detailDebt.textContent=money(totalDebt(cid));detailPaid.textContent=money(totalPaid(cid));detailBalance.textContent=money(balance(cid));const mov=[...state.debts.filter(d=>d.clientId===cid).map(d=>({date:d.date,createdAt:d.createdAt,type:'Deuda',detail:d.concept,cargo:Number(d.amount),abono:0})),...state.payments.filter(p=>p.clientId===cid).map(p=>({date:p.date,createdAt:p.createdAt,type:'Pago',detail:p.method+(p.ref?' · '+p.ref:''),cargo:0,abono:Number(p.amount)}))].sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt-b.createdAt);let running=0;detailLedger.innerHTML=mov.length?mov.map(m=>{running+=m.cargo-m.abono;return `<tr><td>${fmtDate(m.date)}</td><td>${m.type}</td><td>${esc(m.detail)}</td><td>${m.cargo?money(m.cargo):'-'}</td><td>${m.abono?money(m.abono):'-'}</td><td><strong>${money(Math.max(0,running))}</strong></td></tr>`}).join(''):'<tr><td colspan="6" class="empty">Sin movimientos.</td></tr>';goView('clientDetail')}
function openClientModal(){clientForm.reset();clientModal.showModal()}
function openDebtModal(cid=null){populateClientSelects();debtForm.reset();dDate.value=today();if(cid)dClient.value=cid;debtModal.showModal()}
function openPaymentModal(cid=null){populateClientSelects();paymentForm.reset();pDate.value=today();if(cid)pClient.value=cid;paymentModal.showModal()}
function bindForms(){saveClientBtn.addEventListener('click',e=>{e.preventDefault();if(!cName.value.trim())return alert('Ingresá el nombre del cliente.');state.clients.push({id:id(),name:cName.value.trim(),doc:cDoc.value.trim(),phone:cPhone.value.trim(),address:cAddress.value.trim(),notes:cNotes.value.trim(),createdAt:Date.now()});save();clientModal.close()});saveDebtBtn.addEventListener('click',e=>{e.preventDefault();if(!dClient.value||!dConcept.value.trim()||Number(dAmount.value)<=0)return alert('Completá cliente, concepto y monto.');state.debts.push({id:id(),clientId:dClient.value,concept:dConcept.value.trim(),amount:Number(dAmount.value),date:dDate.value||today(),due:dDue.value||'',createdAt:Date.now()});save();debtModal.close();if(currentClientId===dClient.value)showClient(currentClientId)});savePaymentBtn.addEventListener('click',e=>{e.preventDefault();if(!pClient.value||Number(pAmount.value)<=0)return alert('Completá cliente y monto.');const saldo=balance(pClient.value);if(Number(pAmount.value)>saldo&&saldo>0&&!confirm('El pago supera el saldo pendiente. ¿Registrar igualmente?'))return;state.payments.push({id:id(),clientId:pClient.value,amount:Number(pAmount.value),date:pDate.value||today(),method:pMethod.value,ref:pRef.value.trim(),createdAt:Date.now()});save();paymentModal.close();if(currentClientId===pClient.value)showClient(currentClientId)})}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='cecilia-comercial-respaldo-'+today()+'.json';a.click();URL.revokeObjectURL(a.href)}
function exportExcel(){
  if(typeof XLSX==='undefined'){alert('No se pudo cargar el módulo de Excel. Verificá tu conexión a internet e intentá nuevamente.');return}
  const clientes=state.clients.map(c=>({Cliente:c.name,'Cédula/RUC':c.doc||'',Teléfono:c.phone||'',Dirección:c.address||'',Observaciones:c.notes||'','Deuda total':totalDebt(c.id),'Total pagado':totalPaid(c.id),'Saldo pendiente':balance(c.id)}));
  const deudas=state.debts.map(d=>({Cliente:clientById(d.clientId)?.name||'',Concepto:d.concept,Fecha:fmtDate(d.date),Vencimiento:d.due?fmtDate(d.due):'',Monto:Number(d.amount),'Saldo pendiente':debtRemaining(d),Estado:debtRemaining(d)<=0?'Pagada':(d.due&&d.due<today()?'Vencida':'Pendiente')}));
  const pagos=state.payments.map(p=>({Fecha:fmtDate(p.date),Cliente:clientById(p.clientId)?.name||'',Monto:Number(p.amount),'Medio de pago':p.method,Referencia:p.ref||''}));
  const resumen=[{'Indicador':'Deuda total registrada','Monto':totalDebt()},{'Indicador':'Total cobrado','Monto':totalPaid()},{'Indicador':'Saldo pendiente','Monto':balance()},{'Indicador':'Cantidad de clientes','Monto':state.clients.length}];
  const wb=XLSX.utils.book_new();
  const addSheet=(rows,name,widths)=>{const ws=XLSX.utils.json_to_sheet(rows.length?rows:[{'Sin datos':''}]);ws['!cols']=widths.map(w=>({wch:w}));XLSX.utils.book_append_sheet(wb,ws,name)};
  addSheet(resumen,'Resumen',[28,18]);
  addSheet(clientes,'Clientes',[28,18,18,30,35,18,18,18]);
  addSheet(deudas,'Deudas',[28,30,14,14,16,18,14]);
  addSheet(pagos,'Pagos',[14,28,16,18,24]);
  XLSX.writeFile(wb,'Cecilia_Comercial_'+today()+'.xlsx');
}
function resetData(){
  if(!state.clients.length&&!state.debts.length&&!state.payments.length){alert('No hay datos para borrar.');return}
  const first=confirm('ATENCIÓN: vas a eliminar TODOS los clientes, deudas y pagos de este dispositivo.\n\nAntes de continuar, recomendamos exportar un respaldo.\n\n¿Querés continuar?');
  if(!first)return;
  const typed=prompt('Confirmación final:\nEscribí BORRAR en mayúsculas para eliminar todos los datos.');
  if(typed!=='BORRAR'){alert('Eliminación cancelada. No se borró ningún dato.');return}
  const finalConfirm=confirm('Última confirmación: esta acción no se puede deshacer desde Cecilia Comercial. ¿Borrar definitivamente?');
  if(!finalConfirm)return;
  state={clients:[],debts:[],payments:[]};
  save();
  goView('dashboard');
  alert('Todos los datos locales fueron eliminados.');
}
function fmtDate(s){if(!s)return'-';const [y,m,d]=s.split('-');return `${d}/${m}/${y}`}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function renderAll(){renderDashboard();renderClients();renderDebts();renderPayments();renderReports();populateClientSelects();if(currentClientId&&document.getElementById('clientDetail').classList.contains('active'))showClient(currentClientId)}
clientSearch.addEventListener('input',renderClients);
importFile.addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!data.clients||!data.debts||!data.payments)throw new Error();state=data;save();alert('Respaldo importado correctamente.')}catch{alert('El archivo no es un respaldo válido de Cecilia Comercial.')}e.target.value=''});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;installBtn.classList.remove('hidden')});
installBtn.addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installBtn.classList.add('hidden')});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
navSetup();bindForms();renderAll();
