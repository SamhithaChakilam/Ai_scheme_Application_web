'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, FileText, Clock } from 'lucide-react'
import Link from 'next/link'

interface Application {
  id: string
  scheme_id: string
  status: string
  submitted_at: string
  updated_at?: string
  user_data: {
    name: string
    email: string
    phone: string
  }
}

interface Scheme {
  name: string
  category: string
  description: string
  benefits: string
}

export default function ApplicationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const API = process.env.NEXT_PUBLIC_API_URL || 'https://ai-scheme-application-web.onrender.com'
  const applicationId = params.id as string

  const [application, setApplication] = useState<Application | null>(null)
  const [scheme, setScheme] = useState<Scheme | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchApplicationDetails()
  }, [applicationId, router])

  const fetchApplicationDetails = async () => {
    try {
      const token = localStorage.getItem('token')

      // Fetch application
      const appResponse = await fetch(`${API}/api/applications/${applicationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const appData = await appResponse.json()
      setApplication(appData)

      // Fetch scheme details
      const schemeResponse = await fetch(`${API}/api/schemes/${appData.scheme_id}`)
      const schemeData = await schemeResponse.json()
      setScheme(schemeData)

    } catch (error) {
      console.error('Error fetching details:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading || !application || !scheme) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading application details...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/applications" className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Applications
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* MAIN CONTENT */}
          <div className="lg:col-span-2 space-y-6">

            {/* APPLICATION DETAILS */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Application Details</CardTitle>
                    <CardDescription className="mt-1">
                      Application ID: {application.id}
                    </CardDescription>
                  </div>

                  <Badge 
                    variant={application.status === 'approved' ? 'default' : application.status === 'rejected' ? 'destructive' : 'outline'}
                    className={
                      application.status === 'approved' ? 'bg-success text-success-foreground' :
                      application.status === 'submitted' ? 'bg-warning/10 text-warning border-warning' : ''
                    }
                  >
                    {application.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  
                  {/* Scheme Info */}
                  <div>
                    <h3 className="mb-2 font-semibold">Scheme Information</h3>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="secondary">{scheme.category}</Badge>
                      </div>
                      <p className="mb-1 text-lg font-semibold">{scheme.name}</p>
                      <p className="text-sm text-muted-foreground">{scheme.description}</p>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div>
                    <h3 className="mb-2 font-semibold">Benefits</h3>
                    <div className="rounded-lg bg-primary/5 p-4">
                      <p className="text-sm">{scheme.benefits}</p>
                    </div>
                  </div>

                  {/* Applicant Info */}
                  <div>
                    <h3 className="mb-2 font-semibold">Applicant Information</h3>
                    <div className="space-y-2 rounded-lg border p-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{application.user_data.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{application.user_data.email}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">{application.user_data.phone}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* TIMELINE */}
            <Card>
              <CardHeader>
                <CardTitle>Application Timeline</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">

                  {/* Submitted */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <div className="h-full w-0.5 bg-primary" />
                    </div>

                    <div className="flex-1 pb-4">
                      <p className="font-semibold">Application Submitted</p>
                      <p className="text-sm text-muted-foreground">{formatDate(application.submitted_at)}</p>
                    </div>
                  </div>

                  {/* Under Review */}
                  {(application.status === 'under_review' || application.status === 'approved' || application.status === 'rejected') && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <FileText className="h-4 w-4" />
                        </div>

                        {(application.status === 'approved' || application.status === 'rejected') && (
                          <div className="h-full w-0.5 bg-primary" />
                        )}
                      </div>

                      <div className="flex-1 pb-4">
                        <p className="font-semibold">Under Review</p>
                        <p className="text-sm text-muted-foreground">
                          {application.updated_at ? formatDate(application.updated_at) : 'In progress'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Approved */}
                  {application.status === 'approved' && (
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-success-foreground">
                        <CheckCircle className="h-4 w-4" />
                      </div>

                      <div className="flex-1">
                        <p className="font-semibold text-success">Application Approved</p>
                        <p className="text-sm text-muted-foreground">
                          {application.updated_at ? formatDate(application.updated_at) : 'Recently'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Rejected */}
                  {application.status === 'rejected' && (
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                        <XCircle className="h-4 w-4" />
                      </div>

                      <div className="flex-1">
                        <p className="font-semibold text-destructive">Application Rejected</p>
                        <p className="text-sm text-muted-foreground">
                          {application.updated_at ? formatDate(application.updated_at) : 'Recently'}
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>

          </div>

          {/* SIDEBAR */}
          <div className="space-y-4">

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Status</CardTitle>
              </CardHeader>

              <CardContent>
                {application.status === 'submitted' && (
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 text-warning" />
                    <div>
                      <p className="mb-1 font-semibold">Pending Review</p>
                      <p className="text-sm text-muted-foreground">
                        Your application has been submitted and is awaiting review.
                      </p>
                    </div>
                  </div>
                )}

                {application.status === 'under_review' && (
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 text-accent" />
                    <div>
                      <p className="mb-1 font-semibold">Under Review</p>
                      <p className="text-sm text-muted-foreground">
                        Your application is currently under review.
                      </p>
                    </div>
                  </div>
                )}

                {application.status === 'approved' && (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 text-success" />
                    <div>
                      <p className="mb-1 font-semibold text-success">Approved</p>
                      <p className="text-sm text-muted-foreground">
                        Congratulations! Your application is approved.
                      </p>
                    </div>
                  </div>
                )}

                {application.status === 'rejected' && (
                  <div className="flex items-start gap-3">
                    <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
                    <div>
                      <p className="mb-1 font-semibold text-destructive">Rejected</p>
                      <p className="text-sm text-muted-foreground">
                        Unfortunately, your application was rejected.
                      </p>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Help */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Have questions about your application?
                </p>
                <Button variant="outline" className="w-full">
                  Contact Support
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}
