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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// ------------------ Interfaces ------------------
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
  status: 'submitted' | 'approved' | 'rejected'
  submitted_at: string
}

interface Scheme {
  id: string
  name: string
  description: string
  category: string
  benefits: string
  eligibility_criteria: any
  documents_required: string[]
}

// --------------------------------------------------

export default function AdminPage() {
  const router = useRouter()

  // FIXED API URL — Create Scheme will now work
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

  // -----------------------------------------------
  // Safe JSON parser (avoids crash)
  const safeJSON = (text: string) => {
    try {
      return JSON.parse(text || '{}')
    } catch {
      return {}
    }
  }
  // -----------------------------------------------

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

  // ------------------ Load admin data ------------------
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/admin/login')
      return
    }

    const user = JSON.parse(userData)
    if (user.role !== 'admin') {
      alert('Admin access required')
      router.push('/admin/login')
      return
    }

    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [editRes, appRes, schemeRes] = await Promise.all([
        authFetch('/api/admin/edit-requests'),
        authFetch('/api/admin/applications'),
        authFetch('/api/admin/schemes')
      ])

      const editData = await editRes.json()
      const appData = await appRes.json()
      const schemeData = await schemeRes.json()

      setEditRequests(Array.isArray(editData) ? editData : [])
      setApplications(Array.isArray(appData) ? appData : [])
      setSchemes(Array.isArray(schemeData) ? schemeData : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ------------------ ACTION: Approve/Reject Edit ------------------
  const handleEditRequest = async (id: string, action: 'approve' | 'reject') => {
    const res = await authFetch(`/api/admin/edit-request/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action })
    })

    const data = await res.json()
    if (res.ok) {
      alert(`Request ${action}d successfully`)
      fetchData()
    } else {
      alert(data.message || 'Failed to process request')
    }
  }

  // ------------------ ACTION: Approve/Reject Application ------------------
  const handleApplication = async (
    id: string,
    action: 'approve' | 'reject',
    remarks = ''
  ) => {
    const res = await authFetch(`/api/admin/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action, remarks })
    })

    const data = await res.json()
    if (res.ok) {
      alert(`Application ${action}d`)
      fetchData()
    } else {
      alert(data.message || 'Failed to update application')
    }
  }

  // ------------------ SCHEME: Create or Update ------------------
  const submitScheme = async () => {
    const payload = {
      name: schemeForm.name,
      description: schemeForm.description,
      category: schemeForm.category,
      benefits: schemeForm.benefits,
      eligibility_criteria: safeJSON(schemeForm.eligibility_criteria),
      documents_required: schemeForm.documents_required
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
    }

    const path = editingScheme
      ? `/api/admin/schemes/${editingScheme.id}`
      : '/api/admin/schemes'

    const method = editingScheme ? 'PUT' : 'POST'

    const res = await authFetch(path, {
      method,
      body: JSON.stringify(payload)
    })

    const data = await res.json()

    if (res.ok) {
      alert(editingScheme ? 'Scheme updated' : 'Scheme created successfully')
      setIsSchemeDialogOpen(false)
      setEditingScheme(null)
      resetForm()
      fetchData()
    } else {
      alert(data.message || 'Failed to save scheme')
    }
  }

  const openEditScheme = (scheme: Scheme) => {
    setEditingScheme(scheme)
    setSchemeForm({
      name: scheme.name,
      description: scheme.description,
      category: scheme.category,
      benefits: scheme.benefits,
      eligibility_criteria: JSON.stringify(scheme.eligibility_criteria, null, 2),
      documents_required: scheme.documents_required.join(', ')
    })
    setIsSchemeDialogOpen(true)
  }

  const resetForm = () => {
    setSchemeForm({
      name: '',
      description: '',
      category: '',
      benefits: '',
      eligibility_criteria: '',
      documents_required: ''
    })
  }

  const deleteScheme = async (id: string) => {
    if (!confirm('Delete this scheme permanently?')) return

    const res = await authFetch(`/api/admin/schemes/${id}`, {
      method: 'DELETE'
    })

    const data = await res.json()

    if (res.ok) {
      alert('Scheme deleted')
      fetchData()
    } else {
      alert(data.message || 'Delete failed')
    }
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

  const pendingRequests = editRequests.filter(r => r.status === 'pending')
  const pendingApplications = applications.filter(a => a.status === 'submitted')
  const processedApplications = applications.filter(a => a.status !== 'submitted')

  // ------------------ UI Rendering ------------------

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Manage schemes, applications, and edit requests
      </p>

      {/* STAT CARDS */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle>Pending Requests</CardTitle>
            <Clock className="w-4 h-4" />
          </CardHeader>
          <CardContent className="text-2xl">{pendingRequests.length}</CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle>Pending Applications</CardTitle>
            <FileText className="w-4 h-4" />
          </CardHeader>
          <CardContent className="text-2xl">
            {pendingApplications.length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle>Total Schemes</CardTitle>
            <BookOpen className="w-4 h-4" />
          </CardHeader>
          <CardContent className="text-2xl">{schemes.length}</CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle>Total Users</CardTitle>
            <Users className="w-4 h-4" />
          </CardHeader>
          <CardContent className="text-2xl">{applications.length}</CardContent>
        </Card>
      </div>

      {/* TABS */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="edit-requests">Profile Edits</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="schemes">Schemes</TabsTrigger>
        </TabsList>

        {/* ---------------- EDIT REQUESTS ---------------- */}
        <TabsContent value="edit-requests" className="mt-6 space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                No pending requests
              </CardContent>
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

                  <div className="mt-4 flex gap-2">
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

        {/* ---------------- APPLICATIONS ---------------- */}
        <TabsContent value="applications" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingApplications.length === 0 ? (
                <div>No pending applications</div>
              ) : (
                pendingApplications.map(app => (
                  <Card key={app.id} className="mb-3">
                    <CardContent className="pt-4">
                      <p>ID: {app.id}</p>
                      <p>Aadhaar: {app.aadhaar}</p>
                      <p>Scheme: {app.scheme_id}</p>
                      <p>Submitted: {formatDate(app.submitted_at)}</p>

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

        {/* ---------------- SCHEMES ---------------- */}
        <TabsContent value="schemes" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex justify-between">
              <CardTitle>Manage Schemes</CardTitle>
              <Dialog
                open={isSchemeDialogOpen}
                onOpenChange={setIsSchemeDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setEditingScheme(null); }}>
                    <Plus className="mr-2" /> Add Scheme
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingScheme ? 'Edit Scheme' : 'Create Scheme'}</DialogTitle>
                  </DialogHeader>

                  {/* Form */}
                  <div className="space-y-3">
                    <Input
                      placeholder="Name"
                      value={schemeForm.name}
                      onChange={e => setSchemeForm({ ...schemeForm, name: e.target.value })}
                    />
                    <Textarea
                      placeholder="Description"
                      value={schemeForm.description}
                      onChange={e => setSchemeForm({ ...schemeForm, description: e.target.value })}
                    />
                    <Input
                      placeholder="Category"
                      value={schemeForm.category}
                      onChange={e => setSchemeForm({ ...schemeForm, category: e.target.value })}
                    />
                    <Textarea
                      placeholder="Benefits"
                      value={schemeForm.benefits}
                      onChange={e => setSchemeForm({ ...schemeForm, benefits: e.target.value })}
                    />
                    <Textarea
                      placeholder='Eligibility Criteria (JSON)'
                      value={schemeForm.eligibility_criteria}
                      onChange={e => setSchemeForm({ ...schemeForm, eligibility_criteria: e.target.value })}
                      className="font-mono text-sm"
                    />
                    <Input
                      placeholder="Documents (comma separated)"
                      value={schemeForm.documents_required}
                      onChange={e =>
                        setSchemeForm({ ...schemeForm, documents_required: e.target.value })
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
              {schemes.map(scheme => (
                <Card key={scheme.id} className="mt-3">
                  <CardContent className="pt-6 flex justify-between">
                    <div>
                      <h3 className="font-semibold">{scheme.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {scheme.description}
                      </p>
                      <Badge className="mt-2">{scheme.category}</Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => openEditScheme(scheme)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => deleteScheme(scheme.id)}
                      >
                        <Trash2 className="w-4 h-4" />
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
