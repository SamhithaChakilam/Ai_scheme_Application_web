'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, FileText, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface Scheme {
  id: string
  name: string
  description: string
  category: string
  benefits: string
  eligibility_criteria: any
  documents_required: string[]
  application_start_date?: string
  application_end_date?: string
  requires_income_cert?: boolean
  requires_caste_cert?: boolean
}

export default function SchemeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const schemeId = params.id as string

  const API = process.env.NEXT_PUBLIC_API_URL || 'https://ai-scheme-application-web.onrender.com'

  const [scheme, setScheme] = useState<Scheme | null>(null)
  const [isEligible, setIsEligible] = useState(false)
  const [eligibilityChecked, setEligibilityChecked] = useState(false)
  const [confidence, setConfidence] = useState(0)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [showApplicationDialog, setShowApplicationDialog] = useState(false)
  const [useAutofill, setUseAutofill] = useState(true)
  const [incomeCertFile, setIncomeCertFile] = useState<File | null>(null)
  const [casteCertFile, setCasteCertFile] = useState<File | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    fetchSchemeAndCheckEligibility()
  }, [schemeId, router])

  const fetchSchemeAndCheckEligibility = async () => {
    try {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')

      // ---------- FIXED URL ---------
      const schemeResponse = await fetch(`${API}/api/schemes/${schemeId}`)

      const schemeData = await schemeResponse.json()
      setScheme(schemeData)

      if (userData) {
        const user = JSON.parse(userData)

        // ---------- FIXED URL ---------
        const eligibilityResponse = await fetch(`${API}/api/schemes/eligible`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        const eligibilityData = await eligibilityResponse.json()
        const eligible = eligibilityData.eligible_schemes?.some((s: any) => s.id === schemeId)
        const eligibleScheme = eligibilityData.eligible_schemes?.find((s: any) => s.id === schemeId)

        setIsEligible(eligible)
        setConfidence(eligibleScheme?.eligibility_confidence || 0)
        setEligibilityChecked(true)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    setShowApplicationDialog(true)
  }

  const handleSubmitApplication = async () => {
    setApplying(true)

    try {
      const token = localStorage.getItem('token')

      const documents: any = {}
      if (incomeCertFile) documents.income_certificate = 'uploaded'
      if (casteCertFile) documents.caste_certificate = 'uploaded'

      // ---------- FIXED URL ---------
      const response = await fetch(`${API}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          scheme_id: schemeId,
          use_autofill: useAutofill,
          documents
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert('Application submitted successfully!')
        setShowApplicationDialog(false)
        router.push('/applications')
      } else {
        alert(data.message || 'Failed to submit application')
      }
    } catch (error) {
      alert('Error submitting application')
    } finally {
      setApplying(false)
    }
  }

  const isApplicationActive = () => {
    if (!scheme?.application_start_date || !scheme?.application_end_date) return true

    const now = new Date()
    const start = new Date(scheme.application_start_date)
    const end = new Date(scheme.application_end_date)

    return now >= start && now <= end
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading || !scheme) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading scheme details...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">

        {/* Back Button */}
        <Link href="/schemes" className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Schemes
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <Badge variant="secondary" className="mb-2 w-fit">
                  {scheme.category}
                </Badge>
                <CardTitle className="text-2xl">{scheme.name}</CardTitle>
                <CardDescription className="text-base">{scheme.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Benefits */}
                <div>
                  <h3 className="mb-2 font-semibold">Benefits</h3>
                  <div className="rounded-lg bg-primary/5 p-4">
                    <p className="text-sm">{scheme.benefits}</p>
                  </div>
                </div>

                {/* Eligibility */}
                <div>
                  <h3 className="mb-3 font-semibold">Eligibility Criteria</h3>
                  <div className="space-y-2 text-sm">
                    {scheme.eligibility_criteria.min_age && (
                      <p>Minimum age: {scheme.eligibility_criteria.min_age} years</p>
                    )}
                    {scheme.eligibility_criteria.max_age && (
                      <p>Maximum age: {scheme.eligibility_criteria.max_age} years</p>
                    )}
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <h3 className="mb-3 font-semibold">Required Documents</h3>
                  <div className="space-y-2">
                    {scheme.documents_required.map((doc, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{doc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className={isEligible ? 'border-green-500' : 'border-red-500'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {isEligible ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      You're Eligible!
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      Not Eligible
                    </>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent>
                {isEligible ? (
                  <Button className="w-full" disabled={!isApplicationActive()} onClick={handleApply}>
                    {isApplicationActive() ? 'Apply Now' : 'Applications Closed'}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">You do not meet the criteria.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Application Dialog */}
      <Dialog open={showApplicationDialog} onOpenChange={setShowApplicationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for {scheme.name}</DialogTitle>
            <DialogDescription>Submit your application</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button className="w-full" onClick={handleSubmitApplication} disabled={applying}>
              {applying ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
