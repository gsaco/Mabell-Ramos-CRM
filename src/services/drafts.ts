import {useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction} from 'react';
import {useLocation} from 'react-router-dom';
import {useApp} from './store';

type Initial<T> = T | (()=>T);
type ClearDraft<T> = (next?:T)=>void;
type DraftSlot<T> = {namespace:string;value:T};
const prefix='mr:form:';
const warned=new Set<string>();
const sensitiveKey=/^(token|accessToken|refreshToken|secret|password|passwd|authorization|cookie|credentials?|apiKey|privateKey)$/i;
const secretValue=/(?:github_pat_[A-Za-z0-9_]{10,}|gh[pousr]_[A-Za-z0-9]{10,}|\bBearer\s+[A-Za-z0-9._-]{12,}|\bsk-(?:proj-)?[A-Za-z0-9_-]{16,})/;
const valueOf=<T,>(initial:Initial<T>):T=>typeof initial==='function'?(initial as ()=>T)():initial;

function read<T>(key:string,initial:Initial<T>):T{
  try{
    const text=sessionStorage.getItem(key);
    if(text){const draft=JSON.parse(text) as {version?:number;value?:T};if(draft.version===1&&Object.prototype.hasOwnProperty.call(draft,'value'))return draft.value as T;sessionStorage.removeItem(key);}
  }catch{try{sessionStorage.removeItem(key);}catch{/* Storage can be disabled; the in-memory form still works. */}}
  return valueOf(initial);
}

function serialized(value:unknown):string{
  const text=JSON.stringify({version:1,value},(key,item:unknown)=>{
    if(sensitiveKey.test(key)||(typeof item==='string'&&secretValue.test(item)))throw new Error('secret');
    return item;
  });
  if(!text)throw new Error('format');return text;
}

/** Removes only this form's current business, actor, mode and route namespace. */
function removeNamespace(namespace:string){
  try{for(const key of Object.keys(sessionStorage))if(key.startsWith(namespace+':'))sessionStorage.removeItem(key);}catch{/* A saved operation remains valid even when browser storage is unavailable. */}
}

/** A local draft never calls the repository or the domain engine. */
export function useDraftState<T>(scope:string,field:string,initial:Initial<T>):[T,Dispatch<SetStateAction<T>>,ClearDraft<T>]{
  const {state,actor,mode,notify}=useApp();const location=useLocation();
  const namespace=prefix+[state.businessId,actor,mode,location.pathname,scope].map(encodeURIComponent).join(':');
  const key=namespace+':'+encodeURIComponent(field);
  const initialRef=useRef(initial);initialRef.current=initial;
  const [slot,setSlot]=useState<DraftSlot<T>>(()=>({namespace:key,value:read(key,initial)}));
  const current=useRef(slot);
  // Resolve a changed route/scope before rendering inputs, not after the first keystroke.
  if(current.current.namespace!==key)current.current={namespace:key,value:read(key,initialRef.current)};
  useEffect(()=>{if(slot.namespace!==key)setSlot(current.current);},[key,slot.namespace]);
  const setValue=useCallback<Dispatch<SetStateAction<T>>>(action=>{
    const previous=current.current.namespace===key?current.current.value:read(key,initialRef.current);
    const value=typeof action==='function'?(action as (old:T)=>T)(previous):action;
    current.current={namespace:key,value};setSlot(current.current);
    try{sessionStorage.setItem(key,serialized(value));}
    catch(error){
      try{sessionStorage.removeItem(key);}catch{/* No content is logged or written elsewhere. */}
      if(!warned.has(key)){warned.add(key);notify(error instanceof Error&&error.message==='secret'?'No se conservan claves ni credenciales en los borradores. El campo permanece sólo en memoria.':'No se pudo conservar este borrador en el navegador. El formulario sigue disponible; guarda los cambios antes de salir.');}
    }
  },[key,notify]);
  const clear=useCallback<ClearDraft<T>>(next=>{
    removeNamespace(namespace);warned.delete(key);
    if(next!==undefined){current.current={namespace:key,value:next};setSlot(current.current);}
  },[namespace,key]);
  return [current.current.value,setValue,clear];
}

/** [draft, setter, clear]; pass a replacement to clear when adopting a saved version. */
export function useSessionDraft<T>(scope:string,initial:Initial<T>):[T,Dispatch<SetStateAction<T>>,ClearDraft<T>]{
  return useDraftState(scope,'record',initial);
}
