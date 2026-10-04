(()=>{
  'use strict';

  const icons={
    dashboard:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.7 12 3.8l8.5 6.9v8a2 2 0 0 1-2 2h-4.2v-6.1H9.7v6.1H5.5a2 2 0 0 1-2-2z"/><path d="M8.2 5.8V3.9h2.2v.2"/></svg>',
    clientes:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7.2" r="3.1"/><circle cx="5.5" cy="9.3" r="2.2"/><circle cx="18.5" cy="9.3" r="2.2"/><path d="M6.8 19.8v-2.1a5.2 5.2 0 0 1 10.4 0v2.1"/><path d="M1.8 19v-1.3a3.8 3.8 0 0 1 4.6-3.7M22.2 19v-1.3a3.8 3.8 0 0 0-4.6-3.7"/></svg>',
    ventas:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 7.2h13.6l-1.1 13H6.3z"/><path d="M8.5 8V6.2a3.5 3.5 0 0 1 7 0V8"/><path d="M9.2 13.1h5.6"/></svg>',
    deudas:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h9.2l2.8 2.8v14.2H6z"/><path d="M15 3.7v3h3"/><path d="M8.8 10h6.5M8.8 13.2h4.8"/><circle cx="16.9" cy="16.8" r="3.3"/><path d="M16.9 15.1v2.3M16.9 18.7h.01"/></svg>',
    pagos:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5h17v11h-17z"/><path d="M3.5 10.6h17"/><circle cx="16.7" cy="15" r="1.5"/><path d="M6.3 14.8h4.5"/></svg>',
    reportes:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20.5h16"/><rect x="5.2" y="13.5" width="3" height="5" rx=".8"/><rect x="10.5" y="9.5" width="3" height="9" rx=".8"/><rect x="15.8" y="5.5" width="3" height="13" rx=".8"/><path d="m5.5 9.5 4-3 3 1.5 5-4"/></svg>',
    config:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.8 3.7h4.4l.6 2a7 7 0 0 1 1.5.9l2-.5 2.2 3.8-1.5 1.5a7 7 0 0 1 0 1.8l1.5 1.5-2.2 3.8-2-.5a7 7 0 0 1-1.5.9l-.6 2H9.8l-.6-2a7 7 0 0 1-1.5-.9l-2 .5-2.2-3.8L5 13.2a7 7 0 0 1 0-1.8L3.5 9.9l2.2-3.8 2 .5a7 7 0 0 1 1.5-.9z"/><circle cx="12" cy="12.3" r="2.6"/></svg>',
    soporte:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.4h16v10.4H9.2L5.1 19v-3.2H4z"/><path d="M9.9 9.1a2.3 2.3 0 1 1 3.7 1.8c-.8.6-1.5 1-1.5 2.1M12 15.2h.01"/></svg>'
  };

  const style=document.createElement('style');
  style.textContent=`
    .nav-icon{
      width:34px!important;height:34px!important;min-width:34px!important;
      display:inline-grid!important;place-items:center!important;
      border-radius:10px!important;background:#171717!important;
      border:1px solid rgba(201,162,39,.55)!important;
      color:#d4af37!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 3px 10px rgba(0,0,0,.12)!important;
      transition:transform .18s ease,background .18s ease,color .18s ease,border-color .18s ease!important;
      font-size:0!important;line-height:0!important;
    }
    .nav-icon svg{width:19px;height:19px;display:block;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .nav:hover .nav-icon{transform:translateY(-1px);border-color:#d4af37!important}
    .nav.active .nav-icon{background:linear-gradient(145deg,#e0bd4f,#b88718)!important;color:#111!important;border-color:#e5c65b!important;box-shadow:0 5px 14px rgba(201,162,39,.25)!important}
    @media(max-width:760px){.nav-icon{width:31px!important;height:31px!important;min-width:31px!important;border-radius:9px!important}.nav-icon svg{width:18px;height:18px}}
  `;

  function paint(){
    document.querySelectorAll('.nav[data-view]').forEach(btn=>{
      const slot=btn.querySelector('.nav-icon');
      const key=btn.dataset.view;
      if(slot&&icons[key])slot.innerHTML=icons[key];
    });
  }

  function mount(){
    if(!document.getElementById('ceciliaUiIconStyles')){
      style.id='ceciliaUiIconStyles';
      document.head.appendChild(style);
    }
    paint();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
