'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { Clock, CheckCircle, XCircle, FileSearch, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Application {
  id: string
  scheme_id: string
  status: 'submitted' | 'under_review' | 'approved' | 'rejected'
  submitted_at: string
  updated_at?: string
}

interface SchemeDetails {
  [key: string]: {
    name: string
    category: string
  }
}

export default function ApplicationsPage() {
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [schemeDetails, setSchemeDetails] = useState<SchemeDetails>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    fetchApplications()
  }, [router])

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Fetch user applications
      const appsResponse = await fetch('http://localhost:5000/api/applications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const appsData = await appsResponse.json()
      setApplications(appsData)

      // Fetch scheme details for each application
      const schemesResponse = await fetch('http://localhost:5000/api/schemes')
      const schemesData = await schemesResponse.json()
      
      const details: SchemeDetails = {}
      schemesData.forEach((scheme: any) => {
        details[scheme.id] = {
          name: scheme.name,
          category: scheme.category
        }
      })
      setSchemeDetails(details)

    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="h-5 w-5 text-warning" />
      case 'under_review':
        return <FileSearch className="h-5 w-5 text-accent" />
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-success" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-destructive" />
      default:
        return <AlertCircle className="h-5 w-5" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      'submitted': 'outline',
      'under_review': 'secondary',
      'approved': 'default',
      'rejected': 'destructive'
    }
    
    return (
      <Badge variant={variants[status] || 'outline'} className={
        status === 'approved' ? 'bg-success text-success-foreground' :
        status === 'submitted' ? 'bg-warning/10 text-warning border-warning' : ''
      }>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">My Applications</h1>
          <p className="text-muted-foreground">
            Track the status of your scheme applications
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {applications.filter(a => a.status === 'submitted' || a.status === 'under_review').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {applications.filter(a => a.status === 'approved').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {applications.filter(a => a.status === 'rejected').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Applications List */}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading your applications...</p>
            </CardContent>
          </Card>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileSearch className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Applications Yet</h3>
              <p className="mb-4 text-muted-foreground">
                You haven't applied to any schemes yet. Start exploring eligible schemes!
              </p>
              <Link href="/dashboard">
                <Button>View Eligible Schemes</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => {
              const scheme = schemeDetails[application.scheme_id]
              
              return (
                <Card key={application.id} className="transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          {scheme && (
                            <Badge variant="secondary">{scheme.category}</Badge>
                          )}
                          {getStatusBadge(application.status)}
                        </div>
                        <CardTitle className="mb-1 text-xl">
                          {scheme?.name || application.scheme_id}
                        </CardTitle>
                        <CardDescription>
                          Application ID: {application.id}
                        </CardDescription>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusIcon(application.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1 text-sm">
                        <p className="text-muted-foreground">
                          Submitted on: <span className="font-medium text-foreground">{formatDate(application.submitted_at)}</span>
                        </p>
                        {application.updated_at && (
                          <p className="text-muted-foreground">
                            Last updated: <span className="font-medium text-foreground">{formatDate(application.updated_at)}</span>
                          </p>
                        )}
                      </div>
                      
                      <Link href={`/applications/${application.id}`}>
                        <Button variant="outline">View Details</Button>
                      </Link>
                    </div>

                    {/* Status Timeline */}
                    <div className="mt-6 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div className={`flex flex-col items-center ${application.status === 'submitted' || application.status === 'under_review' || application.status === 'approved' ? 'text-primary' : 'text-muted-foreground'}`}>
                          <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full ${application.status === 'submitted' || application.status === 'under_review' || application.status === 'approved' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <CheckCircle className="h-4 w-4" />
                          </div>
                          <span className="text-xs">Submitted</span>
                        </div>
                        
                        <div className={`h-0.5 flex-1 ${application.status === 'under_review' || application.status === 'approved' ? 'bg-primary' : 'bg-muted'}`} />
                        
                        <div className={`flex flex-col items-center ${application.status === 'under_review' || application.status === 'approved' ? 'text-primary' : 'text-muted-foreground'}`}>
                          <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full ${application.status === 'under_review' || application.status === 'approved' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <FileSearch className="h-4 w-4" />
                          </div>
                          <span className="text-xs">Review</span>
                        </div>
                        
                        <div className={`h-0.5 flex-1 ${application.status === 'approved' ? 'bg-primary' : 'bg-muted'}`} />
                        
                        <div className={`flex flex-col items-center ${application.status === 'approved' ? 'text-success' : application.status === 'rejected' ? 'text-destructive' : 'text-muted-foreground'}`}>
                          <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full ${application.status === 'approved' ? 'bg-success text-success-foreground' : application.status === 'rejected' ? 'bg-destructive text-destructive-foreground' : 'bg-muted'}`}>
                            {application.status === 'approved' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : application.status === 'rejected' ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                          <span className="text-xs">
                            {application.status === 'approved' ? 'Approved' : application.status === 'rejected' ? 'Rejected' : 'Decision'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
