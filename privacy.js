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
    if(typeof currentUser!=='undefined' && currentUser){set(dirty?'Pendiente de sincronizar':'Sincronizado',dirty?'Cambio guardado en este equipo. La copia en la nube se actualizará automáticamente.':'Datos sincronizados correctamente con la nube.');return;}
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
    if(typeof ccDeleteQueue==='function'&&typeof fetchCloudState==='function'){
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
    }

    /* Local-first: varios cambios seguidos se agrupan en una sola sincronización. */
    if(typeof scheduleCloudSync==='function'){
      scheduleCloudSync=function(){
        if(syncTimer)clearTimeout(syncTimer);
        if(!currentUser||!navigator.onLine)return;
        syncTimer=setTimeout(()=>syncNow(),5000);
      };
    }

    /* Los respaldos históricos no necesitan crearse en cada cambio. */
    if(typeof createCloudBackup==='function'){
      const originalBackup=createCloudBackup;
      createCloudBackup=async function(force=false){
        if(force)return originalBackup(true);
        const last=Number(localStorage.getItem(LAST_BACKUP_KEY)||0);
        if(Date.now()-last<30*60*1000)return;
        return originalBackup(false);
      };
    }

    /* Evita una lectura completa de Supabase por cada alta/edición pequeña.
       Se hace una conciliación completa al entrar, al volver de offline o cada 5 minutos. */
    if(typeof syncNow==='function'&&typeof upsertCloudState==='function'){
      const originalSync=syncNow;
      let lastFullSync=0;
      const pushOnly=async()=>{
        if(syncing||!currentUser||!navigator.onLine||!sb)return;
        syncing=true;updateConnectivityUi();
        try{
          if(typeof ccFlushDeleteQueue==='function')await ccFlushDeleteQueue();
          await upsertCloudState();
          await createCloudBackup();
          clearDirty();
          renderAll();
        }catch(err){
          console.error('Cloud push error',err);
          markDirty();
        }finally{
          syncing=false;updateConnectivityUi();
        }
      };
      syncNow=async function(){
        const pendingDeletes=typeof ccDeleteQueue==='function'&&ccDeleteQueue().length>0;
        const needsFull=!lastFullSync||(Date.now()-lastFullSync>5*60*1000);
        if(!needsFull&&isDirty()&&!pendingDeletes)return pushOnly();
        const result=await originalSync();
        if(navigator.onLine&&currentUser)lastFullSync=Date.now();
        return result;
      };
      window.addEventListener('offline',()=>{lastFullSync=0});
    }
  });
})();
