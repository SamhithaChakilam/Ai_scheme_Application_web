'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'
import { Users, FileText, CheckCircle, XCircle, Clock, AlertCircle, Plus, Edit, Trash2, BookOpen } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

// Types
interface EditRequest {
  id: string
  aadhaar: string
  requested_changes: any
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface Application {
  id: string
  aadhaar: string
  scheme_id: string
  status: string
  submitted_at: string
}

interface Scheme {
  id: string
  name: string
  description: string
  category: string
  benefits: number
  eligibility_criteria: any
  documents_required: string[]
}

export default function AdminPage() {
  const router = useRouter()

  // FIXED: Always fallback to backend URL
  const API =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://ai-scheme-application-web.onrender.com'

  const [editRequests, setEditRequests] = useState<EditRequest[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('edit-requests')

  const [isSchemeDialogOpen, setIsSchemeDialogOpen] = useState(false)
  const [editingScheme, setEditingScheme] = useState<Scheme | null>(null)

  const [schemeForm, setSchemeForm] = useState({
    name: '',
    description: '',
    category: '',
    benefits: '',
    eligibility_criteria: '',
    documents_required: ''
  })

  // Safe JSON parser
  const safeJSON = (t: string) => {
    try {
      return JSON.parse(t || '{}')
    } catch {
      return {}
    }
  }

  // Convert JSON number strings → numbers
  const convertNumbers = (obj: any) => {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && !isNaN(Number(value))) {
        result[key] = Number(value)
      } else {
        result[key] = value
      }
    }
    return result
  }

