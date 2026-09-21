(()=>{
  function enhanceAuthModal(){
    const modal=document.getElementById('authModal');
    const form=document.getElementById('authForm');
    if(!modal||!form)return;

    modal.style.maxWidth='640px';
    const head=form.querySelector('.modal-head');
    const intro=head?.querySelector('p');
    if(intro){
      intro.innerHTML='<strong>Acceso exclusivo para usuarios autorizados.</strong> Elegí la opción que corresponda:';
      intro.style.marginBottom='14px';
    }

    let guide=document.getElementById('authGuide');
    if(!guide&&head){
      guide=document.createElement('div');
      guide.id='authGuide';
      guide.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:14px 0 18px';
      guide.innerHTML=`
        <div style="border:1px solid #e6c24a;background:#fff8df;border-radius:12px;padding:12px 14px;line-height:1.45">
          <strong style="display:block;margin-bottom:5px">Primera vez</strong>
          <span style="font-size:13px;color:#4b5563">1. Ingresá tu correo autorizado.<br>2. Creá una contraseña de <strong>mínimo 6 caracteres</strong>.<br>3. Tocá <strong>Crear mi cuenta</strong>.<br>4. Si recibís un correo de confirmación, abrilo y confirmá tu dirección antes de iniciar sesión.</span>
        </div>
        <div style="border:1px solid #e5e7eb;background:#f9fafb;border-radius:12px;padding:12px 14px;line-height:1.45">
          <strong style="display:block;margin-bottom:5px">Ya tengo cuenta</strong>
          <span style="font-size:13px;color:#4b5563">Ingresá el mismo correo y contraseña que registraste anteriormente y tocá <strong>Iniciar sesión</strong>.</span>
        </div>`;
      head.appendChild(guide);
    }

    const email=document.getElementById('authEmail');
    if(email){
      email.placeholder='ejemplo@correo.com';
      email.autocapitalize='none';
      email.spellcheck=false;
    }

    const pass=document.getElementById('authPassword');
    if(pass){
      pass.minLength=6;
      pass.placeholder='Mínimo 6 caracteres';
      pass.setAttribute('aria-describedby','authPasswordHelp');
      let help=document.getElementById('authPasswordHelp');
      if(!help){
        help=document.createElement('div');
        help.id='authPasswordHelp';
        help.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:6px;flex-wrap:wrap';
        help.innerHTML='<small style="color:#6b7280;font-size:12px">Mínimo 6 caracteres. Recomendado: 8 o más.</small><button type="button" id="toggleAuthPassword" style="border:0;background:transparent;color:#9a7200;font-weight:700;cursor:pointer;padding:2px 0">Mostrar contraseña</button>';
        pass.insertAdjacentElement('afterend',help);
        document.getElementById('toggleAuthPassword')?.addEventListener('click',e=>{
          const showing=pass.type==='text';
          pass.type=showing?'password':'text';
          e.currentTarget.textContent=showing?'Mostrar contraseña':'Ocultar contraseña';
        });
      }
    }

    const actions=form.querySelector('.modal-actions');
    if(actions){actions.style.flexWrap='wrap';actions.style.gap='10px'}
    const createBtn=[...form.querySelectorAll('button')].find(b=>['Crear cuenta','Crear mi cuenta'].includes(b.textContent.trim()));
    if(createBtn){createBtn.textContent='Crear mi cuenta';createBtn.title='Usar solo la primera vez para crear tu acceso'}
    const loginBtn=[...form.querySelectorAll('button')].find(b=>b.textContent.trim()==='Iniciar sesión');
    if(loginBtn)loginBtn.title='Usar si ya creaste tu cuenta anteriormente';
  }

  document.addEventListener('DOMContentLoaded',enhanceAuthModal);
  setTimeout(enhanceAuthModal,300);
})();
