import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getStats = () => api.get('/stats')
export const getEvents = (params) => api.get('/events', { params })
export const getStudents = (params) => api.get('/students', { params })
export const createStudent = (data) => api.post('/students', data)
export const updateStudent = (id, data) => api.put(`/students/${id}`, data)
export const deleteStudent = (id) => api.delete(`/students/${id}`)
export const getSchools = () => api.get('/schools')
export const createSchool = (data) => api.post('/schools', data)
export const deleteSchool = (id) => api.delete(`/schools/${id}`)

export default api
