const KEY='cecilia_comercial_v1';
const SUPABASE_URL='https://oxirewjzmnfnbwiugoac.supabase.co';
const SUPABASE_KEY='sb_publishable_gkc-Cjh2ykNYvlf5JRf3NQ_UU2s73jC';
const sb=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY);
let state=loadState();
let currentClientId=null;
let deferredPrompt=null;
let currentUser=null;
let syncTimer=null;
let syncing=false;
const el=id=>document.getElementById(id);

function emptyState(){return {clients:[],debts:[],payments:[]}}
function loadState(){
  try{
    const raw=localStorage.getItem(KEY);
    if(!raw)return emptyState();
    const data=JSON.parse(raw);
    if(!Array.isArray(data.clients)||!Array.isArray(data.debts)||!Array.isArray(data.payments))throw new Error('Formato inválido');
    return data;
  }catch{
    return emptyState();
  }
}
function persistLocal(){localStorage.setItem(KEY,JSON.stringify(state))}
function save(options={}){persistLocal();renderAll();if(currentUser){if(options.replaceCloud)replaceCloudWithState();else scheduleCloudSync()}}
function id(){
  if(crypto.randomUUID)return crypto.randomUUID();
  const a=crypto.getRandomValues(new Uint8Array(16));a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;
  return [...a].map((b,i)=>([4,6,8,10].includes(i)?'-':'')+b.toString(16).padStart(2,'0')).join('');
}
function money(v){return 'Gs. '+Math.round(Number(v)||0).toLocaleString('es-PY')}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function clientById(cid){return state.clients.find(c=>c.id===cid)}
function totalDebt(cid){return state.debts.filter(d=>!cid||d.clientId===cid).reduce((s,d)=>s+Number(d.amount||0),0)}
function totalPaid(cid){return state.payments.filter(p=>!cid||p.clientId===cid).reduce((s,p)=>s+Number(p.amount||0),0)}
function rawBalance(cid){return totalDebt(cid)-totalPaid(cid)}
function balance(cid){return Math.max(0,rawBalance(cid))}
function debtRemaining(debt){
  const clientDebts=state.debts.filter(d=>d.clientId===debt.clientId).sort((a,b)=>String(a.date).localeCompare(String(b.date))||(a.createdAt||0)-(b.createdAt||0));
  let availablePaid=totalPaid(debt.clientId);
  for(const d of clientDebts){const used=Math.min(Number(d.amount),Math.max(0,availablePaid));const rem=Number(d.amount)-used;availablePaid-=used;if(d.id===debt.id)return Math.max(0,rem)}
  return Number(debt.amount||0);
}
function navSetup(){document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>goView(b.dataset.view)))}
function goView(v){document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.view===v));const target=el(v);if(!target)return;target.classList.add('active');renderAll()}

