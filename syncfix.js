(function(){
  if(typeof ccDeleteQueue!=='function' || typeof fetchCloudState!=='function') return;

  function deletedSets(){
    const q=ccDeleteQueue();
    return {
      clients:new Set(q.filter(x=>x.table==='cecilia_clients').map(x=>x.id)),
      debts:new Set(q.filter(x=>x.table==='cecilia_debts').map(x=>x.id)),
      payments:new Set(q.filter(x=>x.table==='cecilia_payments').map(x=>x.id))
    };
  }

  const originalFetchCloudState=fetchCloudState;
  fetchCloudState=async function(){
    const cloud=await originalFetchCloudState();
    const del=deletedSets();
    cloud.clients=cloud.clients.filter(x=>!del.clients.has(x.id));
    cloud.debts=cloud.debts.filter(x=>!del.debts.has(x.id));
    cloud.payments=cloud.payments.filter(x=>!del.payments.has(x.id));
    return cloud;
  };

  ccFlushDeleteQueue=async function(){
    if(!currentUser||!navigator.onLine||!sb)return;
    const q=ccDeleteQueue();
    if(!q.length)return;
    const pending=[];
    for(const item of q){
      try{
        const {error}=await sb.from(item.table).delete().eq('id',item.id);
        if(error)throw error;
        const {data,error:checkError}=await sb.from(item.table).select('id').eq('id',item.id).limit(1);
        if(checkError)throw checkError;
        if(data&&data.length)pending.push(item);
      }catch(err){
        console.error('Delete sync error',err);
        pending.push(item);
      }
    }
    if(pending.length)localStorage.setItem(CC_DELETE_QUEUE_KEY,JSON.stringify(pending));
    else localStorage.removeItem(CC_DELETE_QUEUE_KEY);
  };

  function removePendingLocally(){
    const del=deletedSets();
    const before=state.clients.length+state.debts.length+state.payments.length;
    state.clients=state.clients.filter(x=>!del.clients.has(x.id));
    state.debts=state.debts.filter(x=>!del.debts.has(x.id));
    state.payments=state.payments.filter(x=>!del.payments.has(x.id));
    const after=state.clients.length+state.debts.length+state.payments.length;
    if(after!==before){persistLocal();renderAll();}
  }

  removePendingLocally();
})();
