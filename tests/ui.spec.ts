import {test,expect,type Page} from '@playwright/test';
import JSZip from 'jszip';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import type {AppState} from '../src/domain/types';

const date=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

async function enterDemo(page:Page) {
  const start=page.getByRole('button',{name:'Probar con datos de ejemplo',exact:true});
  if(await start.isVisible())await start.click();
  await expect(page.getByRole('link',{name:'Pedidos',exact:true}).filter({visible:true}).first()).toBeVisible();
}
async function route(page:Page,path:string) {await page.goto('/#'+path);await enterDemo(page);}
async function savedState(page:Page):Promise<AppState> {
  return page.evaluate(()=>new Promise<AppState>((resolve,reject)=>{const request=indexedDB.open('mabell-ramos-example',1);request.onerror=()=>reject(new Error('No se pudo leer el ejemplo'));request.onsuccess=()=>{const database=request.result,tx=database.transaction('demo','readonly'),get=tx.objectStore('demo').get('state');get.onsuccess=()=>{resolve(get.result as AppState);database.close();};get.onerror=()=>reject(new Error('Falta el registro guardado'));};}));
}
async function accept(page:Page) {
  await page.getByRole('button',{name:'Revisar y confirmar',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Canal y referencia de aceptación').fill('Aceptación ficticia por WhatsApp para esta prueba');
  await dialog.getByRole('checkbox',{name:/Revisé compras, preparación, empaque/}).check();
  await dialog.getByRole('button',{name:'Confirmar compromiso',exact:true}).click();
  await expect(dialog).not.toBeVisible();
}
async function finishOrder(page:Page) {
  await page.getByRole('tab',{name:'3. Condiciones'}).click();
  await page.getByLabel('Forma de entrega').selectOption('Retiro');
  await page.getByLabel('Fecha',{exact:true}).fill(date());
  await page.getByLabel('Lugar',{exact:true}).fill('Lugar ficticio de retiro');
  await page.getByLabel('Condiciones de pago').fill('Pago al retirar; el cobro real se registra por separado.');
  await page.getByLabel('Personalización y cambios admitidos').fill('Cambios requieren revisar y aceptar nuevamente el acuerdo.');
  await page.getByRole('tab',{name:'4. Resumen'}).click();
  await page.getByRole('button',{name:'Guardar borrador / cambios',exact:true}).click();
  await expect(page.getByRole('button',{name:'Revisar y confirmar',exact:true})).toBeVisible();
  await accept(page);
}
async function assertNoPageOverflow(page:Page) {
  const sizes=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:window.innerWidth}));
  expect(sizes.page).toBeLessThanOrEqual(sizes.viewport+1);
}