function renderDashboard(){
  const ym=today().slice(0,7);
  const paidMonth=state.payments.filter(p=>String(p.date||'').startsWith(ym)).reduce((s,p)=>s+Number(p.amount||0),0);
  const overdue=state.debts.filter(d=>d.due&&d.due<today()).reduce((s,d)=>s+debtRemaining(d),0);
  el('kpiSaldo').textContent=money(balance());el('kpiMes').textContent=money(paidMonth);el('kpiVencida').textContent=money(overdue);el('kpiClientes').textContent=state.clients.filter(c=>balance(c.id)>0).length;
  const top=[...state.clients].map(c=>({c,b:balance(c.id)})).filter(x=>x.b>0).sort((a,b)=>b.b-a.b).slice(0,5);
  el('topClientes').innerHTML=top.length?top.map(x=>`<div class="list-row"><span>${esc(x.c.name)}</span><strong>${money(x.b)}</strong></div>`).join(''):'<div class="empty">Sin saldos pendientes.</div>';
  const last=[...state.payments].sort((a,b)=>String(b.date).localeCompare(String(a.date))||Number(b.createdAt||0)-Number(a.createdAt||0)).slice(0,5);
  el('ultimosPagos').innerHTML=last.length?last.map(p=>`<div class="list-row"><span>${esc(clientById(p.clientId)?.name||'Cliente')}</span><strong>${money(p.amount)}</strong></div>`).join(''):'<div class="empty">Aún no hay pagos registrados.</div>';
}
function renderClients(){const q=(el('clientSearch').value||'').toLowerCase();const arr=state.clients.filter(c=>[c.name,c.doc,c.phone].join(' ').toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name));el('clientsTable').innerHTML=arr.length?arr.map(c=>`<tr><td><button class="client-link" onclick="showClient('${c.id}')">${esc(c.name)}</button></td><td>${esc(c.doc||'-')}</td><td>${esc(c.phone||'-')}</td><td><strong>${money(balance(c.id))}</strong></td><td><button class="btn btn-secondary" onclick="showClient('${c.id}')">Ver cuenta</button></td></tr>`).join(''):'<tr><td colspan="5" class="empty-row">No hay clientes registrados.</td></tr>'}
function renderDebts(){const arr=[...state.debts].sort((a,b)=>String(b.date).localeCompare(String(a.date)));el('debtsTable').innerHTML=arr.length?arr.map(d=>{const rem=debtRemaining(d),overdue=d.due&&d.due<today()&&rem>0;const cls=rem<=0?'ok':overdue?'bad':'warn';const label=rem<=0?'Pagada':overdue?'Vencida':'Pendiente';return `<tr><td>${esc(clientById(d.clientId)?.name||'-')}</td><td>${esc(d.concept)}</td><td>${fmtDate(d.date)}</td><td>${d.due?fmtDate(d.due):'-'}</td><td>${money(d.amount)}</td><td><strong>${money(rem)}</strong></td><td><span class="status ${cls}">${label}</span></td></tr>`}).join(''):'<tr><td colspan="7" class="empty-row">No hay deudas registradas.</td></tr>'}
function renderPayments(){const arr=[...state.payments].sort((a,b)=>String(b.date).localeCompare(String(a.date))||Number(b.createdAt||0)-Number(a.createdAt||0));el('paymentsTable').innerHTML=arr.length?arr.map(p=>`<tr><td>${fmtDate(p.date)}</td><td>${esc(clientById(p.clientId)?.name||'-')}</td><td><strong>${money(p.amount)}</strong></td><td>${esc(p.method)}</td><td>${esc(p.ref||'-')}</td></tr>`).join(''):'<tr><td colspan="5" class="empty-row">No hay pagos registrados.</td></tr>'}
function renderReports(){el('repDeuda').textContent=money(totalDebt());el('repPagado').textContent=money(totalPaid());el('repSaldo').textContent=money(balance());const rows=state.clients.map(c=>({name:c.name,debt:totalDebt(c.id),paid:totalPaid(c.id),bal:balance(c.id)})).sort((a,b)=>b.bal-a.bal);el('reportClientBalances').innerHTML=rows.length?`<div class="table-wrap embedded"><table><thead><tr><th>Cliente</th><th>Deuda</th><th>Pagado</th><th>Saldo</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${money(r.debt)}</td><td>${money(r.paid)}</td><td><strong>${money(r.bal)}</strong></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Sin datos para reportar.</div>'}
function populateClientSelects(){const ordered=[...state.clients].sort((a,b)=>a.name.localeCompare(b.name));const opts='<option value="">Seleccionar...</option>'+ordered.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');el('dClient').innerHTML=opts;el('pClient').innerHTML=opts}
function renderClientDetail(){const c=clientById(currentClientId);if(!c)return;el('detailName').textContent=c.name;el('detailMeta').textContent=[c.doc,c.phone,c.address].filter(Boolean).join(' · ');el('detailDebt').textContent=money(totalDebt(c.id));el('detailPaid').textContent=money(totalPaid(c.id));el('detailBalance').textContent=money(balance(c.id));const mov=[...state.debts.filter(d=>d.clientId===c.id).map(d=>({date:d.date,createdAt:d.createdAt||0,type:'Deuda',detail:d.concept,cargo:Number(d.amount),abono:0})),...state.payments.filter(p=>p.clientId===c.id).map(p=>({date:p.date,createdAt:p.createdAt||0,type:'Pago',detail:p.method+(p.ref?' · '+p.ref:''),cargo:0,abono:Number(p.amount)}))].sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.createdAt-b.createdAt);let running=0;el('detailLedger').innerHTML=mov.length?mov.map(m=>{running+=m.cargo-m.abono;return `<tr><td>${fmtDate(m.date)}</td><td>${m.type}</td><td>${esc(m.detail)}</td><td>${m.cargo?money(m.cargo):'-'}</td><td>${m.abono?money(m.abono):'-'}</td><td><strong>${money(Math.max(0,running))}</strong></td></tr>`}).join(''):'<tr><td colspan="6" class="empty-row">Este cliente todavía no tiene movimientos.</td></tr>'}
function showClient(cid){currentClientId=cid;goView('clientDetail')}
function openClientModal(){el('clientForm').reset();el('clientModal').showModal()}
function openDebtModal(cid=null){if(!state.clients.length)return alert('Primero registrá al menos un cliente.');populateClientSelects();el('debtForm').reset();el('dDate').value=today();if(cid)el('dClient').value=cid;el('debtModal').showModal()}
function openPaymentModal(cid=null){if(!state.clients.length)return alert('Primero registrá al menos un cliente.');populateClientSelects();el('paymentForm').reset();el('pDate').value=today();if(cid)el('pClient').value=cid;el('paymentModal').showModal()}
function bindForms(){
  el('saveClientBtn').addEventListener('click',e=>{e.preventDefault();const name=el('cName').value.trim();if(!name)return alert('Ingresá el nombre del cliente.');state.clients.push({id:id(),name,doc:el('cDoc').value.trim(),phone:el('cPhone').value.trim(),address:el('cAddress').value.trim(),notes:el('cNotes').value.trim(),createdAt:Date.now()});save();el('clientModal').close()});
  el('saveDebtBtn').addEventListener('click',e=>{e.preventDefault();const cid=el('dClient').value;const amount=Number(el('dAmount').value);if(!cid||!el('dConcept').value.trim()||amount<=0)return alert('Completá cliente, concepto y un monto válido.');state.debts.push({id:id(),clientId:cid,concept:el('dConcept').value.trim(),amount,date:el('dDate').value||today(),due:el('dDue').value||'',createdAt:Date.now()});save();el('debtModal').close()});
  el('savePaymentBtn').addEventListener('click',e=>{e.preventDefault();const cid=el('pClient').value;const amount=Number(el('pAmount').value);if(!cid||amount<=0)return alert('Completá cliente y un monto válido.');const saldo=balance(cid);if(saldo<=0)return alert('Este cliente no tiene saldo pendiente.');if(amount>saldo)return alert(`El pago no puede superar el saldo pendiente de ${money(saldo)}.`);state.payments.push({id:id(),clientId:cid,amount,date:el('pDate').value||today(),method:el('pMethod').value,ref:el('pRef').value.trim(),createdAt:Date.now()});save();el('paymentModal').close()});
}

function cloudRows(){
  const uid=currentUser.id;
  return {
    clients:state.clients.map(c=>({id:c.id,user_id:uid,name:c.name,doc:c.doc||null,phone:c.phone||null,address:c.address||null,notes:c.notes||null,created_at:new Date(c.createdAt||Date.now()).toISOString(),updated_at:new Date().toISOString()})),
    debts:state.debts.map(d=>({id:d.id,user_id:uid,client_id:d.clientId,concept:d.concept,amount:Number(d.amount),debt_date:d.date,due_date:d.due||null,created_at:new Date(d.createdAt||Date.now()).toISOString(),updated_at:new Date().toISOString()})),
    payments:state.payments.map(p=>({id:p.id,user_id:uid,client_id:p.clientId,amount:Number(p.amount),payment_date:p.date,method:p.method,reference:p.ref||null,created_at:new Date(p.createdAt||Date.now()).toISOString(),updated_at:new Date().toISOString()}))
  };
}
function setCloudStatus(status,message){
  const badge=el('dataBadge'),side=el('sidebarStorage'),text=el('cloudStatusText');
  if(badge)badge.textContent=status;if(side)side.textContent=message;if(text)text.textContent=message;
}
function updateAuthUi(){
  const signed=!!currentUser;
  el('cloudBtn').textContent=signed?'Nube conectada':'Conectar nube';
  el('configCloudBtn').classList.toggle('hidden',signed);el('restoreCloudBtn').classList.toggle('hidden',!signed);el('signOutBtn').classList.toggle('hidden',!signed);
  if(signed)setCloudStatus('Nube conectada',`Respaldo activo para ${currentUser.email||'tu cuenta'}. Los cambios se guardan localmente y también en la nube.`);
  else setCloudStatus('Solo copia local','Los datos están en este dispositivo. Conectá tu cuenta para activar respaldo y sincronización en la nube.');
}
function openAuthModal(){if(currentUser){goView('config');return}el('authForm').reset();el('authModal').showModal()}
async function signInCloud(){
  const email=el('authEmail').value.trim(),password=el('authPassword').value;
  if(!email||password.length<6)return alert('Ingresá un correo válido y una contraseña de al menos 6 caracteres.');
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error)return alert('No se pudo iniciar sesión: '+error.message);
  el('authModal').close();currentUser=data.user;await reconcileWithCloud();updateAuthUi();alert('Respaldo en la nube activado.');
}
async function signUpCloud(){
  const email=el('authEmail').value.trim(),password=el('authPassword').value;
  if(!email||password.length<6)return alert('Ingresá un correo válido y una contraseña de al menos 6 caracteres.');
  const {data,error}=await sb.auth.signUp({email,password});
  if(error)return alert('No se pudo crear la cuenta: '+error.message);
  if(data.session){currentUser=data.user;el('authModal').close();await reconcileWithCloud();updateAuthUi();alert('Cuenta creada y respaldo activado.');}
  else alert('Cuenta creada. Revisá tu correo para confirmar la dirección y luego iniciá sesión en Cecilia Comercial.');
}
async function signOutCloud(){if(!confirm('¿Cerrar la sesión de respaldo en este dispositivo? La copia local permanecerá disponible.'))return;await sb.auth.signOut();currentUser=null;updateAuthUi()}

async function fetchCloudState(){
  const [c,d,p]=await Promise.all([
    sb.from('cecilia_clients').select('*'),
    sb.from('cecilia_debts').select('*'),
    sb.from('cecilia_payments').select('*')
  ]);
  if(c.error)throw c.error;if(d.error)throw d.error;if(p.error)throw p.error;
  return {
    clients:(c.data||[]).map(x=>({id:x.id,name:x.name,doc:x.doc||'',phone:x.phone||'',address:x.address||'',notes:x.notes||'',createdAt:Date.parse(x.created_at)||Date.now()})),
    debts:(d.data||[]).map(x=>({id:x.id,clientId:x.client_id,concept:x.concept,amount:Number(x.amount),date:x.debt_date,due:x.due_date||'',createdAt:Date.parse(x.created_at)||Date.now()})),
    payments:(p.data||[]).map(x=>({id:x.id,clientId:x.client_id,amount:Number(x.amount),date:x.payment_date,method:x.method,ref:x.reference||'',createdAt:Date.parse(x.created_at)||Date.now()}))
  };
}
function mergeById(local,cloud){const map=new Map(local.map(x=>[x.id,x]));for(const x of cloud)map.set(x.id,x);return [...map.values()]}
async function reconcileWithCloud(){
  try{
    setCloudStatus('Sincronizando...','Comparando la copia local con la copia en la nube.');
    const cloud=await fetchCloudState();
    state={clients:mergeById(state.clients,cloud.clients),debts:mergeById(state.debts,cloud.debts),payments:mergeById(state.payments,cloud.payments)};
    persistLocal();renderAll();await syncToCloud(true);updateAuthUi();
  }catch(err){console.error(err);setCloudStatus('Error de sincronización','No se pudo completar la sincronización. La copia local sigue disponible.');alert('No se pudo sincronizar con la nube. Tus datos locales no se borraron.');}
}
function scheduleCloudSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncToCloud(true),1200)}
async function syncToCloud(makeBackup=false){
  if(!currentUser||syncing)return;
  syncing=true;setCloudStatus('Sincronizando...','Guardando cambios en la nube...');
  try{
    const r=cloudRows();
    if(r.clients.length){const {error}=await sb.from('cecilia_clients').upsert(r.clients);if(error)throw error}
    if(r.debts.length){const {error}=await sb.from('cecilia_debts').upsert(r.debts);if(error)throw error}
    if(r.payments.length){const {error}=await sb.from('cecilia_payments').upsert(r.payments);if(error)throw error}
    if(makeBackup)await createCloudBackup();
    updateAuthUi();
  }catch(err){console.error(err);setCloudStatus('Pendiente de sincronizar','La copia local está guardada, pero la última sincronización en la nube falló.');}
  finally{syncing=false}
}
async function createCloudBackup(){
  if(!currentUser)return;
  const {error}=await sb.from('cecilia_backups').insert({user_id:currentUser.id,snapshot:state});if(error)throw error;
  const {data}=await sb.from('cecilia_backups').select('id').order('created_at',{ascending:false}).range(30,200);
  if(data?.length)await sb.from('cecilia_backups').delete().in('id',data.map(x=>x.id));
}
async function replaceCloudWithState(){
  if(!currentUser)return;
  try{
    setCloudStatus('Sincronizando...','Actualizando la copia completa en la nube.');
    await createCloudBackup();
    let q=await sb.from('cecilia_payments').delete().eq('user_id',currentUser.id);if(q.error)throw q.error;
    q=await sb.from('cecilia_debts').delete().eq('user_id',currentUser.id);if(q.error)throw q.error;
    q=await sb.from('cecilia_clients').delete().eq('user_id',currentUser.id);if(q.error)throw q.error;
    await syncToCloud(true);
  }catch(err){console.error(err);alert('La copia local fue guardada, pero no se pudo reemplazar la copia en la nube.');}
}
async function restoreLatestCloudBackup(){
  if(!currentUser)return;
  const {data,error}=await sb.from('cecilia_backups').select('snapshot,created_at').order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(error)return alert('No se pudo consultar el respaldo: '+error.message);
  if(!data)return alert('Todavía no existe una copia de seguridad en la nube.');
  const snap=data.snapshot;if(!snap||!Array.isArray(snap.clients)||!Array.isArray(snap.debts)||!Array.isArray(snap.payments))return alert('La última copia no tiene un formato válido.');
  if(!confirm(`Se restaurará la copia creada el ${new Date(data.created_at).toLocaleString('es-PY')}. Esto reemplazará el estado actual. ¿Continuar?`))return;
  state=snap;persistLocal();renderAll();await replaceCloudWithState();alert('Copia restaurada correctamente.');
}
async function initCloud(){
  if(!sb){setCloudStatus('Solo copia local','No se pudo cargar el servicio de respaldo.');return}
  const {data}=await sb.auth.getSession();
  currentUser=data.session?.user||null;updateAuthUi();
  if(currentUser)await reconcileWithCloud();
  sb.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;updateAuthUi()});
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
async function resetData(){
  if(!state.clients.length&&!state.debts.length&&!state.payments.length)return alert('No hay datos para borrar.');
  const scope=currentUser?'del dispositivo y de la base principal en la nube':'de este dispositivo';
  if(!confirm(`ATENCIÓN: vas a eliminar TODOS los clientes, deudas y pagos ${scope}.\n\n${currentUser?'Antes de borrar se guardará una copia recuperable en la nube.':'Recomendamos exportar un respaldo antes de continuar.'}\n\n¿Querés continuar?`))return;
  if(prompt('Confirmación de seguridad:\nEscribí BORRAR en mayúsculas para continuar.')!=='BORRAR')return alert('Eliminación cancelada. No se borró ningún dato.');
  if(!confirm('Última confirmación: ¿borrar definitivamente los datos activos?'))return;
  if(currentUser){
    try{await createCloudBackup();let q=await sb.from('cecilia_payments').delete().eq('user_id',currentUser.id);if(q.error)throw q.error;q=await sb.from('cecilia_debts').delete().eq('user_id',currentUser.id);if(q.error)throw q.error;q=await sb.from('cecilia_clients').delete().eq('user_id',currentUser.id);if(q.error)throw q.error}catch(err){console.error(err);return alert('No se borró nada local porque no se pudo asegurar primero la copia y eliminación en la nube.')}
  }
  state=emptyState();currentClientId=null;persistLocal();renderAll();goView('dashboard');alert(currentUser?'Datos activos eliminados. La copia de seguridad previa permanece disponible en la nube.':'Todos los datos locales fueron eliminados.');
}
function fmtDate(s){if(!s)return'-';const [y,m,d]=String(s).split('-');return y&&m&&d?`${d}/${m}/${y}`:s}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function renderAll(){renderDashboard();renderClients();renderDebts();renderPayments();renderReports();populateClientSelects();if(el('clientDetail').classList.contains('active'))renderClientDetail()}

el('clientSearch').addEventListener('input',renderClients);
el('importFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!Array.isArray(data.clients)||!Array.isArray(data.debts)||!Array.isArray(data.payments))throw new Error();if(!confirm(`Se reemplazarán los datos actuales por el respaldo seleccionado.\n\nClientes: ${data.clients.length}\nDeudas: ${data.debts.length}\nPagos: ${data.payments.length}\n\n¿Continuar?`)){e.target.value='';return}state=data;persistLocal();renderAll();if(currentUser)await replaceCloudWithState();alert('Respaldo importado correctamente.')}catch{alert('El archivo no es un respaldo válido de Cecilia Comercial.')}e.target.value=''});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;el('installBtn').classList.remove('hidden')});
el('installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;el('installBtn').classList.add('hidden')});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
navSetup();bindForms();renderAll();initCloud();
