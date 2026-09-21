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

  const doSignOut=()=>signOutCloud();

  function ensureTopSessionButton(){
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
    document.getElementById('homeSignOutBtn')?.remove();
  }

  function paintSessionButton(){
    ensureTopSessionButton();
    const signed=isSigned();
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
    ensureTopSessionButton();
    paintSessionButton();
    setTimeout(paintSessionButton,250);
    setTimeout(paintSessionButton,1000);
  });

  const wrap=()=>{
    if(typeof updateAuthUi!=='function')return false;
    const original=updateAuthUi;
    updateAuthUi=function(){
      original();
      setTimeout(paintSessionButton,0);
    };
    paintSessionButton();
    return true;
  };

  if(!wrap()){
    const timer=setInterval(()=>{if(wrap())clearInterval(timer)},100);
    setTimeout(()=>clearInterval(timer),5000);
  }
})();