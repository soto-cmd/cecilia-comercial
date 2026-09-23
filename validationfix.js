(()=>{
  const nativeAlert=window.alert.bind(window);
  function focusField(id){const n=document.getElementById(id);if(n){n.focus();try{n.scrollIntoView({behavior:'smooth',block:'center'})}catch{}}}
  window.alert=function(message){
    const msg=String(message??'');
    if(msg==='Completá cliente, concepto y un monto válido.'){
      const client=document.getElementById('dClient')?.value||'';
      const concept=(document.getElementById('dConcept')?.value||'').trim();
      const amount=Number(document.getElementById('dAmount')?.value||0);
      if(!client){focusField('dClient');return nativeAlert('Seleccioná un cliente.');}
      if(!concept){focusField('dConcept');return nativeAlert('Ingresá el concepto de la deuda.');}
      if(!(amount>0)){focusField('dAmount');return nativeAlert('Ingresá un monto válido mayor a cero.');}
    }
    if(msg==='Completá cliente y un monto válido.'){
      const client=document.getElementById('pClient')?.value||'';
      const amount=Number(document.getElementById('pAmount')?.value||0);
      if(!client){focusField('pClient');return nativeAlert('Seleccioná un cliente.');}
      if(!(amount>0)){focusField('pAmount');return nativeAlert('Ingresá un monto válido mayor a cero.');}
    }
    return nativeAlert(message);
  };
})();

document.write('<script src="sales.js"><\/script>');
