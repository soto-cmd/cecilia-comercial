(()=>{
  function monthKey(date){return String(date||'').slice(0,7)}
  function monthLabel(ym){
    const [y,m]=ym.split('-').map(Number);
    return new Intl.DateTimeFormat('es-PY',{month:'short',year:'numeric'}).format(new Date(y,m-1,1)).replace('.','');
  }
  function monthIncome(ym){
    const cash=(active(state.sales||[])).filter(v=>v.type==='Contado'&&monthKey(v.date)===ym).reduce((s,v)=>s+Number(v.amount||0),0);
    const collections=active(state.payments||[]).filter(p=>monthKey(p.date)===ym).reduce((s,p)=>s+Number(p.amount||0),0);
    return {cash,collections,total:cash+collections};
  }
  function recentMonths(count=6){
    const d=new Date();const out=[];
    for(let i=count-1;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);out.push(`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`)}
    return out;
  }
  function ensureIncomeDashboard(){
    const dash=document.getElementById('dashboard');if(!dash)return;
    const cards=dash.querySelector('.kpi-grid');if(cards&&!document.getElementById('kpiIngresoMes')){
      const card=document.createElement('article');card.className='card kpi-card kpi-income';
      card.innerHTML='<span class="kpi-label">Ingresos del mes</span><strong id="kpiIngresoMes">Gs. 0</strong><small>Contado + cobros recibidos, sin duplicar ventas a crédito</small>';
      cards.insertBefore(card,cards.firstChild);
    }
    if(!document.getElementById('incomeDashboard')){
      const grid=dash.querySelector('.grid-2');
      const panel=document.createElement('article');panel.id='incomeDashboard';panel.className='panel';panel.style.marginBottom='18px';
      panel.innerHTML=`<div class="panel-head"><div><h3>Ingresos mensuales</h3><p>Dinero efectivamente ingresado al negocio</p></div></div>
        <div class="cards report-grid" style="margin-bottom:16px">
          <article class="card kpi-card kpi-income"><span class="kpi-label">Ventas al contado</span><strong id="incomeCash">Gs. 0</strong></article>
          <article class="card kpi-card kpi-paid"><span class="kpi-label">Cobros de créditos/deudas</span><strong id="incomeCollections">Gs. 0</strong></article>
          <article class="card kpi-card kpi-income"><span class="kpi-label">Ingreso total</span><strong id="incomeTotal">Gs. 0</strong></article>
        </div>
        <div id="incomeHistory"></div>`;
      if(grid)dash.insertBefore(panel,grid);else dash.appendChild(panel);
    }
  }
  function renderIncomeDashboard(){
    ensureIncomeDashboard();
    const ym=today().slice(0,7),cur=monthIncome(ym);
    const set=(id,v)=>{const n=document.getElementById(id);if(n)n.textContent=money(v)};
    set('kpiIngresoMes',cur.total);set('incomeCash',cur.cash);set('incomeCollections',cur.collections);set('incomeTotal',cur.total);
    const months=recentMonths(6),data=months.map(m=>({m,...monthIncome(m)})),max=Math.max(1,...data.map(x=>x.total));
    const box=document.getElementById('incomeHistory');if(!box)return;
    const maxVal=Math.max(1,...data.map(x=>Math.max(x.total,x.cash,x.collections)));
    const points=data.map((x,i)=>[35+i*112,145-125*x.total/maxVal]);
    const line=points.map(p=>p.join(",")).join(" ");
    const columns=data.map(x=>{
      const bars=[["cash","#5d9f75"],["collections","#5999c8"]].map(([k,color])=>"<span style=\"height:"+Math.max(x[k]?3:0,x[k]/maxVal*100)+"%;background:"+color+"\"></span>").join("");
      return "<div class=\"cc-income-month\" title=\""+monthLabel(x.m)+": contado "+money(x.cash)+", cobros "+money(x.collections)+", total "+money(x.total)+"\"><div class=\"cc-income-pair\">"+bars+"</div><small>"+monthLabel(x.m)+"</small></div>";
    }).join("");
    box.innerHTML="<div class=\"cc-income-legend\"><span>● Contado</span><span>● Cobros</span><span>● Total</span></div><div class=\"cc-income-chart\"><svg class=\"cc-income-line\" viewBox=\"0 0 630 165\" preserveAspectRatio=\"none\" role=\"img\" aria-label=\"Tendencia de ingresos totales\"><polyline points=\""+line+"\" fill=\"none\" stroke=\"#c9a227\" stroke-width=\"3\" vector-effect=\"non-scaling-stroke\"/></svg><div class=\"cc-income-columns\">"+columns+"</div></div><p class=\"cc-income-note\">Ingresos = ventas al contado + cobros recibidos. Las ventas a crédito se contabilizan cuando se cobran.</p>";
  }

  const previousRenderAll=renderAll;
  renderAll=function(){previousRenderAll();renderIncomeDashboard()};
  document.addEventListener('DOMContentLoaded',renderIncomeDashboard);

  function linkedSaleByDebt(did){return active(state.sales||[]).find(v=>v.type==='Crédito'&&v.debtId===did)}
  function paidOnLinkedSale(sale){
    if(!sale?.debtId)return 0;
    const debt=state.debts.find(d=>d.id===sale.debtId&&!d.deletedAt);if(!debt)return 0;
    return Math.max(0,Number(debt.amount||0)-Number(debtRemaining(debt)||0));
  }

  // Las deudas generadas por ventas a crédito se administran desde la venta original.
  const originalEditDebt=editDebt;
  editDebt=function(did){
    const sale=linkedSaleByDebt(did);
    if(sale){
      alert('Esta deuda está vinculada a una venta a crédito. Para mantener los datos consistentes, editá la venta original.');
      return window.editSale?.(sale.id);
    }
    return originalEditDebt(did);
  };

  const originalDeleteDebt=deleteDebt;
  deleteDebt=function(did){
    const sale=linkedSaleByDebt(did);
    if(sale){
      alert('Esta deuda pertenece a una venta a crédito. Si necesitás eliminarla, se gestionará desde la venta original para no dejar movimientos huérfanos.');
      return window.deleteSale?.(sale.id);
    }
    return originalDeleteDebt(did);
  };

  // Seguimiento del registro que se está editando para proteger ventas ya cobradas.
  let protectedEditingSaleId=null;
  const originalOpenSale=window.openSaleModal;
  window.openSaleModal=function(cid=null){protectedEditingSaleId=null;return originalOpenSale?.(cid)};
  const originalEditSale=window.editSale;
  window.editSale=function(sid){protectedEditingSaleId=sid;return originalEditSale?.(sid)};

  const originalDeleteSale=window.deleteSale;
  window.deleteSale=function(sid){
    const sale=(state.sales||[]).find(v=>v.id===sid&&!v.deletedAt);
    const paid=paidOnLinkedSale(sale);
    if(paid>0){
      return alert(`Esta venta ya tiene ${money(paid)} cobrado. Para evitar saldos e ingresos incorrectos, primero revertí/eliminá el cobro correspondiente y luego eliminá la venta.`);
    }
    return originalDeleteSale?.(sid);
  };

  document.addEventListener('DOMContentLoaded',()=>{
    const btn=document.getElementById('saveSaleBtn');if(!btn)return;
    btn.addEventListener('click',e=>{
      if(!protectedEditingSaleId)return;
      const sale=(state.sales||[]).find(v=>v.id===protectedEditingSaleId&&!v.deletedAt);if(!sale||sale.type!=='Crédito')return;
      const paid=paidOnLinkedSale(sale);if(!(paid>0))return;
      const newClient=document.getElementById('sClient')?.value||'';
      const newAmount=Number(document.getElementById('sAmount')?.value||0);
      const newDate=document.getElementById('sDate')?.value||'';
      const newType=document.getElementById('sType')?.value||'';
      const protectedChange=newClient!==sale.clientId||newDate!==sale.date||newType!=='Crédito'||newAmount<paid;
      if(protectedChange){
        e.preventDefault();e.stopImmediatePropagation();
        alert(`Esta venta ya tiene ${money(paid)} cobrado. Podés corregir el concepto, vencimiento o aumentar el monto, pero no cambiar cliente, fecha, pasarla a contado ni reducir el monto por debajo de lo ya cobrado. Para hacerlo, primero revertí el cobro.`);
      }
    },true);
  });
})();
