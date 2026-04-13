import React, { useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'
import { getEvents, getSchools } from '../api'
import axios from 'axios'

function DirectionBadge({ direction }) {
  if (direction === 'entry')
    return <span className="text-xs font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5">↑ Вход</span>
  if (direction === 'exit')
    return <span className="text-xs font-semibold text-red-700 bg-red-100 rounded-full px-2 py-0.5">↓ Выход</span>
  return <span className="text-xs text-gray-400">—</span>
}

export default function Events() {
  const [events, setEvents] = useState([])
  const [schools, setSchools] = useState([])
  const [filters, setFilters] = useState({
    school_id: '', direction: '', date_from: '', date_to: '',
  })
  const [loading, setLoading] = useState(false)
  const [csvMsg, setCsvMsg] = useState('')
  const fileRef = useRef()

  const load = async () => {
    setLoading(true)
    const params = {}
    if (filters.school_id) params.school_id = filters.school_id
    if (filters.direction) params.direction = filters.direction
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
    const r = await getEvents({ ...params, limit: 200 })
    setEvents(r.data)
    setLoading(false)
  }

  useEffect(() => { getSchools().then(r => setSchools(r.data)) }, [])
  useEffect(() => { load() }, [filters])

  const handleCsv = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    setCsvMsg('Загрузка...')
    try {
      const r = await axios.post('/api/upload/csv', fd)
      setCsvMsg(`Импортировано: ${r.data.imported} записей${r.data.errors.length ? ` (ошибок: ${r.data.errors.length})` : ''}`)
      load()
    } catch {
      setCsvMsg('Ошибка при импорте CSV')
    }
    fileRef.current.value = ''
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Журнал событий</h2>
        <div className="flex items-center gap-3">
          {csvMsg && <span className="text-sm text-blue-600">{csvMsg}</span>}
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            Импорт CSV (iVMS-4200)
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsv} />
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3">
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={filters.school_id}
          onChange={e => setFilters(f => ({ ...f, school_id: e.target.value }))}
        >
          <option value="">Все школы</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={filters.direction}
          onChange={e => setFilters(f => ({ ...f, direction: e.target.value }))}
        >
          <option value="">Все направления</option>
          <option value="entry">Вход</option>
          <option value="exit">Выход</option>
        </select>

        <input
          type="date"
          className="border rounded-lg px-3 py-2 text-sm"
          value={filters.date_from}
          onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
        />
        <span className="self-center text-gray-400 text-sm">—</span>
        <input
          type="date"
          className="border rounded-lg px-3 py-2 text-sm"
          value={filters.date_to}
          onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
        />

        <button
          onClick={() => setFilters({ school_id: '', direction: '', date_from: '', date_to: '' })}
          className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2"
        >
          Сбросить
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Загрузка...</div>
        ) : events.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Событий не найдено</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Время</th>
                <th className="px-4 py-3 font-medium">Имя</th>
                <th className="px-4 py-3 font-medium">Карта</th>
                <th className="px-4 py-3 font-medium">Класс</th>
                <th className="px-4 py-3 font-medium">Школа</th>
                <th className="px-4 py-3 font-medium">Направление</th>
                <th className="px-4 py-3 font-medium">Турникет</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                    {format(new Date(ev.event_time), 'dd.MM.yyyy HH:mm:ss')}
                  </td>
                  <td className="px-4 py-2 font-medium">{ev.person_name || '—'}</td>
                  <td className="px-4 py-2 text-gray-500 font-mono text-xs">{ev.card_no || '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{ev.student?.grade || '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{ev.student?.school?.name || '—'}</td>
                  <td className="px-4 py-2"><DirectionBadge direction={ev.direction} /></td>
                  <td className="px-4 py-2 text-gray-500">{ev.turnstile?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400">Показано последних {events.length} записей</p>
    </div>
  )
}
