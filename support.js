(()=>{
  'use strict';
  const SUPPORT_EMAIL='l.adrian.soto@gmail.com';

  const style=document.createElement('style');
  style.textContent=`
    #supportButton{position:fixed;right:16px;bottom:16px;z-index:9997;width:46px;height:46px;display:flex;align-items:center;justify-content:center;border:1px solid #c9a227;background:#111;color:#f3df9b;border-radius:50%;padding:0;font-size:20px;line-height:1;font-weight:900;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.22)}
    #supportButton:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,0,0,.28)}
    #supportButton:focus-visible{outline:3px solid rgba(201,162,39,.35);outline-offset:3px}
    #supportDialog{width:min(92vw,540px);border:0;border-radius:16px;padding:0;box-shadow:0 24px 70px rgba(0,0,0,.35)}
    #supportDialog::backdrop{background:rgba(0,0,0,.55)}
    #supportDialog .support-wrap{padding:22px}
    #supportDialog h3{margin:4px 0 6px}
    #supportDialog p{color:#666;font-size:14px;line-height:1.45}
    #supportDialog label{display:grid;gap:7px;margin:14px 0;font-weight:700;font-size:13px}
    #supportDialog select,#supportDialog textarea{width:100%;box-sizing:border-box;border:1px solid #d8d8d8;border-radius:10px;padding:11px 12px;font:inherit;background:#fff;color:#111}
    #supportDialog textarea{min-height:96px;resize:vertical}
    #supportDialog .support-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:18px}
    #supportDialog .support-btn{border:1px solid #d1d5db;background:#fff;border-radius:10px;padding:10px 14px;font-weight:750;cursor:pointer}
    #supportDialog .support-primary{background:#111;color:#f3df9b;border-color:#c9a227}
    #supportStatus{min-height:18px;font-size:13px;font-weight:700;margin-top:10px}
    @media(max-width:640px){#supportButton{right:10px;bottom:10px;width:42px;height:42px;font-size:18px}}
  `;

  function getReport(){
    const type=document.getElementById('supportType').value;
    const description=document.getElementById('supportDescription').value.trim();
    const steps=document.getElementById('supportSteps').value.trim();
    const active=document.querySelector('.view.active');
    return [
      'REPORTE DE SOPORTE - CECILIA COMERCIAL',
      '',
      `Tipo: ${type}`,
      `Descripción: ${description}`,
      `Qué estaba haciendo: ${steps||'No informado'}`,
      '',
      `Fecha y hora: ${new Date().toLocaleString('es-PY')}`,
      `Sección: ${active?.id||'No identificada'}`,
      `URL: ${location.href}`,
      `Navegador: ${navigator.userAgent}`
    ].join('\n');
  }

  function setStatus(text,error=false){
    const node=document.getElementById('supportStatus');
    node.textContent=text;
    node.style.color=error?'#b42318':'#166534';
  }

  function validate(){
    const field=document.getElementById('supportDescription');
    if(field.value.trim())return true;
    setStatus('Describí brevemente el problema antes de enviar.',true);
    field.focus();
    return false;
  }

  function sendReport(){
    if(!validate())return;
    const type=document.getElementById('supportType').value;
    const subject=`Cecilia Comercial - ${type}`;
    location.href=`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(getReport())}`;
    setStatus('Se abrió tu correo con el reporte preparado.');
  }

  async function copyReport(){
    if(!validate())return;
    try{
      await navigator.clipboard.writeText(getReport());
      setStatus('Reporte copiado. Podés pegarlo en WhatsApp o correo.');
    }catch(e){
      setStatus('No se pudo copiar automáticamente. Usá Enviar reporte.',true);
    }
  }

  function mount(){
    if(document.getElementById('supportButton'))return;
    document.head.appendChild(style);

    const button=document.createElement('button');
    button.type='button';
    button.id='supportButton';
    button.textContent='?';
    button.title='Soporte - Reportar un error';
    button.setAttribute('aria-label','Soporte - Reportar un error');

    const dialog=document.createElement('dialog');
    dialog.id='supportDialog';
    dialog.innerHTML=`
      <div class="support-wrap">
        <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#9a7200">Soporte</div>
        <h3>Reportar un error</h3>
        <p>Describí lo ocurrido. El reporte agrega automáticamente la sección, fecha, URL y navegador.</p>
        <label>Tipo de problema
          <select id="supportType">
            <option>Error general</option>
            <option>No puedo guardar</option>
            <option>Datos incorrectos o faltantes</option>
            <option>Problema de acceso</option>
            <option>Problema de sincronización</option>
            <option>Problema visual</option>
            <option>Otro</option>
          </select>
        </label>
        <label>¿Qué pasó?
          <textarea id="supportDescription" maxlength="1500" placeholder="Ej.: Intenté guardar un pago y no respondió..."></textarea>
        </label>
        <label>¿Qué estabas haciendo? (opcional)
          <textarea id="supportSteps" maxlength="1000" placeholder="Ej.: Abrí Pagos, seleccioné cliente y completé el monto..."></textarea>
        </label>
        <div id="supportStatus" role="status" aria-live="polite"></div>
        <div class="support-actions">
          <button type="button" class="support-btn" id="supportCancel">Cancelar</button>
          <button type="button" class="support-btn" id="supportCopy">Copiar reporte</button>
          <button type="button" class="support-btn support-primary" id="supportSend">Enviar reporte</button>
        </div>
      </div>`;

    document.body.append(button,dialog);
    button.addEventListener('click',()=>dialog.showModal());
    document.getElementById('supportCancel').addEventListener('click',()=>dialog.close());
    document.getElementById('supportCopy').addEventListener('click',copyReport);
    document.getElementById('supportSend').addEventListener('click',sendReport);
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();