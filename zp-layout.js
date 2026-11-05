(()=>{"use strict";
if(window.__zpLayoutLoaded)return;window.__zpLayoutLoaded=true;
const unit=document.querySelector("#unit"),mid=document.querySelector(".mid"),registryUrl="./zp-agent-registry.json";
if(!unit||!mid)return;
const HOLD_MS=420,STORE_KEY="dirtyfingaz-zp-layout-v1";
const defaults={
 sample:{left:"L1x",right:"R1x"},
 pattern:{left:"L1x",right:"R1x"},
 piano:{left:"L1x",right:"R1x"},
 fx:{left:"L2x",right:"R3x"},
 master:{left:"L3x",right:"R3x"}
};
const cleanName=(value,fallback)=>String(value||fallback).replace(/[<>]/g,"").trim().slice(0,28)||fallback;
const safeParse=value=>{try{return JSON.parse(value)}catch{return null}};
const readStore=()=>{try{const value=safeParse(localStorage.getItem(STORE_KEY));if(value&&value.version===1)return value}catch{}return {version:1,autosave:true,customProfiles:{},activeProfileByContext:{},contextState:{}}};
let store=readStore(),registry=null,context="sample",activeSide="L",expanded=false,layoutEditing=false,editSnapshot=null;
const emit=(name,detail)=>{window.dispatchEvent(new CustomEvent(name,{detail}));try{parent.postMessage({type:name,protocolVersion:1,source:"creator.ui",detail},location.origin)}catch{}};
const persist=()=>{try{localStorage.setItem(STORE_KEY,JSON.stringify(store));return true}catch(error){console.warn("ZP layout storage:",error);return false}};
const contextNow=()=>mid.classList.contains("piano-open")?"piano":document.querySelector("#scr")?.classList.contains("pr")?"pattern":"sample";
const activeProfile=()=>store.activeProfileByContext[context]||"DEFAULT";
const profileState=()=>{const id=activeProfile();if(id!=="DEFAULT"&&store.customProfiles[id]?.layouts?.[context])return store.customProfiles[id].layouts[context];return store.contextState[context]||{left:defaults[context]?.left||"L1x",right:defaults[context]?.right||"R1x"}};
const updateState=(patch)=>{const id=activeProfile();if(id!=="DEFAULT"&&store.customProfiles[id]){store.customProfiles[id].layouts[context]={...profileState(),...patch}}else{store.contextState[context]={...profileState(),...patch}}if(store.autosave)persist()};
const sideName=side=>side==="L"?"left":"right";
const groupsFor=side=>registry?.panelSystem?.panels?.[sideName(side)]||[];
const selectedGroup=side=>{const state=profileState();const id=state[sideName(side)]||defaults[context]?.[sideName(side)];return groupsFor(side).find(group=>group.id===id)||groupsFor(side)[0]};
const button=(label,cls="")=>{const b=document.createElement("button");b.type="button";b.textContent=label;if(cls)b.className=cls;return b};
const dock=document.createElement("section");dock.id="zp-panel-dock";dock.hidden=true;dock.setAttribute("aria-label","Panel de controles contextuales");
const menu=document.createElement("section");menu.id="zp-layout-menu";menu.hidden=true;menu.setAttribute("aria-label","FUNCTION MENU");
const toolbar=document.createElement("div");toolbar.className="zp-layout-toolbar";toolbar.hidden=true;
mid.append(dock);unit.append(menu,toolbar);
function closeDock(){dock.hidden=true;expanded=false}
function renderDock(){
 const side=activeSide,groups=groupsFor(side),current=selectedGroup(side);
 dock.dataset.side=side;dock.replaceChildren();
 const head=document.createElement("div");head.className="zp-panel-head";
 const title=document.createElement("span");title.textContent=(side==="L"?"LEFT MASTER":"RIGHT MASTER")+" · "+context.toUpperCase();
 const close=button("×","zp-panel-close");close.setAttribute("aria-label","Cerrar panel");close.addEventListener("click",closeDock);head.append(title,close);
 const tabs=document.createElement("div");tabs.className="zp-panel-tabs";
 groups.forEach(group=>{const tab=button(group.label);tab.setAttribute("aria-pressed",String(group.id===current?.id));tab.addEventListener("click",()=>{updateState({[sideName(side)]:group.id});expanded=false;renderDock()});tabs.append(tab)});
 const label=document.createElement("div");label.className="zp-panel-context";label.textContent=current?.id+" · "+(expanded?"SECONDARY OPTIONS":"SELECTED GROUP");
 const options=document.createElement("div");options.className="zp-panel-options";options.hidden=!expanded;
 const contextual=current?.contexts?.[context]||current?.options||[];
 contextual.forEach(option=>{const item=button(option);item.addEventListener("click",()=>{const detail={side,group:current.id,option,context,module:"Creator",padId:document.querySelector("#zp-pad-config")?.dataset.padId||null,profile:activeProfile(),timestamp:new Date().toISOString()};emit("zp-panel-option-select",detail);closeDock()});options.append(item)});
 const foot=document.createElement("div");foot.className="zp-panel-foot";foot.textContent=expanded?"SELECCIÓN CONTEXTUAL · SIN COMANDO DE MOTOR":"MANTÉN Lx/Rx 420 ms PARA EXPANDIR";
 dock.append(head,tabs,label,options,foot);dock.hidden=false;
}
function openDock(side,expand){activeSide=side;expanded=!!expand;renderDock()}
function bindEncoderHold(selector,side){
 const encoder=document.querySelector(selector);if(!encoder)return;
 let timer=null,start=null,fired=false,moved=false;
 const clear=()=>{if(timer)clearTimeout(timer);timer=null};
 encoder.addEventListener("pointerdown",event=>{clear();start={x:event.clientX,y:event.clientY};fired=false;moved=false;timer=setTimeout(()=>{fired=true;openDock(side,true)},HOLD_MS)});
 encoder.addEventListener("pointermove",event=>{if(!start)return;if(Math.hypot(event.clientX-start.x,event.clientY-start.y)>9){moved=true;clear()}});
 const end=()=>{clear();if(start&&!moved&&!fired)openDock(side,false);start=null};
 encoder.addEventListener("pointerup",end);encoder.addEventListener("pointercancel",()=>{clear();start=null});
 encoder.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openDock(side,false)}});
}
function setContext(next){
 if(!defaults[next])return;context=next;
 store.activeProfileByContext[context]="DEFAULT";
 if(!store.contextState[context])store.contextState[context]={...defaults[context]};
 persist();closeDock();renderMenu();
}
function makeCustomFromCurrent(name){
 const id="custom-"+Date.now().toString(36);
 store.customProfiles[id]={name:cleanName(name,"CUSTOM"),layouts:{[context]:{...profileState()}}};
 store.activeProfileByContext[context]=id;persist();renderMenu();return id;
}
function ensureCustom(){let id=activeProfile();if(id==="DEFAULT"||!store.customProfiles[id])id=makeCustomFromCurrent("CUSTOM");return id}
function enterEdit(){
 if(layoutEditing)return;layoutEditing=true;editSnapshot=JSON.stringify(store);unit.classList.add("layout-edit-mode");toolbar.hidden=false;menu.hidden=true;
 renderToolbar();status.textContent="EDIT LAYOUT · políticas geométricas pendientes de CM20";
}
function exitEdit(save){
 if(!layoutEditing)return;
 if(!save&&editSnapshot){const restored=safeParse(editSnapshot);if(restored)store=restored;persist()}
 if(save){ensureCustom();persist()}
 layoutEditing=false;editSnapshot=null;unit.classList.remove("layout-edit-mode");toolbar.hidden=true;renderMenu();
}
const status=document.createElement("div");status.className="zp-layout-status";
function renderToolbar(){
 toolbar.replaceChildren();
 const label=document.createElement("span");label.textContent="EDIT LAYOUT";label.style.cssText="align-self:center;font:800 8px 'Courier New';color:#dfff8a";
 const blocked=document.createElement("span");blocked.className="zp-layout-blocked";blocked.textContent="DRAG / RESIZE BLOQUEADOS · CM20";
 const save=button("SAVE","primary"),cancel=button("CANCEL");
 save.addEventListener("click",()=>exitEdit(true));cancel.addEventListener("click",()=>exitEdit(false));
 toolbar.append(label,blocked,save,cancel);
}
function renderMenu(){
 menu.replaceChildren();
 const title=document.createElement("div");title.className="zp-layout-menu-title";title.textContent="FUNCTION / MENU · "+context.toUpperCase();menu.append(title);
 const add=(label,fn,cls)=>{const b=button(label,cls);b.addEventListener("click",fn);menu.append(b);return b};
 add("EDIT LAYOUT",enterEdit,"primary");
 add("DEFAULT",()=>{store.activeProfileByContext[context]="DEFAULT";store.contextState[context]={...defaults[context]};persist();closeDock();renderMenu()});
 add("CUSTOM",()=>{ensureCustom();renderMenu()});
 const autosave=add("AUTOSAVE "+(store.autosave?"ON":"OFF"),()=>{store.autosave=!store.autosave;persist();renderMenu()});autosave.setAttribute("aria-pressed",String(store.autosave));
 add("DUPLICATE",()=>{const current=activeProfile();const base=current==="DEFAULT"?profileState():store.customProfiles[current]?.layouts?.[context]||profileState();const id="custom-"+Date.now().toString(36);store.customProfiles[id]={name:"CUSTOM COPY",layouts:{[context]:{...base}}};store.activeProfileByContext[context]=id;persist();renderMenu()});
 add("RENAME",()=>{const id=activeProfile();if(id==="DEFAULT")return;const value=window.prompt("Nombre del perfil",store.customProfiles[id]?.name||"CUSTOM");if(value){store.customProfiles[id].name=cleanName(value,"CUSTOM");persist();renderMenu()}});
 add("DELETE",()=>{const id=activeProfile();if(id==="DEFAULT")return;if(!window.confirm("¿Eliminar el perfil CUSTOM activo?"))return;delete store.customProfiles[id];store.activeProfileByContext[context]="DEFAULT";persist();renderMenu()});
 add("RESTORE DEFAULT",()=>{store.contextState[context]={...defaults[context]};store.activeProfileByContext[context]="DEFAULT";persist();closeDock();renderMenu()});
 const info=document.createElement("div");info.className="zp-layout-status";const profile=activeProfile();info.textContent="PROFILE: "+(profile==="DEFAULT"?"DEFAULT":store.customProfiles[profile]?.name||"CUSTOM")+" · PERSISTENCIA HYBRID · DEFAULT POR MÓDULO";menu.append(info);
 const policy=document.createElement("div");policy.className="zp-layout-status zp-layout-blocked";policy.textContent="CM20 PENDIENTE: posicionamiento, alineación, colisiones y límites. Drag/resize se habilitan al fijar esas reglas.";menu.append(policy);
 const close=add("CLOSE",()=>menu.hidden=true);close.style.gridColumn="1/-1";
 menu.hidden=false;
}
function toggleMenu(){if(!menu.hidden){menu.hidden=true;return}renderMenu()}
function syncContext(){const next=contextNow();if(next!==context)setContext(next)}
document.querySelector("#menu")?.addEventListener("click",event=>{event.preventDefault();toggleMenu()});
document.addEventListener("click",event=>{if(!menu.hidden&&!menu.contains(event.target)&&event.target.id!=="menu")menu.hidden=true;if(!dock.hidden&&!dock.contains(event.target)&&!event.target.closest(".lx,.rx"))closeDock()});
document.addEventListener("zp-panel-context-change",syncContext);
document.querySelector("#scr")?.addEventListener("transitionend",syncContext);
const observer=new MutationObserver(syncContext);observer.observe(mid,{attributes:true,attributeFilter:["class"]});observer.observe(document.querySelector("#scr")||mid,{attributes:true,attributeFilter:["class"]});
bindEncoderHold(".lx","L");bindEncoderHold(".rx","R");
const themeButton=button("THEME / COLOR");themeButton.addEventListener("click",()=>{const skins=["verde","ambar","cian","rojo"],current=unit.dataset.skin||"verde";unit.dataset.skin=skins[(skins.indexOf(current)+1)%skins.length];window.dispatchEvent(new CustomEvent("zp-theme-change",{detail:{skin:unit.dataset.skin}}));document.querySelector("#wv")?.dispatchEvent(new Event("zp-wave-redraw"))});
menu.addEventListener("click",event=>{if(event.target.closest("[data-theme-action]"))themeButton.click()});
const contextState=()=>context;
window.ZPLayout={toggleMenu,openDock,setContext:next=>setContext(next),getContext:contextState,getProfile:activeProfile,enterEdit,exitEdit,closeDock,policy:{status:"pending",questionnaire:20}};
setContext(contextNow());
})();