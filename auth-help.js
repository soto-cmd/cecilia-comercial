(()=>{
  function enhanceAuthModal(){
    const modal=document.getElementById('authModal');
    if(!modal)return;
    const form=document.getElementById('authForm');
    if(!form)return;

    const head=form.querySelector('.modal-head');
    const intro=head?.querySelector('p');
    if(intro){
      intro.innerHTML='<strong>Primera vez:</strong> escribí tu correo autorizado, creá una contraseña de al menos <strong>6 caracteres</strong> y presioná <strong>Crear cuenta</strong>.<br><br><strong>Si ya tenés cuenta:</strong> ingresá tu correo y contraseña y presioná <strong>Iniciar sesión</strong>.';
    }

    const pass=document.getElementById('authPassword');
    if(pass){
      pass.minLength=6;
      pass.setAttribute('aria-describedby','authPasswordHelp');
      let help=document.getElementById('authPasswordHelp');
      if(!help){
        help=document.createElement('small');
        help.id='authPasswordHelp';
        help.style.cssText='display:block;margin-top:6px;color:#6b7280;font-size:12px;line-height:1.4';
        help.textContent='Mínimo 6 caracteres. Elegí una contraseña que puedas recordar.';
        pass.insertAdjacentElement('afterend',help);
      }
    }

    const createBtn=[...form.querySelectorAll('button')].find(b=>b.textContent.trim()==='Crear cuenta');
    if(createBtn)createBtn.title='Usar solo la primera vez para crear tu acceso';
    const loginBtn=[...form.querySelectorAll('button')].find(b=>b.textContent.trim()==='Iniciar sesión');
    if(loginBtn)loginBtn.title='Usar si ya creaste tu cuenta anteriormente';
  }

  document.addEventListener('DOMContentLoaded',enhanceAuthModal);
  setTimeout(enhanceAuthModal,300);
})();
