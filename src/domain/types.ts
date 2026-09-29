export type Person = 'Mabel' | 'Ana';
export type Mode = 'demo' | 'github';
export type Money = number; // integer céntimos, never formatted text
export type Need = 'Consumo y recompra'|'Regalo'|'Descubrimiento de sabores'|'Reunión/evento'|'Otra'|'Por conocer';
export type Base = {id:string;revision:number;createdAt:string;updatedAt:string;archived?:boolean};
export type Approval = 'Por revisar'|'Aprobado'|'No disponible'|'Archivado';
export type PriceKind = 'Publicado por confirmar'|'Referencial'|'Consultar'|'Aprobado';
export interface Client extends Base {name:string;type:'Persona'|'Institución';phone:string;email:string;instagram:string;origin:string;originEvidence:string;preferredChannel:string;contacts:{name:string;phone:string;role:string}[];preferences:string;preferencesSource:string;consent:'Autorizado'|'No autorizado'|'No consta';consentEvidence:string;consentAt:string;notes:string;mergedInto?:string}
export interface Inquiry extends Base {clientId:string|null;contactName:string;contact:string;summary:string;modality:'Productos'|'Catering'|'Por definir';need:Need;needSource:string;channel:string;receivedAt:string;respondedAt:string|null;responseDue:string|null;ruleVersion:number|null;requestedDate:string;responsible:Person;status:'Por responder'|'En conversación'|'Cotización enviada'|'Con pedido'|'No se concretó'|'Duplicada';waitingClient:boolean;nextAction:string;actionDate:string;reason:string;confirmedAt:string|null;publicationId?:string;duplicateOf?:string}
export interface Product extends Base {name:string;family:string;description:string;culturalDescription:string;ingredients:string;allergens:string;conservation:string;attributes:{filling:string;cacao:string;shape:string;size:string;coverage:string;decoration:string;presentation:string};variants:string[];unit:string;baseQuantity:number;price:Money|null;priceKind:PriceKind;sourcePage:number;sourceDocument:string;sourceHash:string;status:Approval;priority:boolean;available:string;preparationMinutes:number|null;validFrom:string;approvedBy:Person[];photo:string;notes:string;history:{at:string;by:string;price:Money|null;priceKind:PriceKind;description:string}[]}
export interface CommercialOption extends Base {name:string;need:Need;items:{productId:string;quantity:number}[];presentation:string;price:Money|null;priceKind:PriceKind;status:Approval;included:string;delivery:string;changes:string;capacity:string;conditions:string;approvedBy:Person[];history:{at:string;by:string;price:Money|null;description:string}[]}
export interface OrderLine {id:string;referenceId:string|null;referenceType:'product'|'option'|'custom';name:string;quantity:number;unit:string;unitsPerPack:number;baseQuantity:number;unitPrice:Money|null;priceKind:PriceKind;attributes:string;distribution:{variant:string;quantity:number}[];sourceVersion:number|null;costVersionId:string|null;notes:string}
export type ScopeStatus = 'Incluido'|'Adicional cotizado'|'No incluido'|'Por confirmar'|'No aplica';
export interface ScopeItem {name:string;status:ScopeStatus;detail:string;amount:Money|null;responsible:string}
export interface Order extends Base {code:string;clientId:string|null;contactName:string;inquiryId:string|null;modality:'Productos'|'Catering';need:Need;status:'Borrador'|'Por confirmar'|'Confirmado'|'En preparación'|'Entregado'|'Cancelado';responsible:Person;deliveryDate:string;deliveryTime:string;location:string;deliveryMode:'Retiro'|'Entrega'|'Servicio';lines:OrderLine[];scope:ScopeItem[];attendees:number|null;duration:string;eventId:string|null;parentId:string|null;transport:Money|null;extra:Money;discount:Money;total:Money;paymentTerms:string;changesTerms:string;customerNotes:string;internalNotes:string;acceptedAt:string|null;acceptedChannel:string;capacityCheckedAt:string|null;capacityCheckedBy:string|null;confirmedAt:string|null;deliveredAt:string|null;dueDate:string;splitEffectiveDate?:string;cancelledAt?:string;cancelReason:string;cancelCharge:Money;versions:OrderVersion[];costEstimate:Money|null;costReviewed:boolean;costRevision:number;isSimulation:boolean}
export interface OrderVersion {at:string;by:string;reason:string;total:Money;lines:OrderLine[];scope:ScopeItem[];deliveryDate:string;paymentTerms:string;acceptedAt:string|null}
export interface Task extends Base {title:string;date:string;time:string;minutes:number|null;responsible:Person;collaborator:string;orderId:string|null;clientId:string|null;eventId:string|null;kind:'Atención'|'Compra'|'Preparación'|'Empaque'|'Entrega'|'Montaje'|'Seguimiento'|'Otra';status:'Pendiente'|'En curso'|'Completada'|'Cancelada';resource:string;resourceStatus:'Por confirmar'|'Confirmado'|'No aplica';purpose:'Atender solicitud/pedido'|'Novedades/promoción';notes:string;result:string}
export interface PurchaseNeed extends Base {name:string;quantity:number;unit:string;date:string;responsible:Person;orderIds:string[];supplier:string;purchased:number;purchaseId:string|null;notes:string}
export interface Purchase extends Base {description:string;amount:Money;businessAmount:Money;date:string;category:string;supplierId:string|null;dueDate:string;orderIds:string[];eventId:string|null;quantity:number|null;unit:string;notes:string;status:'Vigente'|'Cancelada';adjustments:{amount:Money;date:string;reason:string}[];allocations:{orderId:string;amount:Money;method:string}[]}
export interface Supplier extends Base {name:string;contact:string;supplies:string;conditions:string;notes:string}
export type MoneyKind='Cobro'|'Pago'|'Devolución al cliente'|'Devolución de proveedor'|'Aporte'|'Retiro'|'Préstamo recibido'|'Pago de préstamo'|'Transferencia'|'Ajuste de saldo';
export interface MoneyRecord extends Base {kind:MoneyKind;amount:Money;date:string;accountId:string|null;toAccountId:string|null;method:string;reference:string;notes:string;allocations:{entityId:string;amount:Money}[];reversalOf:string|null;reversedBy:string|null;direction:'Entrada'|'Salida';requestId:string;allocationHistory?:{date:string;before:{entityId:string;amount:Money}[]}[]}
export interface Account extends Base {name:string;opening:Money|null;openingDate:string;source:string;active:boolean}
export interface Sale extends Base {orderId:string;date:string;amount:Money;modality:'Productos'|'Catering';eventId:string|null;clientId:string|null;adjustments:{id:string;amount:Money;date:string;reason:string;by:string}[]}
export interface CostIngredient {id:string;name:string;usedQuantity:number|null;usedUnit:string;purchaseQuantity:number|null;purchaseUnit:string;purchasePrice:Money|null;source:string}
export interface CostSheet extends Base {referenceId:string;type:'Producto'|'Paquete'|'Pedido';name:string;yield:number|null;ingredients:CostIngredient[];components:{referenceId:string;quantity:number;costSheetId:string|null}[];packaging:Money|null;laborMinutes:number|null;laborHourly:Money|null;other:Money|null;overhead:Money|null;overheadMethod:string;notes:string;reviewed:boolean;history:{at:string;by:string;total:Money|null;reason:string}[]}
export interface FairLine {productId:string;name:string;unit:string;brought:number;returned:number;samples:number;waste:number}
export interface Fair extends Base {name:string;date:string;location:string;responsible:Person;type:'Feria'|'Reunión/evento';mode:'Individual'|'Resumen';lines:FairLine[];closed:boolean;notes:string}
export interface Interaction extends Base {clientId:string|null;inquiryId:string|null;orderId:string|null;date:string;channel:string;summary:string;author:string;kind:'Respuesta'|'Seguimiento'|'Nota'|'Aceptación';outcome:string}
export interface Conversation extends Base {participant:string;clientId:string|null;need:Need;needSource:string;date:string;optionIds:string[];understanding:string;preference:string;reason:string;questions:string;changes:string;responsible:Person}
export interface Publication extends Base {title:string;date:string;status:'Planeada'|'Publicada';channel:string;optionIds:string[];copy:string;photo:string;conditions:string;url:string}
export interface Attachment extends Base {name:string;mime:string;size:number;path:string;entityType:string;entityId:string;sha:string;hash:string;uploadedBy:string}
export interface Closing extends Base {from:string;to:string;cutoff:string;notes:string;summary:Record<string,number|string>;snapshotVersion:number}
export interface Reconciliation extends Base {accountId:string;date:string;counted:Money;calculated:Money|null;notes:string}
export interface Audit extends Base {actor:string;action:string;entity:string;entityId:string;reason:string;before:unknown;after:unknown}
export interface Settings {businessName:string;currency:'PEN';timezone:'America/Lima';startDate:string;responseHours:number|null;workStart:number;workEnd:number;workDays:number[];ruleVersion:number;methods:string[];categories:string[];catalogUrl:string;originalPdfUrl:string;standUrl:string;phone:string;instagram:string;profiles:{name:Person;githubLogin:string}[];onboardingDone:boolean}
export interface AppState {schemaVersion:1;revision:number;updatedAt:string;businessId:string;settings:Settings;clients:Client[];inquiries:Inquiry[];products:Product[];options:CommercialOption[];orders:Order[];tasks:Task[];purchaseNeeds:PurchaseNeed[];purchases:Purchase[];suppliers:Supplier[];money:MoneyRecord[];accounts:Account[];sales:Sale[];costs:CostSheet[];fairs:Fair[];interactions:Interaction[];conversations:Conversation[];publications:Publication[];attachments:Attachment[];closings:Closing[];reconciliations:Reconciliation[];audit:Audit[];requests:string[]}
export type Collections=Omit<AppState,'schemaVersion'|'revision'|'updatedAt'|'businessId'|'settings'|'requests'>;
export type Collection=keyof Collections;
export type EditableCollection=Exclude<Collection,'money'|'sales'|'audit'>;
export type RecordOf<K extends Collection>=Collections[K][number];
export type Command =
 | {type:'save';collection:EditableCollection;record:Base & Record<string,unknown>;expectedRevision?:number;reason?:string}
 | {type:'settings';settings:Settings}
 | {type:'confirmOrder';id:string;acceptedAt:string;acceptedChannel:string;capacityChecked:boolean}
 | {type:'orderStatus';id:string;status:'Por confirmar'|'En preparación'}
 | {type:'deliverOrder';id:string;date:string}
 | {type:'cancelOrder';id:string;reason:string;charge:Money}
 | {type:'adjustOrder';id:string;amount:Money;date:string;reason:string}
 | {type:'recordMoney';record:MoneyRecord;allowCredit?:boolean}
 | {type:'reverseMoney';id:string;date:string;reason:string}
 | {type:'assignAccount';id:string;accountId:string}
 | {type:'purchaseAdjustment';id:string;amount:Money;date:string;reason:string;cancel:boolean}
 | {type:'mergeClients';keepId:string;removeId:string;reason:string}
 | {type:'restore';state:AppState;reason:string}
 | {type:'clientFromInquiry';client:Client;inquiryId:string}
 | {type:'purchaseWithNeed';purchase:Purchase;needId:string;quantity:number}
 | {type:'fairSale';order:Order;date:string;acceptedAt:string;received:MoneyRecord|null}
 | {type:'splitOrder';id:string;parts:Order[];reason:string};
export interface CommandEnvelope {id:string;actor:string;at:string;expectedStateRevision:number;command:Command}
export interface RepositoryConfig {owner:string;repo:string;branch:string;path:string}
export interface SessionIdentity {login:string;name:string;id:number;avatarUrl:string;canWrite:boolean;privateRepo:boolean}
