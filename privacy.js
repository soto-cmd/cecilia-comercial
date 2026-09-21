(function(){
  function safeConnectivityUi(){
    const online=navigator.onLine;
    const badge=document.getElementById('dataBadge');
    const side=document.getElementById('sidebarStorage');
    const text=document.getElementById('cloudStatusText');
    const dirty=typeof isDirty==='function' ? isDirty() : false;
    const set=(status,message)=>{if(badge)badge.textContent=status;if(side)side.textContent=message;if(text)text.textContent=message};
    if(!online){set(dirty?'Offline · pendiente':'Offline','Cecilia funciona sin internet. Los cambios quedan guardados en este dispositivo y se sincronizarán al volver la conexión.');return;}
    if(typeof syncing!=='undefined' && syncing){set('Sincronizando...','Guardando los cambios locales en la nube.');return;}
    if(typeof currentUser!=='undefined' && currentUser){set(dirty?'Pendiente de sincronizar':'Sincronizado',dirty?'Hay cambios locales pendientes. Se sincronizarán automáticamente.':'Datos sincronizados correctamente con la nube.');return;}
    set('Solo copia local','Cecilia funciona offline. Conectá tu cuenta para agregar respaldo y sincronización en la nube.');
  }
  window.updateConnectivityUi=safeConnectivityUi;
  const clean=()=>{
    const side=document.getElementById('sidebarStorage');
    const text=document.getElementById('cloudStatusText');
    [side,text].forEach(node=>{if(node && /@/.test(node.textContent||'')) node.textContent='Datos sincronizados correctamente con la nube.';});
  };
  clean();
  window.addEventListener('online',safeConnectivityUi);
  window.addEventListener('offline',safeConnectivityUi);
  setInterval(clean,1000);

  window.addEventListener('load',()=>{
    if(typeof ccDeleteQueue!=='function'||typeof fetchCloudState!=='function')return;
    const originalFetch=fetchCloudState;
    fetchCloudState=async function(){
      const cloud=await originalFetch();
      const q=ccDeleteQueue();
      const clients=new Set(q.filter(x=>x.table==='cecilia_clients').map(x=>x.id));
      const debts=new Set(q.filter(x=>x.table==='cecilia_debts').map(x=>x.id));
      const payments=new Set(q.filter(x=>x.table==='cecilia_payments').map(x=>x.id));
      cloud.clients=cloud.clients.filter(x=>!clients.has(x.id));
      cloud.debts=cloud.debts.filter(x=>!debts.has(x.id));
      cloud.payments=cloud.payments.filter(x=>!payments.has(x.id));
      return cloud;
    };
    ccFlushDeleteQueue=async function(){
      if(!currentUser||!navigator.onLine||!sb)return;
      const q=ccDeleteQueue();
      if(!q.length)return;
      const pending=[];
      for(const item of q){
        try{
          const result=await sb.from(item.table).delete().eq('id',item.id);
          if(result.error)throw result.error;
          const check=await sb.from(item.table).select('id').eq('id',item.id).limit(1);
          if(check.error)throw check.error;
          if(check.data&&check.data.length)pending.push(item);
        }catch(err){pending.push(item);console.error('Delete sync error',err)}
      }
      if(pending.length)localStorage.setItem(CC_DELETE_QUEUE_KEY,JSON.stringify(pending));else localStorage.removeItem(CC_DELETE_QUEUE_KEY);
    };
  });
})();