test('consulta, pedido, entrega y cobro son independientes y sobreviven a recargar',async({page})=>{
  await route(page,'/consultas/nueva');
  const before=await savedState(page);
  await page.getByLabel('Nombre o referencia del contacto').fill('Cliente ficticio de prueba');
  await page.getByLabel('Resumen',{exact:true}).fill('Solicita dos cajas para una ocasión de regalo.');
  await page.getByRole('combobox',{name:'Qué solicita',exact:true}).selectOption('Productos');
  await page.getByRole('button',{name:'Guardar consulta',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Cliente ficticio de prueba',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Preparar pedido',exact:true}).click();
  await page.getByRole('tab',{name:'2. Contenido'}).click();
  await page.getByRole('button',{name:'Añadir una línea específica',exact:true}).click();
  await page.getByLabel('Producto u opción',{exact:true}).fill('Caja ficticia de doce chocotejas');
  await page.getByLabel('Cantidad de unidades de venta').fill('2');
  await page.getByLabel('Unidad de venta',{exact:true}).fill('caja');
  await page.getByLabel('Productos dentro de cada unidad de venta').fill('12');
  await page.getByLabel('Precio cotizado (S/)').fill('20.00');
  await page.getByLabel('Producto u opción',{exact:true}).click();
  await finishOrder(page);
  let state=await savedState(page);
  const order=state.orders.find(o=>o.contactName==='Cliente ficticio de prueba')!;
  expect(order.total).toBe(4000);expect(order.status).toBe('Confirmado');
  expect(state.sales.length).toBe(before.sales.length);expect(state.money.length).toBe(before.money.length);
  await page.getByRole('button',{name:'Registrar entrega',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Registrar realizado',exact:true}).click();
  state=await savedState(page);
  expect(state.sales.filter(s=>s.orderId===order.id)).toHaveLength(1);
  expect(state.money.filter(m=>m.allocations.some(a=>a.entityId===order.id))).toHaveLength(0);
  await page.getByRole('link',{name:'Registrar cobro',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Cobro',exact:true});
  await dialog.getByRole('combobox',{name:/^Cuenta de destino/}).selectOption({label:'Caja de ejemplo'});
  await dialog.getByLabel('Medio de pago',{exact:true}).fill('Efectivo');
  await dialog.getByRole('button',{name:'Registrar operación',exact:true}).click();
  await expect(dialog).not.toBeVisible();
  state=await savedState(page);
  expect(state.money.filter(m=>m.allocations.some(a=>a.entityId===order.id))).toHaveLength(1);
  expect(state.money.find(m=>m.allocations.some(a=>a.entityId===order.id))?.amount).toBe(4000);
  await route(page,'/pedidos/'+order.id);
  await expect(page.getByRole('heading',{name:order.code,exact:true})).toBeVisible();
  await expect(page.getByText(/S\/\s*0[.,]00 pendiente/).first()).toBeVisible();
  const after=await savedState(page);
  expect(after.sales.filter(s=>s.orderId===order.id)).toHaveLength(1);
  expect(after.money.filter(m=>m.allocations.some(a=>a.entityId===order.id))).toHaveLength(1);
  const pdfReady=page.waitForEvent('download');
  await page.getByRole('button',{name:'Descargar acuerdo PDF',exact:true}).click();
  const pdf=await pdfReady, pdfPath=await pdf.path();
  expect((await readFile(pdfPath!)).subarray(0,5).toString()).toBe('%PDF-');
  await assertNoPageOverflow(page);
});

test('el precio maestro nuevo no altera el contenido ni el precio de un pedido aceptado',async({page})=>{
  await route(page,'/pedidos/nuevo');
  await page.getByLabel('Nombre o institución',{exact:true}).fill('Cliente ficticio de precio anterior');
  await page.getByRole('tab',{name:'2. Contenido'}).click();
  const state=await savedState(page),reference=state.products.find(p=>p.name==='Alfajores clásicos · ejemplo')!;
  await page.getByLabel('Añadir desde Productos y precios').selectOption('product:'+reference.id);
  await page.getByRole('button',{name:'Añadir',exact:true}).click();
  await page.getByLabel('Cantidad de unidades de venta').fill('2');
  await finishOrder(page);
  const agreed=(await savedState(page)).orders.find(o=>o.contactName==='Cliente ficticio de precio anterior')!;
  expect(agreed.total).toBe(2000);
  await route(page,'/productos/'+reference.id);
  await page.getByLabel('Importe publicado / acordado en soles').fill('15.00');
  await page.getByLabel('Motivo de la revisión',{exact:true}).fill('Nueva tarifa ficticia; los acuerdos existentes se conservan.');
  await page.getByRole('button',{name:'Guardar ficha',exact:true}).click();
  await expect.poll(async()=>(await savedState(page)).products.find(p=>p.id===reference.id)?.price).toBe(1500);
  const after=await savedState(page);
  expect(after.orders.find(o=>o.id===agreed.id)).toEqual(agreed);
  await route(page,'/pedidos/'+agreed.id);
  await expect(page.getByText(/S\/\s*20[.,]00/).first()).toBeVisible();
  await assertNoPageOverflow(page);
});

test('la venta anónima de feria guarda entrega y cobro juntos sin inventar clientes',async({page})=>{
  await route(page,'/ferias');
  const before=await savedState(page);
  await page.getByRole('button',{name:'Nueva jornada',exact:true}).click();
  let dialog=page.getByRole('dialog');
  await dialog.getByLabel('Nombre',{exact:true}).fill('Feria ficticia de prueba');
  await dialog.getByLabel('Lugar',{exact:true}).fill('Lugar de ejemplo');
  await dialog.getByRole('button',{name:'Crear jornada',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Feria ficticia de prueba',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Venta rápida',exact:true}).click();
  dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Venta específica',exact:true}).click();
  await dialog.getByLabel('Nombre / presentación',{exact:true}).fill('Alfajor ficticio para prueba');
  await dialog.getByLabel('Cantidad',{exact:true}).fill('3');
  await dialog.getByLabel(/Precio por 1 unidad/).fill('5.00');
  await dialog.getByLabel('Dinero recibido ahora (S/)').fill('15.00');
  await dialog.getByLabel('Medio del cobro').selectOption('Efectivo');
  await dialog.getByLabel('Dónde quedó el dinero').selectOption({label:'Caja de ejemplo'});
  await dialog.getByRole('checkbox',{name:/El cliente recibió este contenido/}).check();
  await dialog.getByRole('button',{name:'Guardar venta y cobro',exact:true}).click();
  await expect(dialog).not.toBeVisible();
  const state=await savedState(page),fair=state.fairs.find(f=>f.name==='Feria ficticia de prueba')!;
  const order=state.orders.find(o=>o.eventId===fair.id)!;
  expect(state.clients.length).toBe(before.clients.length);expect(state.inquiries.length).toBe(before.inquiries.length);
  expect(order.clientId).toBeNull();expect(order.status).toBe('Entregado');expect(order.total).toBe(1500);
  expect(state.sales.filter(s=>s.orderId===order.id)).toHaveLength(1);
  expect(state.money.filter(m=>m.allocations.some(a=>a.entityId===order.id))).toHaveLength(1);
  await route(page,'/ferias/'+fair.id);
  await expect(page.getByText('Venta sin cliente identificado',{exact:false}).first()).toBeVisible();
  const refreshed=await savedState(page);
  expect(refreshed.orders.filter(o=>o.eventId===fair.id)).toHaveLength(1);
  expect(refreshed.money.length).toBe(state.money.length);
  await assertNoPageOverflow(page);
});

test('un formulario pendiente permanece como borrador y no entra en ventas ni cobros',async({page})=>{
  await route(page,'/consultas/nueva');
  const before=await savedState(page);
  await page.getByLabel('Nombre o referencia del contacto').fill('Contacto ficticio aún sin guardar');
  await page.getByLabel('Resumen',{exact:true}).fill('Aún falta precisar esta solicitud.');
  page.once('dialog',dialog=>dialog.accept());
  await page.reload();await enterDemo(page);
  await expect(page.getByLabel('Nombre o referencia del contacto')).toHaveValue('Contacto ficticio aún sin guardar');
  const after=await savedState(page);
  expect(after.inquiries.length).toBe(before.inquiries.length);expect(after.sales.length).toBe(before.sales.length);expect(after.money.length).toBe(before.money.length);
  await assertNoPageOverflow(page);
});


test('una copia completa recupera los originales y rechaza un archivo alterado',async({page})=>{
  await route(page,'/ajustes');
  const current=await savedState(page);
  const original='Comprobante ficticio de recuperación. Calidad original sin cambios.';
  const bytes=Buffer.from(original),hash=createHash('sha256').update(bytes).digest('hex');
  const path='demo/qa-original/comprobante.txt';
  const attachment={id:'archivo-ficticio-qa',revision:1,createdAt:current.updatedAt,updatedAt:current.updatedAt,name:'comprobante.txt',mime:'text/plain',size:bytes.length,path,entityType:'orders',entityId:current.orders[0].id,sha:'demo',hash,uploadedBy:'Ana · demostración'};
  await page.evaluate(async({attachment,text})=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('mabell-ramos-example',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    const state=await new Promise<AppState>(resolve=>{const r=db.transaction('demo').objectStore('demo').get('state');r.onsuccess=()=>resolve(r.result);});
    state.attachments.push(attachment);
    const tx=db.transaction(['demo','attachments'],'readwrite');tx.objectStore('demo').put(state,'state');tx.objectStore('attachments').put(new Blob([text],{type:'text/plain'}),attachment.path);
    await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
  },{attachment,text:original});
  await page.reload();await enterDemo(page);
  await page.getByRole('tab',{name:'Copias e historial',exact:true}).click();
  const downloading=page.waitForEvent('download');
  await page.getByRole('button',{name:'Copia completa con adjuntos',exact:true}).click();
  const downloaded=await downloading,zipBytes=await readFile((await downloaded.path())!);
  const zip=await JSZip.loadAsync(zipBytes);
  expect(await zip.file(path)!.async('string')).toBe(original);
  zip.file(path,'Contenido alterado');
  const bad=await zip.generateAsync({type:'nodebuffer'});
  const input=page.getByLabel('Seleccionar una copia JSON o ZIP completa');
  await input.setInputFiles({name:'copia-alterada.zip',mimeType:'application/zip',buffer:bad});
  await expect(page.getByRole('alert')).toContainText('no coincide');
  await page.evaluate(async(path)=>{
    const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('mabell-ramos-example',1);r.onsuccess=()=>resolve(r.result);});
    const tx=db.transaction('attachments','readwrite');tx.objectStore('attachments').delete(path);
    await new Promise<void>(resolve=>{tx.oncomplete=()=>resolve();});db.close();
  },path);
  await input.setInputFiles({name:'copia-completa.zip',mimeType:'application/zip',buffer:zipBytes});
  await expect(page.getByText('Copia completa validada:',{exact:false})).toBeVisible();
  await page.getByLabel('Motivo de recuperación').fill('Recuperación ficticia verificada de archivo ausente');
  await page.getByRole('checkbox',{name:'He revisado esta versión y guardado una copia actual.'}).check();
  await page.getByRole('button',{name:'Restaurar como una nueva versión',exact:true}).click();
  await expect(page.getByText('Restauración guardada como una nueva versión, con sus archivos originales.',{exact:true})).toBeVisible();
  const restored=await savedState(page);
  expect(restored.orders).toEqual(current.orders);expect(restored.money).toEqual(current.money);
  expect(restored.attachments[0].hash).toBe(hash);expect(restored.attachments[0].path).not.toBe(path);
  expect(restored.audit.at(-1)?.action).toBe('restore');
  await assertNoPageOverflow(page);
});

test('las secciones abren en móvil y con texto ampliado sin desbordar',async({page})=>{
  await route(page,'/ajustes');
  await page.getByRole('button',{name:'Texto más grande',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-text-size','large');
  for(const path of ['/','/pedidos','/dinero','/clientes','/productos','/agenda','/costos','/materiales','/ajustes']){
    await route(page,path);
    await expect(page.getByRole('main').getByRole('heading',{level:1})).toBeVisible();
    await expect(page.getByText('No pudimos mostrar esta página',{exact:false})).toHaveCount(0);
    await assertNoPageOverflow(page);
  }
});