  // Authenticated fetch wrapper
  const authFetch = async (path: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token')

    return fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        ...(options.headers || {})
      }
    })
  }

  // Load admin data
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) return router.push('/admin/login')

    const user = JSON.parse(userData)
    if (user.role !== 'admin') {
      alert('Admin access required')
      return router.push('/admin/login')
    }

    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [e, a, s] = await Promise.all([
        authFetch('/api/admin/edit-requests'),
        authFetch('/api/admin/applications'),
        authFetch('/api/admin/schemes')
      ])

      setEditRequests(await e.json())
      setApplications(await a.json())
      setSchemes(await s.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Approve / Reject edit request
  const handleEditRequest = async (id: string, action: 'approve' | 'reject') => {
    const r = await authFetch(`/api/admin/edit-request/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action })
    })
    r.ok ? fetchData() : alert('Failed to process')
  }

  // Approve / Reject application
  const handleApplication = async (
    id: string,
    action: 'approve' | 'reject',
    remarks = ''
  ) => {
    const r = await authFetch(`/api/admin/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action, remarks })
    })
    r.ok ? fetchData() : alert('Failed to process')
  }

  // Create or Update Scheme
  const submitScheme = async () => {
    const eligibilityObj = convertNumbers(safeJSON(schemeForm.eligibility_criteria))

    const payload = {
      name: schemeForm.name,
      description: schemeForm.description,
      category: schemeForm.category,
      benefits: Number(schemeForm.benefits),
      eligibility_criteria: eligibilityObj,
      documents_required: schemeForm.documents_required
        .split(',')
        .map(x => x.trim())
        .filter(Boolean)
    }

    const route = editingScheme
      ? `/api/admin/schemes/${editingScheme.id}`
      : '/api/admin/schemes'

    const method = editingScheme ? 'PUT' : 'POST'

    const r = await authFetch(route, { method, body: JSON.stringify(payload) })
    const data = await r.json()

    if (r.ok) {
      alert(editingScheme ? 'Updated!' : 'Created!')
      setIsSchemeDialogOpen(false)
      setEditingScheme(null)
      resetForm()
      fetchData()
    } else {
      alert(data.message || 'Failed to create scheme')
    }
  }

  const resetForm = () =>
    setSchemeForm({
      name: '',
      description: '',
      category: '',
      benefits: '',
      eligibility_criteria: '',
      documents_required: ''
    })

  const openEdit = (scheme: Scheme) => {
    setEditingScheme(scheme)
    setSchemeForm({
      name: scheme.name,
      description: scheme.description,
      category: scheme.category,
      benefits: String(scheme.benefits),
      eligibility_criteria: JSON.stringify(
        scheme.eligibility_criteria,
        null,
        2
      ),
      documents_required: scheme.documents_required.join(', ')
    })
    setIsSchemeDialogOpen(true)
  }

  const deleteScheme = async (id: string) => {
    if (!confirm('Delete scheme permanently?')) return
    const r = await authFetch(`/api/admin/schemes/${id}`, { method: 'DELETE' })
    r.ok ? fetchData() : alert('Delete failed')
  }

  const pendingRequests = editRequests.filter(r => r.status === 'pending')
  const pendingApps = applications.filter(a => a.status === 'submitted')
  const processedApps = applications.filter(a => a.status !== 'submitted')

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-8">Manage everything easily</p>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle>Pending Requests</CardTitle>
            <Clock />
          </CardHeader>
          <CardContent className="text-2xl">{pendingRequests.length}</CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle>Pending Applications</CardTitle>
            <FileText />
          </CardHeader>
          <CardContent className="text-2xl">{pendingApps.length}</CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle>Total Schemes</CardTitle>
            <BookOpen />
          </CardHeader>
          <CardContent className="text-2xl">{schemes.length}</CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle>Total Users</CardTitle>
            <Users />
          </CardHeader>
          <CardContent className="text-2xl">{applications.length}</CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="edit-requests">Profile Edits</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="schemes">Schemes</TabsTrigger>
        </TabsList>

        {/* Edit Requests */}
        <TabsContent value="edit-requests" className="mt-6 space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">No pending requests</CardContent>
            </Card>
          ) : (
            pendingRequests.map(req => (
              <Card key={req.id}>
                <CardHeader>
                  <CardTitle>Edit Request</CardTitle>
                  <CardDescription>ID: {req.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-3 rounded text-sm">
                    {JSON.stringify(req.requested_changes, null, 2)}
                  </pre>

                  <div className="flex gap-2 mt-4">
                    <Button
                      className="bg-success"
                      onClick={() => handleEditRequest(req.id, 'approve')}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleEditRequest(req.id, 'reject')}
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Applications */}
        <TabsContent value="applications" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingApps.length === 0 ? (
                <div>No pending applications</div>
              ) : (
                pendingApps.map(app => (
                  <Card key={app.id} className="mt-3">
                    <CardContent className="pt-6">
                      <p>ID: {app.id}</p>
                      <p>Aadhaar: {app.aadhaar}</p>
                      <p>Scheme: {app.scheme_id}</p>

                      <div className="flex gap-2 mt-4">
                        <Button
                          className="bg-success"
                          onClick={() => handleApplication(app.id, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() =>
                            handleApplication(app.id, 'reject', 'Not eligible')
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schemes */}
        <TabsContent value="schemes" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex justify-between">
              <CardTitle>Manage Schemes</CardTitle>

              {/* Add/Edit Scheme Modal */}
              <Dialog open={isSchemeDialogOpen} onOpenChange={setIsSchemeDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      resetForm()
                      setEditingScheme(null)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Scheme
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingScheme ? 'Edit Scheme' : 'Create Scheme'}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-3">
                    <Input
                      placeholder="Scheme Name"
                      value={schemeForm.name}
                      onChange={e =>
                        setSchemeForm({ ...schemeForm, name: e.target.value })
                      }
                    />

                    <Textarea
                      placeholder="Description"
                      value={schemeForm.description}
                      onChange={e =>
                        setSchemeForm({
                          ...schemeForm,
                          description: e.target.value
                        })
                      }
                    />

                    <Input
                      placeholder="Category"
                      value={schemeForm.category}
                      onChange={e =>
                        setSchemeForm({ ...schemeForm, category: e.target.value })
                      }
                    />

                    <Input
                      placeholder="Benefits (number)"
                      value={schemeForm.benefits}
                      onChange={e =>
                        setSchemeForm({ ...schemeForm, benefits: e.target.value })
                      }
                    />

                    <Textarea
                      placeholder='Eligibility Criteria (JSON)\nExample: {"min_age": 18, "max_income": 200000}'
                      className="font-mono text-sm"
                      value={schemeForm.eligibility_criteria}
                      onChange={e =>
                        setSchemeForm({
                          ...schemeForm,
                          eligibility_criteria: e.target.value
                        })
                      }
                    />

                    <Input
                      placeholder="Documents (comma separated)"
                      value={schemeForm.documents_required}
                      onChange={e =>
                        setSchemeForm({
                          ...schemeForm,
                          documents_required: e.target.value
                        })
                      }
                    />

                    <Button className="w-full" onClick={submitScheme}>
                      {editingScheme ? 'Update Scheme' : 'Create Scheme'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent>
              {schemes.map(s => (
                <Card key={s.id} className="mb-3">
                  <CardContent className="pt-6 flex justify-between">
                    <div>
                      <h3 className="font-semibold">{s.name}</h3>
                      <p className="text-muted-foreground">{s.description}</p>
                      <Badge className="mt-2">{s.category}</Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => openEdit(s)}>
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={() => deleteScheme(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
