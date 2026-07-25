import React, { useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc
} from 'firebase/firestore'
import { db } from './firebase'

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const PEOPLE = [
  { id: 'alfredo', name: 'Alfredo', color: '#cfe3ff' },
  { id: 'fermin', name: 'Fermín', color: '#d7f2d0' },
  { id: 'miriam', name: 'Miriam', color: '#fff0b8' },
  { id: 'carlos', name: 'Carlos', color: '#ffd4d4' }
]

function mondayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export default function App() {
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()))
  const [slots, setSlots] = useState({})
  const [selected, setSelected] = useState(null)

  const weekId = isoDate(weekStart)

  useEffect(() => {
    const ref = collection(db, 'weeks', weekId, 'slots')
    const unsub = onSnapshot(ref, snap => {
      const next = {}
      snap.forEach(item => {
        next[item.id] = item.data()
      })
      setSlots(next)
    })
    return unsub
  }, [weekId])

  const title = useMemo(() => {
    const end = addDays(weekStart, 6)
    return `${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }, [weekStart])

  async function assign(personId) {
    if (!selected) return
    const slotId = `${selected.day}-${selected.hour}`
    const ref = doc(db, 'weeks', weekId, 'slots', slotId)

    if (!personId) {
      await deleteDoc(ref)
    } else {
      await setDoc(ref, {
        personId,
        day: selected.day,
        hour: selected.hour,
        updatedAt: new Date().toISOString()
      })
    }
    setSelected(null)
  }

  const counts = PEOPLE.map(person => ({
    ...person,
    hours: Object.values(slots).filter(s => s.personId === person.id).length
  }))

  return (
    <main>
      <header>
        <div>
          <h1>Turnos Familia</h1>
          <p>Planificación semanal compartida</p>
        </div>
        <div className="week-nav">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))}>‹</button>
          <strong>{title}</strong>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))}>›</button>
        </div>
      </header>

      <section className="summary">
        {counts.map(person => (
          <div className="person-chip" key={person.id} style={{ background: person.color }}>
            <span>{person.name}</span>
            <strong>{person.hours} h</strong>
          </div>
        ))}
      </section>

      <section className="calendar-wrap">
        <div className="calendar-grid">
          <div className="corner">Hora</div>
          {DAYS.map((day, i) => {
            const date = addDays(weekStart, i)
            return (
              <div className="day-head" key={day}>
                <strong>{day}</strong>
                <span>{date.getDate()}</span>
              </div>
            )
          })}

          {Array.from({ length: 24 }, (_, hour) => (
            <React.Fragment key={hour}>
              <div className="hour-label">{String(hour).padStart(2, '0')}:00</div>
              {DAYS.map((_, day) => {
                const slot = slots[`${day}-${hour}`]
                const person = PEOPLE.find(p => p.id === slot?.personId)
                return (
                  <button
                    key={`${day}-${hour}`}
                    className="slot"
                    style={{ background: person?.color || '#fff' }}
                    onClick={() => setSelected({ day, hour })}
                    aria-label={`${DAYS[day]} ${hour}:00 ${person?.name || 'libre'}`}
                  >
                    {person?.name || ''}
                  </button>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </section>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{DAYS[selected.day]} · {String(selected.hour).padStart(2, '0')}:00</h2>
            <button className="choice empty" onClick={() => assign(null)}>Dejar libre</button>
            {PEOPLE.map(person => (
              <button
                className="choice"
                key={person.id}
                style={{ background: person.color }}
                onClick={() => assign(person.id)}
              >
                {person.name}
              </button>
            ))}
            <button className="cancel" onClick={() => setSelected(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </main>
  )
}
