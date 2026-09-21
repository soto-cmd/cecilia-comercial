(()=>{
  function ensureTopSessionButtons(){
    const actions=document.querySelector('.top-actions');
    if(!actions)return;
    let signOut=document.getElementById('topSignOutBtn');
    if(!signOut){
      signOut=document.createElement('button');
      signOut.id='topSignOutBtn';
      signOut.type='button';
      signOut.className='btn btn-ghost hidden';
      signOut.textContent='Cerrar sesión';
      signOut.addEventListener('click',()=>{
        if(confirm('¿Querés cerrar la sesión de Cecilia Comercial?')) signOutCloud();
      });
      actions.appendChild(signOut);
    }
  }

  function paintSessionButtons(){
    ensureTopSessionButtons();
    const signed=!!window.currentUser&&!!window.workspaceId;
    const login=document.getElementById('cloudBtn');
    const signOut=document.getElementById('topSignOutBtn');
    if(login){
      login.textContent='Iniciar sesión';
      login.classList.toggle('hidden',signed);
      login.onclick=()=>openAuthModal();
    }
    if(signOut)signOut.classList.toggle('hidden',!signed);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    ensureTopSessionButtons();
    paintSessionButtons();
    setTimeout(paintSessionButtons,400);
  });

  const wrap=()=>{
    if(typeof updateAuthUi!=='function')return false;
    const original=updateAuthUi;
    updateAuthUi=function(){
      original();
      paintSessionButtons();
    };
    paintSessionButtons();
    return true;
  };

  if(!wrap()){
    const timer=setInterval(()=>{if(wrap())clearInterval(timer)},100);
    setTimeout(()=>clearInterval(timer),5000);
  }
})();
