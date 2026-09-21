(()=>{
  const hasGreeting=()=>{
    const node=document.getElementById('userGreeting');
    return !!(node&&node.textContent&&node.textContent.trim());
  };

  const isSigned=()=>{
    try{
      if(currentUser&&workspaceId)return true;
    }catch{}
    return hasGreeting();
  };

  const doSignOut=()=>{
    if(confirm('¿Querés cerrar la sesión de Cecilia Comercial?')) signOutCloud();
  };

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
      signOut.addEventListener('click',doSignOut);
      actions.appendChild(signOut);
    }
  }

  function ensureHomeSignOut(){
    const row=document.querySelector('#dashboard .page-head .button-row');
    if(!row)return;
    let btn=document.getElementById('homeSignOutBtn');
    if(!btn){
      btn=document.createElement('button');
      btn.id='homeSignOutBtn';
      btn.type='button';
      btn.className='btn btn-secondary hidden';
      btn.textContent='Cerrar sesión';
      btn.title='Salir de Cecilia Comercial';
      btn.addEventListener('click',doSignOut);
      row.appendChild(btn);
    }
  }

  function paintSessionButtons(){
    ensureTopSessionButtons();
    ensureHomeSignOut();
    const signed=isSigned();
    const login=document.getElementById('cloudBtn');
    const signOut=document.getElementById('topSignOutBtn');
    const homeSignOut=document.getElementById('homeSignOutBtn');

    if(login){
      login.textContent='Iniciar sesión';
      login.classList.toggle('hidden',signed);
      login.onclick=()=>openAuthModal();
    }
    if(signOut)signOut.classList.toggle('hidden',!signed);
    if(homeSignOut)homeSignOut.classList.toggle('hidden',!signed);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    ensureTopSessionButtons();
    ensureHomeSignOut();
    paintSessionButtons();
    setTimeout(paintSessionButtons,250);
    setTimeout(paintSessionButtons,1000);
  });

  const wrap=()=>{
    if(typeof updateAuthUi!=='function')return false;
    const original=updateAuthUi;
    updateAuthUi=function(){
      original();
      setTimeout(paintSessionButtons,0);
    };
    paintSessionButtons();
    return true;
  };

  if(!wrap()){
    const timer=setInterval(()=>{if(wrap())clearInterval(timer)},100);
    setTimeout(()=>clearInterval(timer),5000);
  }
})();