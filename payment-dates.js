/* Fechas de la cuenta: solo presentación, sin cambios a los registros. */
(function(){
  function clientDates(cid){
    const debts=active(state.debts).filter(x=>x.clientId===cid&&x.date);
    const pays=active(state.payments).filter(x=>x.clientId===cid&&x.date);
    return {
      initial:debts.reduce((v,x)=>!v||x.date<v?x.date:v,''),
      last:pays.reduce((v,x)=>!v||x.date>v?x.date:v,'')
    };
  }
  const renderDebtsOriginal=renderDebts;
  renderDebts=function(){
    renderDebtsOriginal();
    const table=document.getElementById('debtsTable')?.closest('table');
    if(!table)return;
    const headings=table.querySelectorAll('thead th');
    if(headings[2])headings[2].textContent='Inicio de deuda';
    if(!table.querySelector('th[data-last-payment]')){
      const th=document.createElement('th');
      th.dataset.lastPayment='true';
      th.textContent='Último pago del cliente';
      th.title='Fecha del último pago registrado del cliente, no necesariamente de esta deuda.';
      headings[3]?.before(th);
    }
    const debts=[...active(state.debts)].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const rows=[...table.querySelectorAll('tbody tr')];
    if(!debts.length){const cell=table.querySelector('tbody .empty-row');if(cell)cell.colSpan=9;return;}
    const last=new Map();
    for(const d of debts)if(!last.has(d.clientId))last.set(d.clientId,clientDates(d.clientId).last);
    debts.forEach((d,i)=>{
      const cell=document.createElement('td');
      const date=last.get(d.clientId);
      cell.textContent=date?fmtDate(date):'Sin pagos';
      cell.title='Último pago del cliente; los pagos actuales no están asignados por deuda.';
      if(!date)cell.className='muted';
      rows[i]?.children[3]?.before(cell);
    });
  };
  const renderDetailOriginal=renderClientDetail;
  renderClientDetail=function(){
    renderDetailOriginal();
    const client=clientById(currentClientId);
    if(!client)return;
    const meta=document.getElementById('detailMeta');
    if(!meta)return;
    let summary=document.getElementById('clientDatesSummary');
    if(!summary){
      summary=document.createElement('div');
      summary.id='clientDatesSummary';
      summary.style.cssText='display:flex;gap:12px;flex-wrap:wrap;margin-top:12px;font-size:13px';
      meta.insertAdjacentElement('afterend',summary);
    }
    const dates=clientDates(client.id);
    summary.replaceChildren();
    for(const [label,value] of [
      ['Primera deuda registrada',dates.initial?fmtDate(dates.initial):'Sin deudas'],
      ['Último pago del cliente',dates.last?fmtDate(dates.last):'Sin pagos']
    ]){
      const pill=document.createElement('span');
      pill.style.cssText='display:inline-flex;gap:6px;align-items:center;border:1px solid #e7dcc2;border-radius:9px;padding:7px 10px;background:#fff';
      const bold=document.createElement('strong');
      bold.textContent=label+':';
      const span=document.createElement('span');
      span.textContent=value;
      pill.append(bold,span);
      summary.append(pill);
    }
  };
})();