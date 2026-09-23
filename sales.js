(()=>{
  // Cecilia Comercial · módulo de ventas v1
  const originalEmptyState=emptyState;
  emptyState=function(){const s=originalEmptyState();s.sales=[];return s};
  if(!Array.isArray(state.sales))state.sales=[];

  const originalNormalizeState=normalizeState;
  normalizeState=function(data){
    const base=originalNormalizeState(data);
    const safe=data&&typeof data==='object'?data:{};
    const stamp=nowIso();
    base.sales=Array.isArray(safe.sales)?safe.sales.map(v=>({
      id:v.id||id(),clientId:v.clientId||'',concept:v.concept||'',amount:Number(v.amount)||0,
      date:v.date||today(),type:v.type==='Crédito'?'Crédito':'Contado',method:v.method||'Efectivo',
      ref:v.ref||'',due:v.due||'',debtId:v.debtId||'',createdAt:Number(v.createdAt)||Date.now(),
      updatedAt:v.updatedAt||stamp,deletedAt:v.deletedAt||''
    })):[];
    return base;
  };

  function injectSalesUi(){
    const nav=document.querySelector('.nav[data-view="deudas"]');
    if(nav&&!document.querySelector('.nav[data-view="ventas"]')){
      const b=document.createElement('button');
      b.className='nav';b.dataset.view='ventas';
      b.innerHTML='<span class="nav-icon">03</span><span>Ventas</span>';
      nav.parentNode.insertBefore(b,nav);
      const nums={dashboard:'01',clientes:'02',ventas:'03',deudas:'04',pagos:'05',reportes:'06',config:'07'};
      document.querySelectorAll('.nav[data-view]').forEach(x=>{const n=x.querySelector('.nav-icon');if(n&&nums[x.dataset.view])n.textContent=nums[x.dataset.view]});
    }

    const debts=document.getElementById('deudas');
    if(debts&&!document.getElementById('ventas')){
      const section=document.createElement('section');section.id='ventas';section.className='view';
      section.innerHTML=`
        <div class="page-head"><div><span class="eyebrow">Operaciones comerciales</span><h2>Ventas</h2><p>Registro de todas las ventas, sean al contado o a crédito.</p></div><button class="btn btn-primary" onclick="openSaleModal()">+ Registrar venta</button></div>
        <div class="panel" style="margin-bottom:18px;padding:16px 18px;border-left:4px solid #c9a227"><strong>Cómo registrar una venta</strong><p style="margin:6px 0 0">Elegí el cliente, describí la venta y marcá si fue al contado o a crédito. Las ventas al contado quedan registradas sin generar deuda; las ventas a crédito crean automáticamente el saldo pendiente.</p></div>
        <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Concepto</th><th>Tipo</th><th>Monto</th><th>Medio</th><th>Acciones</th></tr></thead><tbody id="salesTable"></tbody></table></div>`;
      debts.parentNode.insertBefore(section,debts);
    }

    if(!document.getElementById('saleModal')){
      const dlg=document.createElement('dialog');dlg.id='saleModal';
      dlg.innerHTML=`<form method="dialog" id="saleForm"><div class="modal-head"><span class="eyebrow">Ventas</span><h3>Registrar venta</h3></div>
        <label>Cliente<select required id="sClient"></select></label>
        <label>Concepto / detalle<input required id="sConcept" placeholder="Ej.: Mercadería, servicio, producto..." /></label>
        <label>Monto (Gs.)<input required type="number" min="1" step="1" id="sAmount" inputmode="numeric" /></label>
        <label>Fecha<input required type="date" id="sDate" /></label>
        <label>Tipo de venta<select id="sType"><option>Contado</option><option>Crédito</option></select></label>
        <label id="sMethodWrap">Medio de pago<select id="sMethod"><option>Efectivo</option><option>Transferencia</option><option>QR</option><option>Otro</option></select></label>
        <label id="sRefWrap">Referencia<input id="sRef" placeholder="Opcional" /></label>
        <label id="sDueWrap" style="display:none">Vencimiento<input type="date" id="sDue" /></label>
        <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="this.closest('dialog').close()">Cancelar</button><button type="button" class="btn btn-primary" id="saveSaleBtn">Guardar venta</button></div></form>`;
      document.body.insertBefore(dlg,document.getElementById('authModal'));
      document.getElementById('sType')?.addEventListener('change',toggleSaleFields);
    }

    const dashRow=document.querySelector('#dashboard .page-head .button-row');
    if(dashRow&&!dashRow.querySelector('[data-sales-action]')){
      const b=document.createElement('button');b.className='btn btn-primary';b.dataset.salesAction='1';b.textContent='Registrar venta';b.onclick=()=>openSaleModal();dashRow.insertBefore(b,dashRow.firstChild);
      const p=document.querySelector('#dashboard .page-head p');if(p)p.textContent='Situación actual de ventas, clientes, saldos y cobranzas.';
    }
    const detailRow=document.querySelector('#clientDetail .page-head .button-row');
    if(detailRow&&!detailRow.querySelector('[data-sales-action]')){
      const b=document.createElement('button');b.className='btn btn-secondary';b.dataset.salesAction='1';b.textContent='+ Venta';b.onclick=()=>openSaleModal(currentClientId);detailRow.insertBefore(b,detailRow.firstChild);
    }
    const detailPanel=document.querySelector('#clientDetail article.panel');
    if(detailPanel&&!document.getElementById('detailSales')){
      const a=document.createElement('article');a.className='panel';a.style.marginBottom='18px';
      a.innerHTML='<div class="panel-head"><div><h3>Ventas del cliente</h3><p>Operaciones al contado y a crédito</p></div></div><div id="detailSales"></div>';
      detailPanel.parentNode.insertBefore(a,detailPanel);
    }
    const reportsCards=document.querySelector('#reportes .report-grid');
    if(reportsCards&&!document.getElementById('repVentas')){
      const a=document.createElement('article');a.className='card kpi-card';a.innerHTML='<span class="kpi-label">Ventas registradas</span><strong id="repVentas">Gs. 0</strong>';reportsCards.appendChild(a);
    }
  }

  function toggleSaleFields(){
    const credit=document.getElementById('sType')?.value==='Crédito';
    const due=document.getElementById('sDueWrap'),method=document.getElementById('sMethodWrap'),ref=document.getElementById('sRefWrap');
    if(due)due.style.display=credit?'':'none';
    if(method)method.style.display=credit?'none':'';
    if(ref)ref.style.display=credit?'none':'';
  }

  injectSalesUi();
  let editingSaleId=null;

  function totalSales(cid){return active(state.sales||[]).filter(v=>!cid||v.clientId===cid).reduce((s,v)=>s+Number(v.amount||0),0)}
  function cashSales(cid){return active(state.sales||[]).filter(v=>(!cid||v.clientId===cid)&&v.type==='Contado').reduce((s,v)=>s+Number(v.amount||0),0)}

  function populateSaleClientSelect(){
    const node=document.getElementById('sClient');if(!node)return;
    const ordered=[...active(state.clients)].sort((a,b)=>a.name.localeCompare(b.name));
    node.innerHTML='<option value="">Seleccionar...</option>'+ordered.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
  }

  function renderSales(){
    const body=document.getElementById('salesTable');if(!body)return;
    const arr=[...active(state.sales||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date))||Number(b.createdAt||0)-Number(a.createdAt||0));
    body.innerHTML=arr.length?arr.map(v=>`<tr><td>${fmtDate(v.date)}</td><td>${esc(clientById(v.clientId)?.name||'-')}</td><td>${esc(v.concept)}</td><td><span class="status ${v.type==='Crédito'?'warn':'ok'}">${esc(v.type)}</span></td><td><strong>${money(v.amount)}</strong></td><td>${v.type==='Contado'?esc(v.method||'-'):'Cuenta corriente'}</td><td><div class="row-actions"><button class="btn btn-secondary btn-small" onclick="editSale('${v.id}')">Editar</button><button class="btn btn-danger btn-small" onclick="deleteSale('${v.id}')">Eliminar</button></div></td></tr>`).join(''):'<tr><td colspan="7" class="empty-row">No hay ventas registradas.</td></tr>';
  }

  function renderClientSales(){
    const box=document.getElementById('detailSales');if(!box||!currentClientId)return;
    const arr=[...active(state.sales||[]).filter(v=>v.clientId===currentClientId)].sort((a,b)=>String(b.date).localeCompare(String(a.date))||Number(b.createdAt||0)-Number(a.createdAt||0)).slice(0,8);
    box.innerHTML=arr.length?arr.map(v=>`<div class="list-row"><span>${fmtDate(v.date)} · ${esc(v.concept)} <small style="color:#64748b">(${esc(v.type)})</small></span><strong>${money(v.amount)}</strong></div>`).join(''):'<div class="empty">Este cliente todavía no tiene ventas registradas.</div>';
  }

  const originalPopulateClientSelects=populateClientSelects;
  populateClientSelects=function(){originalPopulateClientSelects();populateSaleClientSelect()};

  const originalRenderAll=renderAll;
  renderAll=function(){originalRenderAll();renderSales();renderClientSales();const r=document.getElementById('repVentas');if(r)r.textContent=money(totalSales())};

  const originalRenderClientDetail=renderClientDetail;
  renderClientDetail=function(){originalRenderClientDetail();renderClientSales()};

  window.openSaleModal=function(cid=null){
    if(!active(state.clients).length)return alert('Primero registrá al menos un cliente.');
    editingSaleId=null;populateSaleClientSelect();
    document.getElementById('saleForm').reset();document.getElementById('sDate').value=today();document.getElementById('sType').value='Contado';
    if(cid)document.getElementById('sClient').value=cid;
    document.querySelector('#saleModal .modal-head h3').textContent='Registrar venta';document.getElementById('saveSaleBtn').textContent='Guardar venta';toggleSaleFields();document.getElementById('saleModal').showModal();
  };

  window.editSale=function(sid){
    const v=(state.sales||[]).find(x=>x.id===sid&&!x.deletedAt);if(!v)return;
    editingSaleId=sid;populateSaleClientSelect();document.getElementById('saleForm').reset();
    document.getElementById('sClient').value=v.clientId;document.getElementById('sConcept').value=v.concept||'';document.getElementById('sAmount').value=v.amount||'';document.getElementById('sDate').value=v.date||today();document.getElementById('sType').value=v.type||'Contado';document.getElementById('sMethod').value=v.method||'Efectivo';document.getElementById('sRef').value=v.ref||'';document.getElementById('sDue').value=v.due||'';
    document.querySelector('#saleModal .modal-head h3').textContent='Editar venta';document.getElementById('saveSaleBtn').textContent='Guardar cambios';toggleSaleFields();document.getElementById('saleModal').showModal();
  };

  function saveSale(){
    const cid=document.getElementById('sClient').value,concept=document.getElementById('sConcept').value.trim(),amount=Number(document.getElementById('sAmount').value),date=document.getElementById('sDate').value||today(),type=document.getElementById('sType').value;
    if(!cid)return alert('Seleccioná un cliente.');if(!concept)return alert('Ingresá el concepto de la venta.');if(!(amount>0))return alert('Ingresá un monto válido mayor a cero.');
    let v=editingSaleId?(state.sales||[]).find(x=>x.id===editingSaleId):null;
    if(!v){v={id:id(),clientId:cid,concept,amount,date,type,method:'Efectivo',ref:'',due:'',debtId:'',createdAt:Date.now(),updatedAt:nowIso(),deletedAt:''};state.sales.push(v)}
    Object.assign(v,{clientId:cid,concept,amount,date,type,method:type==='Contado'?document.getElementById('sMethod').value:'',ref:type==='Contado'?document.getElementById('sRef').value.trim():'',due:type==='Crédito'?(document.getElementById('sDue').value||''):''});
    v.deletedAt='';v.updatedAt=nowIso();

    let linked=v.debtId?state.debts.find(d=>d.id===v.debtId):null;
    if(type==='Crédito'){
      if(!linked){linked={id:id(),clientId:cid,concept:'Venta: '+concept,amount,date,due:v.due||'',createdAt:Date.now(),updatedAt:nowIso(),deletedAt:''};state.debts.push(linked);v.debtId=linked.id}
      Object.assign(linked,{clientId:cid,concept:'Venta: '+concept,amount,date,due:v.due||'',deletedAt:'',updatedAt:nowIso()});
      queueMutation('debts',linked.id);
    }else if(linked&&!linked.deletedAt){
      softDelete('debts',linked);v.debtId='';
    }else if(type==='Contado'){v.debtId=''}

    persistLocal();queueMutation('sales',v.id);editingSaleId=null;renderAll();scheduleCloudSync();document.getElementById('saleModal').close();
  }

  const originalBindForms=bindForms;
  bindForms=function(){originalBindForms();document.getElementById('saveSaleBtn')?.addEventListener('click',e=>{e.preventDefault();saveSale()})};

  window.deleteSale=function(sid){
    const v=(state.sales||[]).find(x=>x.id===sid&&!x.deletedAt);if(!v)return;
    const client=clientById(v.clientId)?.name||'este cliente';
    if(!confirm(`¿Eliminar la venta “${v.concept}” de ${client} por ${money(v.amount)}?${v.type==='Crédito'?'\n\nTambién se eliminará la deuda vinculada.':''}`))return;
    softDelete('sales',v);const d=v.debtId?state.debts.find(x=>x.id===v.debtId&&!x.deletedAt):null;if(d)softDelete('debts',d);persistLocal();renderAll();scheduleCloudSync();
  };

  const originalLocalToCloud=localToCloud;
  localToCloud=function(table,r){if(table!=='sales')return originalLocalToCloud(table,r);const common={id:r.id,user_id:currentUser.id,workspace_id:workspaceId,created_at:new Date(r.createdAt||Date.now()).toISOString(),updated_at:r.updatedAt||nowIso(),deleted_at:r.deletedAt||null};return {...common,client_id:r.clientId,concept:r.concept,amount:Number(r.amount),sale_date:r.date,sale_type:r.type,method:r.method||null,reference:r.ref||null,due_date:r.due||null,debt_id:r.debtId||null}};
  const originalCloudToLocal=cloudToLocal;
  cloudToLocal=function(table,r){if(table!=='sales')return originalCloudToLocal(table,r);return {id:r.id,clientId:r.client_id,concept:r.concept||'',amount:Number(r.amount),date:r.sale_date,type:r.sale_type==='Crédito'?'Crédito':'Contado',method:r.method||'Efectivo',ref:r.reference||'',due:r.due_date||'',debtId:r.debt_id||'',createdAt:new Date(r.created_at).getTime(),updatedAt:r.updated_at,deletedAt:r.deleted_at||''}};
  const originalStateArray=stateArray;
  stateArray=function(table){return table==='sales'?state.sales:originalStateArray(table)};
  const originalMergeRemote=mergeRemote;
  mergeRemote=function(table,rows,full=false){if(table!=='sales')return originalMergeRemote(table,rows,full);const incoming=(rows||[]).map(r=>cloudToLocal('sales',r));if(full){state.sales=incoming;return}const map=new Map((state.sales||[]).map(x=>[x.id,x]));for(const r of incoming)map.set(r.id,r);state.sales=[...map.values()]};

  pushQueue=async function(){
    const q=readQueue();if(!q.length)return true;
    for(const table of ['clients','debts','payments','sales']){
      const items=q.filter(x=>x.table===table);if(!items.length)continue;const arr=stateArray(table);const rows=items.map(x=>arr.find(r=>r.id===x.id)).filter(Boolean).map(r=>localToCloud(table,r));if(!rows.length){removeQueued(items);continue}
      const dbTable=table==='clients'?'cecilia_clients':table==='debts'?'cecilia_debts':table==='payments'?'cecilia_payments':'cecilia_sales';const {error}=await sb.from(dbTable).upsert(rows,{onConflict:'id'});if(error)throw error;removeQueued(items)
    }
    return readQueue().length===0;
  };

  pullChanges=async function(forceFull=false){
    const since=forceFull?null:localStorage.getItem(pullKey());const {data,error}=await sb.rpc('cecilia_pull_changes',{p_workspace:workspaceId,p_since:since||null});if(error)throw error;const bundle=data||{};
    mergeRemote('clients',bundle.clients||[],!since);mergeRemote('debts',bundle.debts||[],!since);mergeRemote('payments',bundle.payments||[],!since);mergeRemote('sales',bundle.sales||[],!since);persistLocal();if(bundle.server_time)localStorage.setItem(pullKey(),bundle.server_time);renderAll();
  };

  createCloudBackup=async function(force=false){
    if(!currentUser||!workspaceId||!navigator.onLine||!sb)return;const last=Number(localStorage.getItem(backupKey())||0);if(!force&&Date.now()-last<BACKUP_INTERVAL)return;
    const snapshot={version:3,workspaceId,clients:state.clients,debts:state.debts,payments:state.payments,sales:state.sales||[]};const {error}=await sb.from('cecilia_backups').insert({user_id:currentUser.id,workspace_id:workspaceId,snapshot});if(error)throw error;localStorage.setItem(backupKey(),String(Date.now()));const {data}=await sb.from('cecilia_backups').select('id').eq('workspace_id',workspaceId).order('created_at',{ascending:false}).range(20,100);if(data?.length)await sb.from('cecilia_backups').delete().in('id',data.map(x=>x.id));
  };

  exportData=function(){const blob=new Blob([JSON.stringify({version:3,workspaceId,exportedAt:nowIso(),...state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='cecilia-comercial-respaldo-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};

  exportExcel=function(){
    if(typeof XLSX==='undefined')return alert('El módulo de Excel no está disponible.');
    const clientes=active(state.clients).map(c=>({Cliente:c.name,'Cédula/RUC':c.doc||'',Teléfono:c.phone||'',Dirección:c.address||'',Observaciones:c.notes||'','Ventas totales':totalSales(c.id),'Deuda total':totalDebt(c.id),'Total pagado':totalPaid(c.id),'Saldo pendiente':balance(c.id)}));
    const ventas=active(state.sales||[]).map(v=>({Fecha:fmtDate(v.date),Cliente:clientById(v.clientId)?.name||'',Concepto:v.concept,Tipo:v.type,Monto:Number(v.amount),'Medio de pago':v.type==='Contado'?v.method:'Cuenta corriente',Referencia:v.ref||'',Vencimiento:v.due?fmtDate(v.due):''}));
    const deudas=active(state.debts).map(d=>({Cliente:clientById(d.clientId)?.name||'',Concepto:d.concept,Fecha:fmtDate(d.date),Vencimiento:d.due?fmtDate(d.due):'',Monto:Number(d.amount),'Saldo pendiente':debtRemaining(d),Estado:debtRemaining(d)<=0?'Pagada':(d.due&&d.due<today()?'Vencida':'Pendiente')}));
    const pagos=active(state.payments).map(p=>({Fecha:fmtDate(p.date),Cliente:clientById(p.clientId)?.name||'',Monto:Number(p.amount),'Medio de pago':p.method,Referencia:p.ref||''}));
    const resumen=[{Indicador:'Ventas totales registradas',Monto:totalSales()},{Indicador:'Ventas al contado',Monto:cashSales()},{Indicador:'Deuda total registrada',Monto:totalDebt()},{Indicador:'Total cobrado de deudas',Monto:totalPaid()},{Indicador:'Saldo pendiente',Monto:balance()},{Indicador:'Cantidad de clientes',Monto:active(state.clients).length}];
    const wb=XLSX.utils.book_new();const add=(rows,name,widths)=>{const ws=XLSX.utils.json_to_sheet(rows.length?rows:[{'Sin datos':''}]);ws['!cols']=widths.map(w=>({wch:w}));XLSX.utils.book_append_sheet(wb,ws,name)};add(resumen,'Resumen',[30,18]);add(clientes,'Clientes',[28,18,18,30,35,18,18,18,18]);add(ventas,'Ventas',[14,28,32,14,16,20,24,14]);add(deudas,'Deudas',[28,30,14,14,16,18,14]);add(pagos,'Pagos',[14,28,16,18,24]);XLSX.writeFile(wb,'Cecilia_Comercial_'+today()+'.xlsx');
  };

  applyReplacementSnapshot=function(snapshot){
    const incoming=normalizeState(snapshot);const stamp=nowIso();const tables=['clients','debts','payments','sales'];const incomingIds={};tables.forEach(t=>incomingIds[t]=new Set((incoming[t]||[]).map(x=>x.id)));
    for(const table of tables){const existing=stateArray(table),next=incoming[table]||[];for(const r of existing){if(!incomingIds[table].has(r.id)&&!r.deletedAt){r.deletedAt=stamp;r.updatedAt=stamp;queueMutation(table,r.id)}}for(const r of next){r.deletedAt=r.deletedAt||'';r.updatedAt=stamp;const idx=existing.findIndex(x=>x.id===r.id);if(idx>=0)existing[idx]=r;else existing.push(r);queueMutation(table,r.id)}}persistLocal();renderAll();scheduleCloudSync();
  };

  deleteClient=function(cid){
    const c=clientById(cid);if(!c)return;const debts=active(state.debts).filter(x=>x.clientId===cid),payments=active(state.payments).filter(x=>x.clientId===cid),sales=active(state.sales||[]).filter(x=>x.clientId===cid);
    const extra=`\n\nTambién se eliminarán ${sales.length} venta(s), ${debts.length} deuda(s) y ${payments.length} pago(s) asociados.`;if(!confirm(`¿Eliminar al cliente “${c.name}”?${extra}\n\nLa eliminación se sincronizará de forma segura.`))return;
    softDelete('clients',c);debts.forEach(x=>softDelete('debts',x));payments.forEach(x=>softDelete('payments',x));sales.forEach(x=>softDelete('sales',x));if(currentClientId===cid)currentClientId=null;persistLocal();renderAll();goView('clientes');scheduleCloudSync();
  };

  resetData=async function(){
    if(!active(state.clients).length&&!active(state.debts).length&&!active(state.payments).length&&!active(state.sales||[]).length)return alert('No hay datos para borrar.');
    if(!confirm('ATENCIÓN: vas a eliminar todos los clientes, ventas, deudas y pagos. Se creará una copia recuperable antes de continuar.'))return;if(prompt('Escribí BORRAR en mayúsculas para continuar.')!=='BORRAR')return alert('Eliminación cancelada.');
    if(navigator.onLine)try{await createCloudBackup(true)}catch(err){console.error(err);if(!confirm('No se pudo crear la copia en la nube. ¿Continuar de todos modos?'))return}
    const stamp=nowIso();for(const c of active(state.clients)){c.deletedAt=stamp;c.updatedAt=stamp;queueMutation('clients',c.id)}for(const d of active(state.debts)){d.deletedAt=stamp;d.updatedAt=stamp;queueMutation('debts',d.id)}for(const p of active(state.payments)){p.deletedAt=stamp;p.updatedAt=stamp;queueMutation('payments',p.id)}for(const v of active(state.sales||[])){v.deletedAt=stamp;v.updatedAt=stamp;queueMutation('sales',v.id)}persistLocal();currentClientId=null;renderAll();goView('dashboard');scheduleCloudSync();alert('Datos marcados como eliminados. La eliminación se sincronizará de forma segura.');
  };
})();
