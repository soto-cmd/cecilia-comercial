(function(){
  const DELETE_KEY='cecilia_delete_queue_v1';
  function qread(){try{return JSON.parse(localStorage.getItem(DELETE_KEY)||'[]')}catch{return []}}
  function qwrite(q){if(q.length)localStorage.setItem(DELETE_KEY,JSON.stringify(q));else localStorage.removeItem(DELETE_KEY)}
  function qadd(table,id){const q=qread();if(!q.some(x=>x.table===table&&x.id===id)){q.push({table,id});qwrite(q)}}
  function qremove(table,id){qwrite(qread().filter(x=>!(x.table===table&&x.id===id)))}

  async function deleteRemote(table,id){
    if(!currentUser||!navigator.onLine||!sb){qadd(table,id);return false}
    try{
      const {error}=await sb.from(table).delete().eq('id',id).eq('user_id',currentUser.id);
      if(error)throw error;
      qremove(table,id);
      return true;
    }catch(err){
      console.error('Delete sync error',err);
      qadd(table,id);
      return false;
    }
  }

  async function flushDeletes(){
    if(!currentUser||!navigator.onLine||!sb)return;
    const q=qread();
    if(!q.length)return;
    const pending=[];
    for(const item of q){
      try{
        const {error}=await sb.from(item.table).delete().eq('id',item.id).eq('user_id',currentUser.id);
        if(error)throw error;
      }catch(err){pending.push(item);console.error('Delete sync error',err)}
    }
    qwrite(pending);
  }

  function pendingSets(){
    const q=qread();
    return {
      clients:new Set(q.filter(x=>x.table==='cecilia_clients').map(x=>x.id)),
      debts:new Set(q.filter(x=>x.table==='cecilia_debts').map(x=>x.id)),
      payments:new Set(q.filter(x=>x.table==='cecilia_payments').map(x=>x.id))
    };
  }

  if(typeof fetchCloudState==='function'){
    const originalFetch=fetchCloudState;
    fetchCloudState=async function(){
      const cloud=await originalFetch();
      const d=pendingSets();
      cloud.clients=cloud.clients.filter(x=>!d.clients.has(x.id));
      cloud.debts=cloud.debts.filter(x=>!d.debts.has(x.id));
      cloud.payments=cloud.payments.filter(x=>!d.payments.has(x.id));
      return cloud;
    };
  }

  window.deleteDebt=async function(did){
    const d=state.debts.find(x=>x.id===did);if(!d)return;
    const client=clientById(d.clientId)?.name||'este cliente';
    if(!confirm(`¿Eliminar la deuda “${d.concept}” de ${client} por ${money(d.amount)}?\n\nEl saldo será recalculado. Esta acción no se puede deshacer.`))return;
    qadd('cecilia_debts',did);
    state.debts=state.debts.filter(x=>x.id!==did);
    persistLocal();markDirty();renderAll();
    await deleteRemote('cecilia_debts',did);
    if(navigator.onLine&&currentUser){clearDirty();updateConnectivityUi()}
  };

  window.deletePayment=async function(pid){
    const p=state.payments.find(x=>x.id===pid);if(!p)return;
    const client=clientById(p.clientId)?.name||'este cliente';
    if(!confirm(`¿Eliminar el pago de ${money(p.amount)} registrado para ${client}?\n\nEl saldo pendiente volverá a aumentar. Esta acción no se puede deshacer.`))return;
    qadd('cecilia_payments',pid);
    state.payments=state.payments.filter(x=>x.id!==pid);
    persistLocal();markDirty();renderAll();
    await deleteRemote('cecilia_payments',pid);
    if(navigator.onLine&&currentUser){clearDirty();updateConnectivityUi()}
  };

  window.deleteClient=async function(cid){
    const c=clientById(cid);if(!c)return;
    const debts=state.debts.filter(x=>x.clientId===cid),payments=state.payments.filter(x=>x.clientId===cid);
    const extra=debts.length||payments.length?`\n\nTambién se eliminarán ${debts.length} deuda(s) y ${payments.length} pago(s) asociados.`:'';
    if(!confirm(`¿Eliminar al cliente “${c.name}”?${extra}\n\nEsta acción no se puede deshacer.`))return;
    debts.forEach(x=>qadd('cecilia_debts',x.id));
    payments.forEach(x=>qadd('cecilia_payments',x.id));
    qadd('cecilia_clients',cid);
    state.debts=state.debts.filter(x=>x.clientId!==cid);
    state.payments=state.payments.filter(x=>x.clientId!==cid);
    state.clients=state.clients.filter(x=>x.id!==cid);
    if(currentClientId===cid)currentClientId=null;
    persistLocal();markDirty();renderAll();goView('clientes');
    for(const x of debts)await deleteRemote('cecilia_debts',x.id);
    for(const x of payments)await deleteRemote('cecilia_payments',x.id);
    await deleteRemote('cecilia_clients',cid);
    if(navigator.onLine&&currentUser){clearDirty();updateConnectivityUi()}
  };

  window.addEventListener('online',flushDeletes);
  window.addEventListener('load',async()=>{
    await flushDeletes();
    if(!currentUser||!navigator.onLine||!sb||typeof fetchCloudState!=='function')return;
    try{
      const cloud=await fetchCloudState();
      if(!isDirty()){
        state=cloud;
        persistLocal();renderAll();
      } else {
        const d=pendingSets();
        state.clients=state.clients.filter(x=>!d.clients.has(x.id));
        state.debts=state.debts.filter(x=>!d.debts.has(x.id));
        state.payments=state.payments.filter(x=>!d.payments.has(x.id));
        persistLocal();renderAll();
      }
    }catch(err){console.error('Cloud reconciliation error',err)}
  });
})();
