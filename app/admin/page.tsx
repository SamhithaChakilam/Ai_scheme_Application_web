'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'
import { Users, FileText, CheckCircle, XCircle, Clock, AlertCircle, Plus, Edit, Trash2, BookOpen } from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface EditRequest {
  id: string
  aadhaar: string
  requested_changes: any
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  processed_at?: string
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
  benefits: string
  eligibility_criteria: any
  documents_required: string[]
}

export default function AdminPage() {
  const router = useRouter()
  // Read client env var
  const API = process.env.NEXT_PUBLIC_API_URL || ''

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

  // small helpers to avoid crashes on invalid JSON/responses
  const parseJSON = async (res: Response) => {
    try {
      return await res.json()
    } catch {
      return null
    }
  }

  const safeParseCriteria = (text: string) => {
    try {
      return text ? JSON.parse(text) : {}
    } catch {
      return {}
    }
  }

  // wrapper to centralize API presence check and token header
  const apiFetch = async (path: string, opts: RequestInit = {}) => {
    if (!API) {
      console.error('NEXT_PUBLIC_API_URL is not configured. Set it in your environment variables.')
      // return a Response-like object to keep callers safe
      return new Response(JSON.stringify({ message: 'API not configured' }), { status: 500 })
    }

    const token = localStorage.getItem('token')
    const headers: HeadersInit = opts.headers ? { ...(opts.headers as HeadersInit) } : {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    return fetch(`${API}${path}`, {
      ...opts,
      headers
    })
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const fetchData = async () => {
    try {
      setLoading(true)

      // if API missing, short-circuit to empty lists (prevents crashes during build)
      if (!API) {
        setEditRequests([])
        setApplications([])
        setSchemes([])
        return
      }

      const [editResponse, appResponse, schemeResponse] = await Promise.all([
        apiFetch('/api/admin/edit-requests'),
        apiFetch('/api/admin/applications'),
        apiFetch('/api/admin/schemes')
      ])

      const editData = editResponse.ok ? (await parseJSON(editResponse)) : []
      const appData = appResponse.ok ? (await parseJSON(appResponse)) : []
      const schemeData = schemeResponse.ok ? (await parseJSON(schemeResponse)) : []

      setEditRequests(Array.isArray(editData) ? editData : [])
      setApplications(Array.isArray(appData) ? appData : [])
      setSchemes(Array.isArray(schemeData) ? schemeData : [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setEditRequests([])
      setApplications([])
      setSchemes([])
    } finally {
      setLoading(false)
    }
  }

  const handleEditRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      if (!API) return alert('API not configured')
      const response = await apiFetch(`/api/admin/edit-request/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const data = await parseJSON(response) || {}

      if (response.ok) {
        alert(`Request ${action}d successfully!`)
        fetchData()
      } else {
        alert(data.message || 'Failed to process request')
      }
    } catch (error) {
      console.error(error)
      alert('Error processing request')
    }
  }

  const handleApplication = async (appId: string, action: 'approve' | 'reject', remarks: string = '') => {
    try {
      if (!API) return alert('API not configured')
      const response = await apiFetch(`/api/admin/applications/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remarks })
      })

      const data = await parseJSON(response) || {}

      if (response.ok) {
        alert(`Application ${action}d successfully!`)
        fetchData()
      } else {
        alert(data.message || 'Failed to process application')
      }
    } catch (error) {
      console.error(error)
      alert('Error processing application')
    }
  }

  const handleCreateScheme = async () => {
    try {
      if (!API) return alert('API not configured')
      const schemeData = {
        ...schemeForm,
        eligibility_criteria: safeParseCriteria(schemeForm.eligibility_criteria),
        documents_required: schemeForm.documents_required ? schemeForm.documents_required.split(',').map(d => d.trim()) : []
      }

      const response = await apiFetch('/api/admin/schemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schemeData)
      })

      const data = await parseJSON(response) || {}

      if (response.ok) {
        alert('Scheme created successfully!')
        setIsSchemeDialogOpen(false)
        resetSchemeForm()
        fetchData()
      } else {
        alert(data.message || 'Failed to create scheme')
      }
    } catch (error) {
      console.error(error)
      alert('Error creating scheme')
    }
  }

  const handleUpdateScheme = async () => {
    if (!editingScheme) return

    try {
      if (!API) return alert('API not configured')
      const schemeData = {
        ...schemeForm,
        eligibility_criteria: safeParseCriteria(schemeForm.eligibility_criteria),
        documents_required: schemeForm.documents_required ? schemeForm.documents_required.split(',').map(d => d.trim()) : []
      }

      const response = await apiFetch(`/api/admin/schemes/${editingScheme.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schemeData)
      })

      const data = await parseJSON(response) || {}

      if (response.ok) {
        alert('Scheme updated successfully!')
        setIsSchemeDialogOpen(false)
        setEditingScheme(null)
        resetSchemeForm()
        fetchData()
      } else {
        alert(data.message || 'Failed to update scheme')
      }
    } catch (error) {
      console.error(error)
      alert('Error updating scheme')
    }
  }

  const handleDeleteScheme = async (schemeId: string) => {
    if (!confirm('Are you sure you want to delete this scheme?')) return

    try {
      if (!API) return alert('API not configured')
      const response = await apiFetch(`/api/admin/schemes/${schemeId}`, {
        method: 'DELETE'
      })

      const data = await parseJSON(response) || {}

      if (response.ok) {
        alert('Scheme deleted successfully!')
        fetchData()
      } else {
        alert(data.message || 'Failed to delete scheme')
      }
    } catch (error) {
      console.error(error)
      alert('Error deleting scheme')
    }
  }

  const openSchemeDialog = (scheme?: Scheme) => {
    if (scheme) {
      setEditingScheme(scheme)
      setSchemeForm({
        name: scheme.name,
        description: scheme.description,
        category: scheme.category,
        benefits: scheme.benefits,
        eligibility_criteria: JSON.stringify(scheme.eligibility_criteria || {}, null, 2),
        documents_required: (scheme.documents_required || []).join(', ')
      })
    } else {
      setEditingScheme(null)
      resetSchemeForm()
    }
    setIsSchemeDialogOpen(true)
  }

  const resetSchemeForm = () => {
    setSchemeForm({
      name: '',
      description: '',
      category: '',
      benefits: '',
      eligibility_criteria: '',
      documents_required: ''
    })
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const pendingRequests = editRequests.filter(r => r.status === 'pending')
  const pendingApplications = applications.filter(a => a.status === 'submitted')
  const processedApplications = applications.filter(a => a.status !== 'submitted')

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage schemes, applications, and edit requests
            </p>
          </div>
          <Button onClick={() => router.push('/')}>Back to Home</Button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{pendingRequests.length}</div>
              <p className="text-xs text-muted-foreground">Edit requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{pendingApplications.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Schemes</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{schemes.length}</div>
              <p className="text-xs text-muted-foreground">Active schemes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
              <p className="text-xs text-muted-foreground">Applications filed</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs (rest of UI unchanged) */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="edit-requests">
              Profile Edits
              {pendingRequests.length > 0 && <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="applications">
              Applications
              {pendingApplications.length > 0 && <Badge variant="destructive" className="ml-2">{pendingApplications.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="schemes">Schemes</TabsTrigger>
          </TabsList>

          {/* Edit Requests Tab */}
          <TabsContent value="edit-requests" className="space-y-4">
            {loading ? (
              <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Loading requests...</p></CardContent></Card>
            ) : pendingRequests.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><CheckCircle className="mx-auto mb-4 h-12 w-12 text-success" /><h3 className="mb-2 text-lg font-semibold">All Caught Up!</h3><p className="text-muted-foreground">No pending edit requests at this time</p></CardContent></Card>
            ) : (
              pendingRequests.map((request) => (
                <Card key={request.id} className="border-warning/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-warning" />Edit Request</CardTitle>
                        <CardDescription className="mt-1">Request ID: {request.id}</CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning">PENDING</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 rounded-lg border p-4">
                        <h4 className="text-sm font-semibold text-muted-foreground">User Information</h4>
                        <div className="space-y-1">
                          <p className="text-sm"><span className="text-muted-foreground">Aadhaar:</span> <span className="font-medium">{request.aadhaar}</span></p>
                          <p className="text-sm"><span className="text-muted-foreground">Submitted:</span> <span className="font-medium">{formatDate(request.created_at)}</span></p>
                        </div>
                      </div>

                      <div className="space-y-2 rounded-lg border p-4">
                        <h4 className="text-sm font-semibold text-muted-foreground">Requested Changes</h4>
                        <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(request.requested_changes, null, 2)}</pre>
                      </div>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-4">
                      <h4 className="mb-2 text-sm font-semibold">Reason for Change</h4>
                      <p className="text-sm text-muted-foreground">{request.reason}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => handleEditRequest(request.id, 'approve')} className="bg-success hover:bg-success/90"><CheckCircle className="mr-2 h-4 w-4" />Approve</Button>
                      <Button onClick={() => handleEditRequest(request.id, 'reject')} variant="destructive"><XCircle className="mr-2 h-4 w-4" />Reject</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-4">
            {/* pendingApplications card (unchanged) */}
            <Card>
              <CardHeader><CardTitle>Pending Applications</CardTitle><CardDescription>Review and process scheme applications</CardDescription></CardHeader>
              <CardContent>
                {pendingApplications.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No pending applications</div>
                ) : (
                  <div className="space-y-4">
                    {pendingApplications.map((app) => (
                      <Card key={app.id}>
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold">{app.id}</h4>
                                <p className="text-sm text-muted-foreground">Scheme: {app.scheme_id}</p>
                                <p className="text-sm text-muted-foreground">Aadhaar: {app.aadhaar}</p>
                                <p className="text-sm text-muted-foreground">Submitted: {formatDate(app.submitted_at)}</p>
                              </div>
                              <Badge>{app.status}</Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleApplication(app.id, 'approve')} className="bg-success hover:bg-success/90"><CheckCircle className="mr-2 h-4 w-4" />Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleApplication(app.id, 'reject', 'Does not meet eligibility criteria')}><XCircle className="mr-2 h-4 w-4" />Reject</Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Processed Applications</CardTitle></CardHeader>
              <CardContent>
                {processedApplications.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No processed applications yet</div>
                ) : (
                  <div className="space-y-3">
                    {processedApplications.map((app) => (
                      <div key={app.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{app.id}</p>
                          <p className="text-sm text-muted-foreground">{app.scheme_id}</p>
                        </div>
                        <Badge variant={app.status === 'approved' ? 'default' : 'destructive'}>{app.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schemes management (unchanged) */}
          <TabsContent value="schemes" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Scheme Management</CardTitle>
                    <CardDescription>Add, edit, or remove government schemes</CardDescription>
                  </div>
                  <Dialog open={isSchemeDialogOpen} onOpenChange={setIsSchemeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => openSchemeDialog()}><Plus className="mr-2 h-4 w-4" />Add Scheme</Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{editingScheme ? 'Edit Scheme' : 'Add New Scheme'}</DialogTitle>
                        <DialogDescription>{editingScheme ? 'Update scheme details' : 'Create a new government scheme'}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Scheme Name</Label>
                          <Input id="name" value={schemeForm.name} onChange={(e) => setSchemeForm({...schemeForm, name: e.target.value})} placeholder="e.g., PM-KISAN" />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" value={schemeForm.description} onChange={(e) => setSchemeForm({...schemeForm, description: e.target.value})} placeholder="Brief description of the scheme" />
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Input id="category" value={schemeForm.category} onChange={(e) => setSchemeForm({...schemeForm, category: e.target.value})} placeholder="e.g., Agriculture, Education, Health" />
                        </div>
                        <div>
                          <Label htmlFor="benefits">Benefits</Label>
                          <Textarea id="benefits" value={schemeForm.benefits} onChange={(e) => setSchemeForm({...schemeForm, benefits: e.target.value})} placeholder="What beneficiaries will receive" />
                        </div>
                        <div>
                          <Label htmlFor="eligibility">Eligibility Criteria (JSON)</Label>
                          <Textarea id="eligibility" value={schemeForm.eligibility_criteria} onChange={(e) => setSchemeForm({...schemeForm, eligibility_criteria: e.target.value})} placeholder='{"min_age": 18, "max_income": 200000}' className="font-mono text-sm" />
                        </div>
                        <div>
                          <Label htmlFor="documents">Documents Required (comma-separated)</Label>
                          <Input id="documents" value={schemeForm.documents_required} onChange={(e) => setSchemeForm({...schemeForm, documents_required: e.target.value})} placeholder="Aadhaar Card, Income Certificate, Bank Account" />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={editingScheme ? handleUpdateScheme : handleCreateScheme} className="flex-1">{editingScheme ? 'Update Scheme' : 'Create Scheme'}</Button>
                          <Button variant="outline" onClick={() => { setIsSchemeDialogOpen(false); setEditingScheme(null); resetSchemeForm(); }}>Cancel</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {schemes.map((scheme) => (
                    <Card key={scheme.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{scheme.name}</h4>
                            <p className="text-sm text-muted-foreground">{scheme.description}</p>
                            <div className="mt-2 flex gap-2"><Badge variant="outline">{scheme.category}</Badge></div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openSchemeDialog(scheme)}><Edit className="h-4 w-4" /></Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteScheme(scheme.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
