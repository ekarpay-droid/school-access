import React, { useEffect, useState } from 'react'
import { getSchools, createSchool, deleteSchool } from '../api'
import axios from 'axios'

const emptyForm = { name: '', address: '' }

export default function Schools() {
  const [schools, setSchools] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [turnstileForm, setTurnstileForm] = useState({ name: '', ip_address: '', school_id: '' })
  const [showTurnstile, setShowTurnstile] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const load = () => getSchools().then(r => setSchools(r.data))
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createSchool(form)
      setForm(emptyForm)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка')
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Удалить школу «${name}»? Все связанные данные будут удалены.`)) return
    await deleteSchool(id)
    load()
  }

  const handleTurnstile = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await axios.post('/api/turnstiles', {
        ...turnstileForm,
        school_id: Number(turnstileForm.school_id),
      })
      setTurnstileForm({ name: '', ip_address: '', school_id: '' })
      setShowTurnstile(false)
      setMsg('Турникет добавлен')
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Школы и турникеты</h2>
        <div className="flex gap-3">
          <button onClick={() => { setShowTurnstile(!showTurnstile); setShowForm(false) }}
            className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            + Турникет
          </button>
          <button onClick={() => { setShowForm(!showForm); setShowTurnstile(false) }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            + Добавить школу
          </button>
        </div>
      </div>

      {msg && <div className="bg-green-50 text-green-700 text-sm px-4 py-2 rounded-lg">{msg}</div>}
      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}

      {/* School form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Новая школа</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Название *</label>
              <input required className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Адрес</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg">
                Сохранить
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 text-sm px-3 py-2">
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Turnstile form */}
      {showTurnstile && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Добавить турникет</h3>
          <p className="text-xs text-gray-500 mb-3">
            IP-адрес нужен чтобы сопоставлять входящие события с конкретным турникетом и школой.
          </p>
          <form onSubmit={handleTurnstile} className="flex flex-col gap-3 max-w-md">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Название *</label>
              <input required className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="например: Главный вход"
                value={turnstileForm.name}
                onChange={e => setTurnstileForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">IP-адрес устройства</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                placeholder="192.168.1.64"
                value={turnstileForm.ip_address}
                onChange={e => setTurnstileForm(f => ({ ...f, ip_address: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Школа *</label>
              <select required className="w-full border rounded-lg px-3 py-2 text-sm"
                value={turnstileForm.school_id}
                onChange={e => setTurnstileForm(f => ({ ...f, school_id: e.target.value }))}>
                <option value="">— Выберите школу —</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium px-5 py-2 rounded-lg">
                Добавить
              </button>
              <button type="button" onClick={() => setShowTurnstile(false)} className="text-gray-500 text-sm px-3 py-2">
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schools list */}
      {schools.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
          Школ ещё нет. Добавьте первую школу.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schools.map(s => (
            <div key={s.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{s.name}</h3>
                  {s.address && <p className="text-sm text-gray-500 mt-0.5">{s.address}</p>}
                </div>
                <button onClick={() => handleDelete(s.id, s.name)}
                  className="text-xs text-red-400 hover:text-red-600">
                  Удалить
                </button>
              </div>
              <div className="mt-3 text-xs text-gray-400">
                ID: {s.id} · Добавлена: {new Date(s.created_at).toLocaleDateString('ru-RU')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
