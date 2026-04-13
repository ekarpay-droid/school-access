import React, { useEffect, useState } from 'react'
import { getStudents, createStudent, deleteStudent, getSchools } from '../api'

const emptyForm = { full_name: '', card_no: '', employee_no: '', grade: '', school_id: '' }

export default function Students() {
  const [students, setStudents] = useState([])
  const [schools, setSchools] = useState([])
  const [search, setSearch] = useState('')
  const [schoolFilter, setSchoolFilter] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const params = {}
    if (schoolFilter) params.school_id = schoolFilter
    if (search) params.search = search
    const r = await getStudents(params)
    setStudents(r.data)
  }

  useEffect(() => { getSchools().then(r => setSchools(r.data)) }, [])
  useEffect(() => { load() }, [search, schoolFilter])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.school_id) { setError('Выберите школу'); return }
    if (!form.card_no) { setError('Номер карты обязателен'); return }
    try {
      await createStudent({ ...form, school_id: Number(form.school_id) })
      setForm(emptyForm)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при сохранении')
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Удалить ученика «${name}»?`)) return
    await deleteStudent(id)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Ученики</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + Добавить ученика
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Новый ученик</h3>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">ФИО *</label>
              <input
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Номер карты *</label>
              <input
                required
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                value={form.card_no}
                onChange={e => setForm(f => ({ ...f, card_no: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Табельный номер (employee no)</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                value={form.employee_no}
                onChange={e => setForm(f => ({ ...f, employee_no: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Класс</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="например: 5А"
                value={form.grade}
                onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Школа *</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.school_id}
                onChange={e => setForm(f => ({ ...f, school_id: e.target.value }))}
              >
                <option value="">— Выберите школу —</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg">
                Сохранить
              </button>
              <button type="button" onClick={() => { setShowForm(false); setError('') }}
                className="text-gray-500 hover:text-gray-700 text-sm px-3 py-2">
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Поиск по имени..."
          className="border rounded-lg px-3 py-2 text-sm flex-1"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={schoolFilter}
          onChange={e => setSchoolFilter(e.target.value)}
        >
          <option value="">Все школы</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {students.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Нет учеников</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">ФИО</th>
                <th className="px-4 py-3 font-medium">Класс</th>
                <th className="px-4 py-3 font-medium">Школа</th>
                <th className="px-4 py-3 font-medium">Карта</th>
                <th className="px-4 py-3 font-medium">Таб. №</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{s.full_name}</td>
                  <td className="px-4 py-2 text-gray-500">{s.grade || '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{s.school?.name || '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">{s.card_no}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">{s.employee_no || '—'}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDelete(s.id, s.full_name)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400">{students.length} учеников</p>
    </div>
  )
}
