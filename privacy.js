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
})();
