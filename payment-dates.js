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
    // Mostrar cuánto se abonó a cada deuda con la regla existente:
    // los pagos del cliente se aplican primero a las deudas más antiguas.
    const headersAfterDate=table.querySelectorAll('thead th');
    if(!table.querySelector('th[data-applied-payment]')){
      const th=document.createElement('th');
      th.dataset.appliedPayment='true';
      th.textContent='Abonado';
      th.title='Importe aplicado por antigüedad de las deudas del cliente.';
      headersAfterDate[6]?.before(th);
    }
    debts.forEach((d,i)=>{
      const row=rows[i];
      if(!row)return;
      const remaining=debtRemaining(d);
      const amount=Math.max(0,Number(d.amount)||0);
      const applied=Math.min(amount,Math.max(0,amount-remaining));
      const paidCell=document.createElement('td');
      paidCell.textContent=money(applied);
      paidCell.title='Abonos distribuidos automáticamente desde los pagos del cliente, comenzando por la deuda más antigua.';
      row.children[6]?.before(paidCell);
      const statusCell=row.children[8];
      const status=statusCell?.querySelector('.status');
      if(status&&applied>0&&remaining>0){
        const overdue=!!(d.due&&d.due<today());
        status.className='status '+(overdue?'bad':'partial');
        status.textContent=overdue?'Parcial vencida':'Pago parcial';
        status.title='Recibió abonos y todavía tiene saldo pendiente.';
      }
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
    // El detalle se calcula sin generar ni modificar pagos.
    const clientDebts=active(state.debts).filter(d=>d.clientId===client.id)
      .sort((a,b)=>String(a.date).localeCompare(String(b.date))||(a.createdAt||0)-(b.createdAt||0));
    let detail=document.getElementById('clientDebtPayments');
    if(!detail){
      detail=document.createElement('article');
      detail.id='clientDebtPayments';
      detail.className='panel';
      const ledger=document.getElementById('detailLedger')?.closest('article');
      if(ledger)ledger.insertAdjacentElement('beforebegin',detail);
      else summary.insertAdjacentElement('afterend',detail);
    }
    const title=document.createElement('h3');
    title.textContent='Estado de pagos por deuda';
    const note=document.createElement('p');
    note.className='cc-debt-note';
    note.textContent='Los abonos del cliente se aplican automáticamente a las deudas más antiguas. No existe una asignación manual por deuda.';
    detail.replaceChildren(title,note);
    if(clientDebts.length){
      const wrapper=document.createElement('div');
      wrapper.className='table-wrap embedded';
      const table=document.createElement('table');
      const head=document.createElement('thead');
      head.innerHTML='<tr><th>Inicio</th><th>Concepto</th><th>Monto</th><th>Abonado</th><th>Por cobrar</th><th>Estado</th></tr>';
      const body=document.createElement('tbody');
      for(const d of clientDebts){
        const amount=Math.max(0,Number(d.amount)||0);
        const remaining=debtRemaining(d);
        const applied=Math.min(amount,Math.max(0,amount-remaining));
        const label=remaining===0?'Pagada':applied>0?(d.due&&d.due<today()?'Parcial vencida':'Pago parcial'):(d.due&&d.due<today()?'Vencida':'Pendiente');
        const tr=document.createElement('tr');
        for(const value of [fmtDate(d.date),d.concept,money(amount),money(applied),money(remaining),label]){
          const td=document.createElement('td');td.textContent=value;tr.appendChild(td);
        }
        body.appendChild(tr);
      }
      table.append(head,body);wrapper.appendChild(table);detail.appendChild(wrapper);
    } else {
      const empty=document.createElement('p');empty.className='muted';empty.textContent='Sin deudas registradas.';detail.appendChild(empty);
    }
  };
})();