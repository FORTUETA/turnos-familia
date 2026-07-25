import React,{useEffect,useMemo,useState} from 'react'
import {
  collection,doc,onSnapshot,setDoc,deleteDoc,
  getDocFromServer,serverTimestamp
} from 'firebase/firestore'
import {db} from './firebase'

const DAYS=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const PEOPLE=[
{id:'alfredo',name:'Alfredo',color:'#cfe3ff'},
{id:'uin',name:'Uin',color:'#ead7ff'},
{id:'fermin',name:'Fermín',color:'#d7f2d0'},
{id:'ivan',name:'Iván',color:'#ffdcb8'},
{id:'miriam',name:'Miriam',color:'#fff0b8'}
]

function mondayOf(date){const d=new Date(date);const day=d.getDay();d.setDate(d.getDate()+(day===0?-6:1-day));d.setHours(12,0,0,0);return d}
function addDays(date,n){const d=new Date(date);d.setDate(d.getDate()+n);d.setHours(12,0,0,0);return d}
function localIso(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function timeout(ms){return new Promise((_,reject)=>setTimeout(()=>reject(new Error('TIMEOUT_FIREBASE')),ms))}
function friendly(error){
 const code=error?.code||''
 if(code.includes('permission-denied')) return 'Firebase rechaza el guardado: revisa que las reglas estén publicadas.'
 if(code.includes('unavailable')) return 'Firebase no responde. Revisa Internet, bloqueadores o la configuración del proyecto.'
 if(error?.message==='TIMEOUT_FIREBASE') return 'Firebase no confirmó el guardado en 10 segundos. El turno no se ha considerado guardado.'
 return `Error Firebase (${code||'sin código'}): ${error?.message||'desconocido'}`
}

export default function App(){
 const [weekStart,setWeekStart]=useState(mondayOf(new Date()))
 const [slots,setSlots]=useState({})
 const [selected,setSelected]=useState(null)
 const [status,setStatus]=useState('')
 const [statusType,setStatusType]=useState('')
 const weekId=localIso(weekStart)

 useEffect(()=>{
   setStatus('')
   const ref=collection(db,'weeks',weekId,'slots')
   return onSnapshot(
     ref,
     {includeMetadataChanges:true},
     snap=>{
       const next={}
       snap.forEach(x=>next[x.id]=x.data())
       setSlots(next)
       if(!snap.metadata.fromCache){
         setStatus('Conectado con Firebase.')
         setStatusType('ok')
         setTimeout(()=>setStatus(''),1200)
       }
     },
     err=>{
       console.error('Lectura Firestore:',err)
       setStatus(friendly(err));setStatusType('error')
     }
   )
 },[weekId])

 const title=useMemo(()=>{
   const end=addDays(weekStart,6)
   return `${weekStart.toLocaleDateString('es-ES',{day:'numeric',month:'short'})} – ${end.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}`
 },[weekStart])

 async function assign(personId){
   if(!selected)return
   const choice=selected
   setSelected(null)
   setStatus('Guardando y comprobando…')
   setStatusType('info')

   const ref=doc(db,'weeks',weekId,'slots',`${choice.day}-${choice.hour}`)
   try{
     if(personId){
       await Promise.race([
         setDoc(ref,{
           personId,
           day:choice.day,
           hour:choice.hour,
           weekId,
           updatedAt:serverTimestamp()
         }),
         timeout(10000)
       ])
       const confirmed=await Promise.race([getDocFromServer(ref),timeout(10000)])
       if(!confirmed.exists()) throw new Error('El documento no aparece en el servidor')
     }else{
       await Promise.race([deleteDoc(ref),timeout(10000)])
     }

     setStatus(personId?'Turno guardado y confirmado.':'Turno eliminado.')
     setStatusType('ok')
     setTimeout(()=>setStatus(''),2200)
   }catch(err){
     console.error('Guardado Firestore:',err)
     setStatus(friendly(err))
     setStatusType('error')
   }
 }

 const counts=PEOPLE.map(p=>({...p,hours:Object.values(slots).filter(s=>s.personId===p.id).length}))

 return <main>
   <header><div><h1>Turnos Familia</h1><p>Planificación semanal compartida</p></div>
   <div className="week-nav"><button onClick={()=>setWeekStart(addDays(weekStart,-7))}>‹</button><strong>{title}</strong><button onClick={()=>setWeekStart(addDays(weekStart,7))}>›</button></div></header>

   {status&&<div className={`status ${statusType}`}>{status}</div>}

   <section className="summary">{counts.map(p=><div className="person-chip" key={p.id} style={{background:p.color}}><span>{p.name}</span><strong>{p.hours} h</strong></div>)}</section>

   <section className="calendar-wrap"><div className="calendar-grid">
   <div className="corner">Hora</div>
   {DAYS.map((day,i)=><div className="day-head" key={day}><strong>{day}</strong><span>{addDays(weekStart,i).getDate()}</span></div>)}
   {Array.from({length:24},(_,hour)=><React.Fragment key={hour}>
     <div className="hour-label">{String(hour).padStart(2,'0')}:00</div>
     {DAYS.map((_,day)=>{
       const slot=slots[`${day}-${hour}`]
       const person=PEOPLE.find(p=>p.id===slot?.personId)
       return <button key={`${day}-${hour}`} className="slot" style={{background:person?.color||'#fff'}} onClick={()=>setSelected({day,hour})}>{person?.name||''}</button>
     })}
   </React.Fragment>)}
   </div></section>

   {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
     <h2>{DAYS[selected.day]} · {String(selected.hour).padStart(2,'0')}:00</h2>
     <button className="choice empty" onClick={()=>assign(null)}>Dejar libre</button>
     {PEOPLE.map(p=><button className="choice" key={p.id} style={{background:p.color}} onClick={()=>assign(p.id)}>{p.name}</button>)}
     <button className="cancel" onClick={()=>setSelected(null)}>Cancelar</button>
   </div></div>}
 </main>
}