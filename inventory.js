(()=>{
  // Cecilia Comercial · proveedores e inventario v1
  // Módulo aditivo: mantiene intacta la lógica existente de clientes, ventas, deudas y pagos.
  const previousEmptyState=emptyState;
  emptyState=function(){const s=previousEmptyState();s.suppliers=[];s.products=[];s.inventoryMovements=[];return s};
  if(!Array.isArray(state.suppliers))state.suppliers=[];
  if(!Array.isArray(state.products))state.products=[];
  if(!Array.isArray(state.inventoryMovements))state.inventoryMovements=[];

  const previousNormalizeState=normalizeState;
  normalizeState=function(data){
    const base=previousNormalizeState(data),safe=data&&typeof data==='object'?data:{},stamp=nowIso();
    base.suppliers=Array.isArray(safe.suppliers)?safe.suppliers.map(x=>({
      id:x.id||id(),name:x.name||'',ruc:x.ruc||'',contactName:x.contactName||'',phone:x.phone||'',email:x.email||'',address:x.address||'',notes:x.notes||'',isActive:x.isActive!==false,createdAt:Number(x.createdAt)||Date.now(),updatedAt:x.updatedAt||stamp,deletedAt:x.deletedAt||''
    })):[];
    base.products=Array.isArray(safe.products)?safe.products.map(x=>({
      id:x.id||id(),sku:x.sku||'',name:x.name||'',category:x.category||'',unit:x.unit||'Unidad',cost:Number(x.cost)||0,price:Number(x.price)||0,minStock:Number(x.minStock)||0,notes:x.notes||'',isActive:x.isActive!==false,createdAt:Number(x.createdAt)||Date.now(),updatedAt:x.updatedAt||stamp,deletedAt:x.deletedAt||''
    })):[];
    base.inventoryMovements=Array.isArray(safe.inventoryMovements)?safe.inventoryMovements.map(x=>({
      id:x.id||id(),productId:x.productId||'',supplierId:x.supplierId||'',type:['Entrada','Salida','Ajuste'].includes(x.type)?x.type:'Ajuste',quantity:Number(x.quantity)||0,unitCost:Number(x.unitCost)||0,reference:x.reference||'',notes:x.notes||'',date:x.date||today(),createdAt:Number(x.createdAt)||Date.now(),updatedAt:x.updatedAt||stamp,deletedAt:x.deletedAt||''
    })).filter(x=>x.quantity!==0):[];
    return base;
  };

  function supplierById(sid,includeDeleted=false){return (state.suppliers||[]).find(x=>x.id===sid&&(includeDeleted||!x.deletedAt))}
  function productById(pid,includeDeleted=false){return (state.products||[]).find(x=>x.id===pid&&(includeDeleted||!x.deletedAt))}
  function stockOf(pid){return active(state.inventoryMovements||[]).filter(m=>m.productId===pid).reduce((s,m)=>s+Number(m.quantity||0),0)}
  function lowStockProducts(){return active(state.products||[]).filter(p=>p.isActive!==false&&Number(p.minStock||0)>0&&stockOf(p.id)<=Number(p.minStock||0))}
  function inventoryValue(){return active(state.products||[]).reduce((s,p)=>s+Math.max(0,stockOf(p.id))*Number(p.cost||0),0)}
  function qty(v){return Number(v||0).toLocaleString('es-PY',{maximumFractionDigits:3})}

  function injectInventoryUi(){
    const reportNav=document.querySelector('.nav[data-view="reportes"]');
    if(reportNav&&!document.querySelector('.nav[data-view="proveedores"]')){
      const suppliers=document.createElement('button');suppliers.className='nav';suppliers.dataset.view='proveedores';suppliers.innerHTML='<span class="nav-icon">06</span><span>Proveedores</span>';
      const inventory=document.createElement('button');inventory.className='nav';inventory.dataset.view='inventario';inventory.innerHTML='<span class="nav-icon">07</span><span>Inventario</span>';
      reportNav.parentNode.insertBefore(suppliers,reportNav);reportNav.parentNode.insertBefore(inventory,reportNav);
      const nums={dashboard:'01',clientes:'02',ventas:'03',deudas:'04',pagos:'05',proveedores:'06',inventario:'07',reportes:'08',config:'09'};
      document.querySelectorAll('.nav[data-view]').forEach(x=>{const n=x.querySelector('.nav-icon');if(n&&nums[x.dataset.view])n.textContent=nums[x.dataset.view]});
    }

    const report=document.getElementById('reportes');
    if(report&&!document.getElementById('proveedores')){
      const section=document.createElement('section');section.id='proveedores';section.className='view';section.innerHTML=`
        <div class="page-head"><div><span class="eyebrow">Abastecimiento</span><h2>Proveedores</h2><p>Directorio de proveedores y datos de contacto.</p></div><button class="btn btn-primary" onclick="openSupplierModal()">+ Nuevo proveedor</button></div>
        <div class="panel" style="margin-bottom:18px;padding:16px 18px;border-left:4px solid #c9a227"><strong>Gestión de proveedores</strong><p style="margin:6px 0 0">Registrá cada proveedor una sola vez. Después podrás asociarlo a las entradas de inventario y conservar la referencia de factura, remisión o compra.</p></div>
        <div class="cards report-grid" style="margin-bottom:18px"><article class="card kpi-card"><span class="kpi-label">Proveedores activos</span><strong id="supplierKpiActive">0</strong></article><article class="card kpi-card"><span class="kpi-label">Con compras registradas</span><strong id="supplierKpiUsed">0</strong></article></div>
        <div class="toolbar"><input id="supplierSearch" class="search" placeholder="Buscar por nombre, RUC, contacto o teléfono" aria-label="Buscar proveedores" /></div>
        <div class="table-wrap"><table><thead><tr><th>Proveedor</th><th>RUC</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="suppliersTable"></tbody></table></div>`;
      report.parentNode.insertBefore(section,report);
    }

    if(report&&!document.getElementById('inventario')){
      const section=document.createElement('section');section.id='inventario';section.className='view';section.innerHTML=`
        <div class="page-head"><div><span class="eyebrow">Existencias</span><h2>Inventario</h2><p>Productos, stock, costos y movimientos.</p></div><div class="button-row"><button class="btn btn-secondary" onclick="openMovementModal('Entrada')">+ Entrada</button><button class="btn btn-secondary" onclick="openMovementModal('Salida')">- Salida</button><button class="btn btn-primary" onclick="openProductModal()">+ Producto</button></div></div>
        <div class="cards kpi-grid" style="margin-bottom:18px">
          <article class="card kpi-card"><span class="kpi-label">Productos activos</span><strong id="invKpiProducts">0</strong><small>Catálogo disponible</small></article>
          <article class="card kpi-card"><span class="kpi-label">Stock bajo</span><strong id="invKpiLow">0</strong><small>Igual o menor al mínimo</small></article>
          <article class="card kpi-card"><span class="kpi-label">Valor del inventario</span><strong id="invKpiValue">Gs. 0</strong><small>Stock × costo registrado</small></article>
          <article class="card kpi-card"><span class="kpi-label">Movimientos del mes</span><strong id="invKpiMoves">0</strong><small>Entradas, salidas y ajustes</small></article>
        </div>
        <article class="panel" style="margin-bottom:18px"><div class="panel-head"><div><h3>Productos</h3><p>Catálogo y existencias actuales</p></div><button class="btn btn-secondary btn-small" onclick="openMovementModal('Ajuste')">Ajustar stock</button></div>
          <div class="toolbar"><input id="productSearch" class="search" placeholder="Buscar por producto, código o categoría" aria-label="Buscar inventario" /><select id="stockFilter" class="search" style="max-width:220px"><option value="all">Todos</option><option value="low">Solo stock bajo</option><option value="active">Solo activos</option></select></div>
          <div class="table-wrap embedded"><table><thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Unidad</th><th>Stock</th><th>Mínimo</th><th>Costo</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="productsTable"></tbody></table></div>
        </article>
        <article class="panel"><div class="panel-head"><div><h3>Últimos movimientos</h3><p>Trazabilidad de entradas, salidas y ajustes</p></div><button class="btn btn-secondary btn-small" onclick="openMovementModal('Entrada')">Registrar movimiento</button></div>
          <div class="table-wrap embedded"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Cantidad</th><th>Proveedor</th><th>Costo unit.</th><th>Referencia</th><th>Acciones</th></tr></thead><tbody id="inventoryMovementsTable"></tbody></table></div>
        </article>`;
      report.parentNode.insertBefore(section,report);
    }

    if(!document.getElementById('supplierModal')){
      const dlg=document.createElement('dialog');dlg.id='supplierModal';dlg.innerHTML=`<form method="dialog" id="supplierForm"><div class="modal-head"><span class="eyebrow">Proveedores</span><h3>Nuevo proveedor</h3></div>
        <label>Nombre / Razón social<input required id="supName" /></label><label>RUC<input id="supRuc" /></label><label>Persona de contacto<input id="supContact" /></label><label>Teléfono<input id="supPhone" inputmode="tel" /></label><label>Email<input id="supEmail" type="email" /></label><label>Dirección<input id="supAddress" /></label><label>Observaciones<textarea id="supNotes"></textarea></label><label style="display:flex;align-items:center;gap:10px"><input id="supActive" type="checkbox" checked style="width:auto" /> Proveedor activo</label>
        <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="this.closest('dialog').close()">Cancelar</button><button type="button" class="btn btn-primary" id="saveSupplierBtn">Guardar proveedor</button></div></form>`;document.body.insertBefore(dlg,document.getElementById('authModal'));
    }
    if(!document.getElementById('productModal')){
      const dlg=document.createElement('dialog');dlg.id='productModal';dlg.innerHTML=`<form method="dialog" id="productForm"><div class="modal-head"><span class="eyebrow">Inventario</span><h3>Nuevo producto</h3></div>
        <label>Producto<input required id="prdName" /></label><label>Código / SKU<input id="prdSku" /></label><label>Categoría<input id="prdCategory" placeholder="Ej.: Bebidas, limpieza, alimentos" /></label><label>Unidad<select id="prdUnit"><option>Unidad</option><option>Kg</option><option>g</option><option>Litro</option><option>ml</option><option>Caja</option><option>Paquete</option><option>Bolsa</option><option>Docena</option><option>Otro</option></select></label><label>Costo unitario (Gs.)<input id="prdCost" type="number" min="0" step="1" inputmode="numeric" /></label><label>Precio de venta (Gs.)<input id="prdPrice" type="number" min="0" step="1" inputmode="numeric" /></label><label>Stock mínimo<input id="prdMin" type="number" min="0" step="0.001" inputmode="decimal" /></label><label>Observaciones<textarea id="prdNotes"></textarea></label><label style="display:flex;align-items:center;gap:10px"><input id="prdActive" type="checkbox" checked style="width:auto" /> Producto activo</label>
        <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="this.closest('dialog').close()">Cancelar</button><button type="button" class="btn btn-primary" id="saveProductBtn">Guardar producto</button></div></form>`;document.body.insertBefore(dlg,document.getElementById('authModal'));
    }
    if(!document.getElementById('movementModal')){
      const dlg=document.createElement('dialog');dlg.id='movementModal';dlg.innerHTML=`<form method="dialog" id="movementForm"><div class="modal-head"><span class="eyebrow">Inventario</span><h3>Registrar movimiento</h3></div>
        <label>Tipo<select id="movType"><option>Entrada</option><option>Salida</option><option>Ajuste</option></select></label><label>Producto<select required id="movProduct"></select></label><div id="movCurrent" style="margin:-4px 0 10px;color:#64748b;font-size:13px"></div><label id="movQtyLabel">Cantidad<input required id="movQty" type="number" min="0.001" step="0.001" inputmode="decimal" /></label><label id="movSupplierWrap">Proveedor<select id="movSupplier"></select></label><label id="movCostWrap">Costo unitario (Gs.)<input id="movCost" type="number" min="0" step="1" inputmode="numeric" /></label><label>Fecha<input required id="movDate" type="date" /></label><label>Referencia / factura<input id="movRef" placeholder="Opcional" /></label><label>Observaciones<textarea id="movNotes"></textarea></label>
        <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="this.closest('dialog').close()">Cancelar</button><button type="button" class="btn btn-primary" id="saveMovementBtn">Guardar movimiento</button></div></form>`;document.body.insertBefore(dlg,document.getElementById('authModal'));
    }
  }

  injectInventoryUi();
  let editingSupplierId=null,editingProductId=null;

  function renderSuppliers(){
    const body=document.getElementById('suppliersTable');if(!body)return;
    const q=(document.getElementById('supplierSearch')?.value||'').toLowerCase();
    const arr=active(state.suppliers||[]).filter(s=>[s.name,s.ruc,s.contactName,s.phone,s.email].join(' ').toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name));
    body.innerHTML=arr.length?arr.map(s=>`<tr><td><strong>${esc(s.name)}</strong></td><td>${esc(s.ruc||'-')}</td><td>${esc(s.contactName||'-')}</td><td>${esc(s.phone||'-')}</td><td>${esc(s.email||'-')}</td><td><span class="status ${s.isActive!==false?'ok':'warn'}">${s.isActive!==false?'Activo':'Inactivo'}</span></td><td><div class="row-actions"><button class="btn btn-secondary btn-small" onclick="editSupplier('${s.id}')">Editar</button><button class="btn btn-danger btn-small" onclick="deleteSupplier('${s.id}')">Eliminar</button></div></td></tr>`).join(''):'<tr><td colspan="7" class="empty-row">No hay proveedores registrados.</td></tr>';
    const activeCount=arr.filter(x=>x.isActive!==false).length,used=new Set(active(state.inventoryMovements||[]).map(m=>m.supplierId).filter(Boolean));
    if(document.getElementById('supplierKpiActive'))document.getElementById('supplierKpiActive').textContent=active(state.suppliers||[]).filter(x=>x.isActive!==false).length;
    if(document.getElementById('supplierKpiUsed'))document.getElementById('supplierKpiUsed').textContent=[...used].filter(x=>supplierById(x,true)).length;
  }

  function renderInventory(){
    const body=document.getElementById('productsTable');if(!body)return;
    const q=(document.getElementById('productSearch')?.value||'').toLowerCase(),filter=document.getElementById('stockFilter')?.value||'all';
    let arr=active(state.products||[]).filter(p=>[p.name,p.sku,p.category].join(' ').toLowerCase().includes(q));
    if(filter==='low')arr=arr.filter(p=>p.isActive!==false&&Number(p.minStock||0)>0&&stockOf(p.id)<=Number(p.minStock||0));
    if(filter==='active')arr=arr.filter(p=>p.isActive!==false);
    arr.sort((a,b)=>a.name.localeCompare(b.name));
    body.innerHTML=arr.length?arr.map(p=>{const st=stockOf(p.id),low=p.isActive!==false&&Number(p.minStock||0)>0&&st<=Number(p.minStock||0);return `<tr><td>${esc(p.sku||'-')}</td><td><strong>${esc(p.name)}</strong></td><td>${esc(p.category||'-')}</td><td>${esc(p.unit||'Unidad')}</td><td><strong>${qty(st)}</strong></td><td>${qty(p.minStock)}</td><td>${money(p.cost)}</td><td>${money(p.price)}</td><td><span class="status ${p.isActive===false?'warn':low?'bad':'ok'}">${p.isActive===false?'Inactivo':low?'Stock bajo':'Normal'}</span></td><td><div class="row-actions"><button class="btn btn-secondary btn-small" onclick="openMovementModal('Entrada','${p.id}')">Mover</button><button class="btn btn-secondary btn-small" onclick="editProduct('${p.id}')">Editar</button><button class="btn btn-danger btn-small" onclick="deleteProduct('${p.id}')">Eliminar</button></div></td></tr>`}).join(''):'<tr><td colspan="10" class="empty-row">No hay productos para mostrar.</td></tr>';
    const ym=today().slice(0,7),moves=active(state.inventoryMovements||[]);
    document.getElementById('invKpiProducts').textContent=active(state.products||[]).filter(p=>p.isActive!==false).length;
    document.getElementById('invKpiLow').textContent=lowStockProducts().length;
    document.getElementById('invKpiValue').textContent=money(inventoryValue());
    document.getElementById('invKpiMoves').textContent=moves.filter(m=>String(m.date||'').startsWith(ym)).length;

    const mb=document.getElementById('inventoryMovementsTable');if(!mb)return;
    const last=[...moves].sort((a,b)=>String(b.date).localeCompare(String(a.date))||Number(b.createdAt||0)-Number(a.createdAt||0)).slice(0,50);
    mb.innerHTML=last.length?last.map(m=>{const p=productById(m.productId,true),s=supplierById(m.supplierId,true);return `<tr><td>${fmtDate(m.date)}</td><td><span class="status ${m.type==='Entrada'?'ok':m.type==='Salida'?'warn':'bad'}">${esc(m.type)}</span></td><td>${esc(p?.name||'Producto')}</td><td><strong>${m.quantity>0?'+':''}${qty(m.quantity)}</strong> ${esc(p?.unit||'')}</td><td>${esc(s?.name||'-')}</td><td>${m.unitCost?money(m.unitCost):'-'}</td><td>${esc(m.reference||'-')}</td><td><button class="btn btn-danger btn-small" onclick="deleteInventoryMovement('${m.id}')">Eliminar</button></td></tr>`}).join(''):'<tr><td colspan="8" class="empty-row">No hay movimientos registrados.</td></tr>';
  }

  const previousRenderAll=renderAll;
  renderAll=function(){previousRenderAll();renderSuppliers();renderInventory()};

  window.openSupplierModal=function(){editingSupplierId=null;document.getElementById('supplierForm').reset();document.getElementById('supActive').checked=true;document.querySelector('#supplierModal .modal-head h3').textContent='Nuevo proveedor';document.getElementById('saveSupplierBtn').textContent='Guardar proveedor';document.getElementById('supplierModal').showModal()};
  window.editSupplier=function(sid){const s=supplierById(sid);if(!s)return;editingSupplierId=sid;document.getElementById('supplierForm').reset();document.getElementById('supName').value=s.name;document.getElementById('supRuc').value=s.ruc||'';document.getElementById('supContact').value=s.contactName||'';document.getElementById('supPhone').value=s.phone||'';document.getElementById('supEmail').value=s.email||'';document.getElementById('supAddress').value=s.address||'';document.getElementById('supNotes').value=s.notes||'';document.getElementById('supActive').checked=s.isActive!==false;document.querySelector('#supplierModal .modal-head h3').textContent='Editar proveedor';document.getElementById('saveSupplierBtn').textContent='Guardar cambios';document.getElementById('supplierModal').showModal()};
  function saveSupplier(){const name=document.getElementById('supName').value.trim();if(!name)return alert('Ingresá el nombre del proveedor.');let s=editingSupplierId?supplierById(editingSupplierId,true):null;if(!s){s={id:id(),createdAt:Date.now(),deletedAt:''};state.suppliers.push(s)}Object.assign(s,{name,ruc:document.getElementById('supRuc').value.trim(),contactName:document.getElementById('supContact').value.trim(),phone:document.getElementById('supPhone').value.trim(),email:document.getElementById('supEmail').value.trim(),address:document.getElementById('supAddress').value.trim(),notes:document.getElementById('supNotes').value.trim(),isActive:document.getElementById('supActive').checked,updatedAt:nowIso(),deletedAt:''});persistLocal();queueMutation('suppliers',s.id);editingSupplierId=null;renderAll();scheduleCloudSync();document.getElementById('supplierModal').close()}
  window.deleteSupplier=function(sid){const s=supplierById(sid);if(!s)return;const used=active(state.inventoryMovements||[]).filter(m=>m.supplierId===sid).length;if(!confirm(`¿Eliminar al proveedor “${s.name}”?${used?`\n\nTiene ${used} movimiento(s) histórico(s). Esos movimientos se conservarán.`:''}`))return;softDelete('suppliers',s);persistLocal();renderAll();scheduleCloudSync()};

  window.openProductModal=function(){editingProductId=null;document.getElementById('productForm').reset();document.getElementById('prdUnit').value='Unidad';document.getElementById('prdActive').checked=true;document.querySelector('#productModal .modal-head h3').textContent='Nuevo producto';document.getElementById('saveProductBtn').textContent='Guardar producto';document.getElementById('productModal').showModal()};
  window.editProduct=function(pid){const p=productById(pid);if(!p)return;editingProductId=pid;document.getElementById('productForm').reset();document.getElementById('prdName').value=p.name;document.getElementById('prdSku').value=p.sku||'';document.getElementById('prdCategory').value=p.category||'';document.getElementById('prdUnit').value=p.unit||'Unidad';document.getElementById('prdCost').value=p.cost||0;document.getElementById('prdPrice').value=p.price||0;document.getElementById('prdMin').value=p.minStock||0;document.getElementById('prdNotes').value=p.notes||'';document.getElementById('prdActive').checked=p.isActive!==false;document.querySelector('#productModal .modal-head h3').textContent='Editar producto';document.getElementById('saveProductBtn').textContent='Guardar cambios';document.getElementById('productModal').showModal()};
  function saveProduct(){const name=document.getElementById('prdName').value.trim(),cost=Number(document.getElementById('prdCost').value||0),price=Number(document.getElementById('prdPrice').value||0),minStock=Number(document.getElementById('prdMin').value||0);if(!name)return alert('Ingresá el nombre del producto.');if(cost<0||price<0||minStock<0)return alert('Costo, precio y stock mínimo no pueden ser negativos.');let p=editingProductId?productById(editingProductId,true):null;if(!p){p={id:id(),createdAt:Date.now(),deletedAt:''};state.products.push(p)}Object.assign(p,{name,sku:document.getElementById('prdSku').value.trim(),category:document.getElementById('prdCategory').value.trim(),unit:document.getElementById('prdUnit').value||'Unidad',cost,price,minStock,notes:document.getElementById('prdNotes').value.trim(),isActive:document.getElementById('prdActive').checked,updatedAt:nowIso(),deletedAt:''});persistLocal();queueMutation('products',p.id);editingProductId=null;renderAll();scheduleCloudSync();document.getElementById('productModal').close()}
  window.deleteProduct=function(pid){const p=productById(pid);if(!p)return;const moves=active(state.inventoryMovements||[]).filter(m=>m.productId===pid).length;if(moves)return alert(`No se puede eliminar “${p.name}” porque tiene ${moves} movimiento(s) de inventario. Podés editarlo y marcarlo como inactivo para conservar la trazabilidad.`);if(!confirm(`¿Eliminar el producto “${p.name}”?`))return;softDelete('products',p);persistLocal();renderAll();scheduleCloudSync()};

  function populateMovementOptions(){
    const p=document.getElementById('movProduct'),s=document.getElementById('movSupplier');if(!p||!s)return;
    const products=[...active(state.products||[])].filter(x=>x.isActive!==false).sort((a,b)=>a.name.localeCompare(b.name));
    p.innerHTML='<option value="">Seleccionar...</option>'+products.map(x=>`<option value="${x.id}">${esc(x.name)}${x.sku?' · '+esc(x.sku):''}</option>`).join('');
    const suppliers=[...active(state.suppliers||[])].filter(x=>x.isActive!==false).sort((a,b)=>a.name.localeCompare(b.name));
    s.innerHTML='<option value="">Sin proveedor</option>'+suppliers.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
  }
  function updateMovementUi(){const type=document.getElementById('movType')?.value||'Entrada',pid=document.getElementById('movProduct')?.value,p=productById(pid);const st=pid?stockOf(pid):0;const cur=document.getElementById('movCurrent');if(cur)cur.textContent=pid?`Stock actual: ${qty(st)} ${p?.unit||''}`:'';const label=document.getElementById('movQtyLabel');if(label)label.firstChild.textContent=type==='Ajuste'?'Nuevo stock':'Cantidad';document.getElementById('movSupplierWrap').style.display=type==='Entrada'?'':'none';document.getElementById('movCostWrap').style.display=type==='Entrada'?'':'none'}
  window.openMovementModal=function(type='Entrada',pid=null){if(!active(state.products||[]).some(p=>p.isActive!==false))return alert('Primero registrá al menos un producto activo.');populateMovementOptions();document.getElementById('movementForm').reset();document.getElementById('movType').value=['Entrada','Salida','Ajuste'].includes(type)?type:'Entrada';document.getElementById('movDate').value=today();if(pid)document.getElementById('movProduct').value=pid;const p=productById(pid);if(p)document.getElementById('movCost').value=p.cost||0;updateMovementUi();document.querySelector('#movementModal .modal-head h3').textContent=document.getElementById('movType').value==='Ajuste'?'Ajustar stock':'Registrar '+document.getElementById('movType').value.toLowerCase();document.getElementById('movementModal').showModal()};
  function saveMovement(){const type=document.getElementById('movType').value,pid=document.getElementById('movProduct').value,p=productById(pid),raw=Number(document.getElementById('movQty').value),current=stockOf(pid);if(!p)return alert('Seleccioná un producto.');if(!(raw>=0))return alert('Ingresá una cantidad válida.');let signed=0;if(type==='Entrada'){if(!(raw>0))return alert('La entrada debe ser mayor a cero.');signed=raw}else if(type==='Salida'){if(!(raw>0))return alert('La salida debe ser mayor a cero.');if(raw>current)return alert(`No hay stock suficiente. Stock actual: ${qty(current)} ${p.unit||''}.`);signed=-raw}else{signed=raw-current;if(Math.abs(signed)<0.0000001)return alert('El stock ya coincide con el valor indicado; no hay ajuste que registrar.')}
    const unitCost=type==='Entrada'?Number(document.getElementById('movCost').value||0):0;if(unitCost<0)return alert('El costo no puede ser negativo.');const m={id:id(),productId:pid,supplierId:type==='Entrada'?document.getElementById('movSupplier').value:'',type,quantity:signed,unitCost,reference:document.getElementById('movRef').value.trim(),notes:document.getElementById('movNotes').value.trim(),date:document.getElementById('movDate').value||today(),createdAt:Date.now(),updatedAt:nowIso(),deletedAt:''};state.inventoryMovements.push(m);queueMutation('inventoryMovements',m.id);if(type==='Entrada'&&unitCost>0&&Number(p.cost)!==unitCost){p.cost=unitCost;p.updatedAt=nowIso();queueMutation('products',p.id)}persistLocal();renderAll();scheduleCloudSync();document.getElementById('movementModal').close()}
  window.deleteInventoryMovement=function(mid){const m=(state.inventoryMovements||[]).find(x=>x.id===mid&&!x.deletedAt);if(!m)return;const p=productById(m.productId,true);if(!confirm(`¿Eliminar este movimiento de ${p?.name||'inventario'}?\n\nEl stock será recalculado automáticamente.`))return;softDelete('inventoryMovements',m);persistLocal();renderAll();scheduleCloudSync()};

  const previousBindForms=bindForms;
  bindForms=function(){previousBindForms();document.getElementById('saveSupplierBtn')?.addEventListener('click',e=>{e.preventDefault();saveSupplier()});document.getElementById('saveProductBtn')?.addEventListener('click',e=>{e.preventDefault();saveProduct()});document.getElementById('saveMovementBtn')?.addEventListener('click',e=>{e.preventDefault();saveMovement()});document.getElementById('supplierSearch')?.addEventListener('input',renderSuppliers);document.getElementById('productSearch')?.addEventListener('input',renderInventory);document.getElementById('stockFilter')?.addEventListener('change',renderInventory);document.getElementById('movType')?.addEventListener('change',updateMovementUi);document.getElementById('movProduct')?.addEventListener('change',()=>{const p=productById(document.getElementById('movProduct').value);if(p&&document.getElementById('movType').value==='Entrada')document.getElementById('movCost').value=p.cost||0;updateMovementUi()})};

  const previousLocalToCloud=localToCloud;
  localToCloud=function(table,r){
    if(!['suppliers','products','inventoryMovements'].includes(table))return previousLocalToCloud(table,r);
    const common={id:r.id,user_id:currentUser.id,workspace_id:workspaceId,created_at:new Date(r.createdAt||Date.now()).toISOString(),updated_at:r.updatedAt||nowIso(),deleted_at:r.deletedAt||null};
    if(table==='suppliers')return {...common,name:r.name,ruc:r.ruc||null,contact_name:r.contactName||null,phone:r.phone||null,email:r.email||null,address:r.address||null,notes:r.notes||null,is_active:r.isActive!==false};
    if(table==='products')return {...common,sku:r.sku||null,name:r.name,category:r.category||null,unit:r.unit||'Unidad',cost_price:Number(r.cost)||0,sale_price:Number(r.price)||0,min_stock:Number(r.minStock)||0,notes:r.notes||null,is_active:r.isActive!==false};
    return {...common,product_id:r.productId,supplier_id:r.supplierId||null,movement_type:r.type,quantity:Number(r.quantity),unit_cost:Number(r.unitCost)||0,reference:r.reference||null,notes:r.notes||null,movement_date:r.date};
  };
  const previousCloudToLocal=cloudToLocal;
  cloudToLocal=function(table,r){
    if(!['suppliers','products','inventoryMovements'].includes(table))return previousCloudToLocal(table,r);
    if(table==='suppliers')return {id:r.id,name:r.name||'',ruc:r.ruc||'',contactName:r.contact_name||'',phone:r.phone||'',email:r.email||'',address:r.address||'',notes:r.notes||'',isActive:r.is_active!==false,createdAt:new Date(r.created_at).getTime(),updatedAt:r.updated_at,deletedAt:r.deleted_at||''};
    if(table==='products')return {id:r.id,sku:r.sku||'',name:r.name||'',category:r.category||'',unit:r.unit||'Unidad',cost:Number(r.cost_price)||0,price:Number(r.sale_price)||0,minStock:Number(r.min_stock)||0,notes:r.notes||'',isActive:r.is_active!==false,createdAt:new Date(r.created_at).getTime(),updatedAt:r.updated_at,deletedAt:r.deleted_at||''};
    return {id:r.id,productId:r.product_id,supplierId:r.supplier_id||'',type:r.movement_type,quantity:Number(r.quantity)||0,unitCost:Number(r.unit_cost)||0,reference:r.reference||'',notes:r.notes||'',date:r.movement_date,createdAt:new Date(r.created_at).getTime(),updatedAt:r.updated_at,deletedAt:r.deleted_at||''};
  };
  const previousStateArray=stateArray;
  stateArray=function(table){if(table==='suppliers')return state.suppliers;if(table==='products')return state.products;if(table==='inventoryMovements')return state.inventoryMovements;return previousStateArray(table)};
  const previousMergeRemote=mergeRemote;
  mergeRemote=function(table,rows,full=false){if(!['suppliers','products','inventoryMovements'].includes(table))return previousMergeRemote(table,rows,full);const incoming=(rows||[]).map(r=>cloudToLocal(table,r));if(full){if(table==='suppliers')state.suppliers=incoming;if(table==='products')state.products=incoming;if(table==='inventoryMovements')state.inventoryMovements=incoming;return}const map=new Map((stateArray(table)||[]).map(x=>[x.id,x]));for(const r of incoming)map.set(r.id,r);const merged=[...map.values()];if(table==='suppliers')state.suppliers=merged;if(table==='products')state.products=merged;if(table==='inventoryMovements')state.inventoryMovements=merged};

  pushQueue=async function(){
    const q=readQueue();if(!q.length)return true;
    const tables=['clients','debts','payments','sales','suppliers','products','inventoryMovements'];
    const db={clients:'cecilia_clients',debts:'cecilia_debts',payments:'cecilia_payments',sales:'cecilia_sales',suppliers:'cecilia_suppliers',products:'cecilia_products',inventoryMovements:'cecilia_inventory_movements'};
    for(const table of tables){const items=q.filter(x=>x.table===table);if(!items.length)continue;const arr=stateArray(table);const rows=items.map(x=>arr.find(r=>r.id===x.id)).filter(Boolean).map(r=>localToCloud(table,r));if(!rows.length){removeQueued(items);continue}const {error}=await sb.from(db[table]).upsert(rows,{onConflict:'id'});if(error)throw error;removeQueued(items)}
    return readQueue().length===0;
  };
  pullChanges=async function(forceFull=false){const since=forceFull?null:localStorage.getItem(pullKey());const {data,error}=await sb.rpc('cecilia_pull_changes',{p_workspace:workspaceId,p_since:since||null});if(error)throw error;const b=data||{};mergeRemote('clients',b.clients||[],!since);mergeRemote('debts',b.debts||[],!since);mergeRemote('payments',b.payments||[],!since);mergeRemote('sales',b.sales||[],!since);mergeRemote('suppliers',b.suppliers||[],!since);mergeRemote('products',b.products||[],!since);mergeRemote('inventoryMovements',b.inventory_movements||[],!since);persistLocal();if(b.server_time)localStorage.setItem(pullKey(),b.server_time);renderAll()};
  createCloudBackup=async function(force=false){if(!currentUser||!workspaceId||!navigator.onLine||!sb)return;const last=Number(localStorage.getItem(backupKey())||0);if(!force&&Date.now()-last<BACKUP_INTERVAL)return;const snapshot={version:4,workspaceId,clients:state.clients,debts:state.debts,payments:state.payments,sales:state.sales||[],suppliers:state.suppliers||[],products:state.products||[],inventoryMovements:state.inventoryMovements||[]};const {error}=await sb.from('cecilia_backups').insert({user_id:currentUser.id,workspace_id:workspaceId,snapshot});if(error)throw error;localStorage.setItem(backupKey(),String(Date.now()));const {data}=await sb.from('cecilia_backups').select('id').eq('workspace_id',workspaceId).order('created_at',{ascending:false}).range(20,100);if(data?.length)await sb.from('cecilia_backups').delete().in('id',data.map(x=>x.id))};

  exportData=function(){const blob=new Blob([JSON.stringify({version:4,workspaceId,exportedAt:nowIso(),...state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='cecilia-comercial-respaldo-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
  const previousExportExcel=exportExcel;
  exportExcel=function(){
    if(typeof XLSX==='undefined')return previousExportExcel();
    const proveedores=active(state.suppliers||[]).map(s=>({Proveedor:s.name,RUC:s.ruc||'',Contacto:s.contactName||'',Teléfono:s.phone||'',Email:s.email||'',Dirección:s.address||'',Estado:s.isActive!==false?'Activo':'Inactivo',Observaciones:s.notes||''}));
    const inventario=active(state.products||[]).map(p=>({Código:p.sku||'',Producto:p.name,Categoría:p.category||'',Unidad:p.unit||'Unidad',Stock:stockOf(p.id),'Stock mínimo':Number(p.minStock)||0,'Costo unitario':Number(p.cost)||0,'Precio de venta':Number(p.price)||0,'Valor inventario':Math.max(0,stockOf(p.id))*Number(p.cost||0),Estado:p.isActive!==false?'Activo':'Inactivo'}));
    const movimientos=active(state.inventoryMovements||[]).map(m=>({Fecha:fmtDate(m.date),Tipo:m.type,Producto:productById(m.productId,true)?.name||'',Cantidad:Number(m.quantity)||0,Unidad:productById(m.productId,true)?.unit||'',Proveedor:supplierById(m.supplierId,true)?.name||'','Costo unitario':Number(m.unitCost)||0,Referencia:m.reference||'',Observaciones:m.notes||''}));
    const originalWrite=XLSX.writeFile;let captured=null;XLSX.writeFile=(wb,name)=>{captured={wb,name}};try{previousExportExcel()}finally{XLSX.writeFile=originalWrite}if(!captured)return;const add=(rows,name,widths)=>{const ws=XLSX.utils.json_to_sheet(rows.length?rows:[{'Sin datos':''}]);ws['!cols']=widths.map(w=>({wch:w}));XLSX.utils.book_append_sheet(captured.wb,ws,name)};add(proveedores,'Proveedores',[28,18,24,18,28,30,12,35]);add(inventario,'Inventario',[16,28,20,12,14,14,18,18,20,12]);add(movimientos,'Movimientos inventario',[14,12,28,14,12,28,18,22,35]);originalWrite(captured.wb,captured.name)
  };

  applyReplacementSnapshot=function(snapshot){const incoming=normalizeState(snapshot),stamp=nowIso(),tables=['clients','debts','payments','sales','suppliers','products','inventoryMovements'],ids={};tables.forEach(t=>ids[t]=new Set((incoming[t]||[]).map(x=>x.id)));for(const table of tables){const existing=stateArray(table),next=incoming[table]||[];for(const r of existing){if(!ids[table].has(r.id)&&!r.deletedAt){r.deletedAt=stamp;r.updatedAt=stamp;queueMutation(table,r.id)}}for(const r of next){r.deletedAt=r.deletedAt||'';r.updatedAt=stamp;const idx=existing.findIndex(x=>x.id===r.id);if(idx>=0)existing[idx]=r;else existing.push(r);queueMutation(table,r.id)}}persistLocal();renderAll();scheduleCloudSync()};

  resetData=async function(){const tables=['clients','debts','payments','sales','suppliers','products','inventoryMovements'];if(!tables.some(t=>active(stateArray(t)||[]).length))return alert('No hay datos para borrar.');if(!confirm('ATENCIÓN: vas a eliminar todos los clientes, ventas, deudas, pagos, proveedores e inventario. Se creará una copia recuperable antes de continuar.'))return;if(prompt('Escribí BORRAR en mayúsculas para continuar.')!=='BORRAR')return alert('Eliminación cancelada.');if(navigator.onLine)try{await createCloudBackup(true)}catch(err){console.error(err);if(!confirm('No se pudo crear la copia en la nube. ¿Continuar de todos modos?'))return}const stamp=nowIso();for(const table of tables){for(const r of active(stateArray(table)||[])){r.deletedAt=stamp;r.updatedAt=stamp;queueMutation(table,r.id)}}persistLocal();currentClientId=null;renderAll();goView('dashboard');scheduleCloudSync();alert('Datos marcados como eliminados. La eliminación se sincronizará de forma segura.')};
})();