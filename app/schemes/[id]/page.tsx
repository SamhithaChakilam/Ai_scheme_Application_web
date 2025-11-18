'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, FileText, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog'
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

      // Fetch scheme details
      const schemeResponse = await fetch(`http://localhost:5000/api/schemes/${schemeId}`)
      const schemeData = await schemeResponse.json()
      setScheme(schemeData)

      // Check eligibility
      if (userData) {
        const user = JSON.parse(userData)
        const eligibilityResponse = await fetch('http://localhost:5000/api/schemes/eligible', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ user_profile: user })
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
      
      // Check if required documents are uploaded
      if (scheme?.requires_income_cert && !incomeCertFile) {
        alert('Please upload income certificate')
        setApplying(false)
        return
      }
      
      if (scheme?.requires_caste_cert && !casteCertFile) {
        alert('Please upload caste certificate')
        setApplying(false)
        return
      }

      const documents: any = {}
      if (incomeCertFile) {
        documents.income_certificate = 'uploaded'
      }
      if (casteCertFile) {
        documents.caste_certificate = 'uploaded'
      }

      const response = await fetch('http://localhost:5000/api/applications', {
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
        <Link href="/schemes" className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Schemes
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <Badge variant="secondary" className="mb-2 w-fit">
                  {scheme.category}
                </Badge>
                <CardTitle className="text-2xl">{scheme.name}</CardTitle>
                <CardDescription className="text-base">
                  {scheme.description}
                </CardDescription>
                
                {(scheme.application_start_date || scheme.application_end_date) && (
                  <div className="mt-4 rounded-lg border bg-muted/50 p-4">
                    <h4 className="mb-2 text-sm font-semibold">Application Period</h4>
                    <div className="flex items-center gap-4 text-sm">
                      {scheme.application_start_date && (
                        <div>
                          <span className="text-muted-foreground">Start: </span>
                          <span className="font-medium">{formatDate(scheme.application_start_date)}</span>
                        </div>
                      )}
                      {scheme.application_end_date && (
                        <div>
                          <span className="text-muted-foreground">End: </span>
                          <span className="font-medium">{formatDate(scheme.application_end_date)}</span>
                        </div>
                      )}
                    </div>
                    {!isApplicationActive() && (
                      <p className="mt-2 text-sm text-destructive">
                        Applications are currently closed
                      </p>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Benefits */}
                <div>
                  <h3 className="mb-2 font-semibold">Benefits</h3>
                  <div className="rounded-lg bg-primary/5 p-4">
                    <p className="text-sm">{scheme.benefits}</p>
                  </div>
                </div>

                {/* Eligibility Criteria */}
                <div>
                  <h3 className="mb-3 font-semibold">Eligibility Criteria</h3>
                  <div className="space-y-2">
                    {scheme.eligibility_criteria.min_age && (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">Minimum age: {scheme.eligibility_criteria.min_age} years</p>
                      </div>
                    )}
                    {scheme.eligibility_criteria.max_age && (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">Maximum age: {scheme.eligibility_criteria.max_age} years</p>
                      </div>
                    )}
                    {scheme.eligibility_criteria.max_income && (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">Annual income up to ₹{scheme.eligibility_criteria.max_income.toLocaleString()}</p>
                      </div>
                    )}
                    {scheme.eligibility_criteria.caste && (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">Caste: {scheme.eligibility_criteria.caste.join(', ')}</p>
                      </div>
                    )}
                    {scheme.eligibility_criteria.gender && (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">Gender: {scheme.eligibility_criteria.gender}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Required Documents */}
                <div>
                  <h3 className="mb-3 font-semibold">Required Documents</h3>
                  <div className="space-y-2">
                    {scheme.documents_required.map((doc, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
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
            {/* Eligibility Status */}
            {eligibilityChecked && (
              <Card className={isEligible ? 'border-success' : 'border-destructive'}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {isEligible ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-success" />
                        <span className="text-success">You're Eligible!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <span className="text-destructive">Not Eligible</span>
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEligible ? (
                    <>
                      <p className="mb-4 text-sm text-muted-foreground">
                        Based on your profile, you meet the criteria for this scheme.
                      </p>
                      {confidence > 0 && (
                        <div className="mb-4">
                          <p className="mb-1 text-xs text-muted-foreground">AI Confidence Score</p>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-muted">
                              <div 
                                className="h-2 rounded-full bg-success" 
                                style={{ width: `${confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold">{Math.round(confidence * 100)}%</span>
                          </div>
                        </div>
                      )}
                      <Button 
                        className="w-full" 
                        onClick={handleApply}
                        disabled={!isApplicationActive()}
                      >
                        {isApplicationActive() ? 'Apply Now' : 'Applications Closed'}
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You don't meet the eligibility criteria for this scheme at this time.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Help Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Have questions about this scheme or the application process?
                </p>
                <Button variant="outline" className="w-full">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showApplicationDialog} onOpenChange={setShowApplicationDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply for {scheme.name}</DialogTitle>
            <DialogDescription>
              Submit your application with required documents
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Autofill Option */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Use Autofill</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically fill application with your profile details
                  </p>
                </div>
                <Button
                  variant={useAutofill ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseAutofill(!useAutofill)}
                >
                  {useAutofill ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </div>

            {/* Document Uploads */}
            <div className="space-y-4">
              <h4 className="font-semibold">Required Documents</h4>
              
              {scheme.requires_income_cert && (
                <div className="space-y-2">
                  <Label htmlFor="income-cert">Income Certificate *</Label>
                  <Input
                    id="income-cert"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setIncomeCertFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload your valid income certificate (PDF, JPG, PNG)
                  </p>
                </div>
              )}

              {scheme.requires_caste_cert && (
                <div className="space-y-2">
                  <Label htmlFor="caste-cert">Caste Certificate *</Label>
                  <Input
                    id="caste-cert"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setCasteCertFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload your valid caste certificate (PDF, JPG, PNG)
                  </p>
                </div>
              )}
            </div>

            {useAutofill && (
              <div className="rounded-lg border bg-blue-50 p-4">
                <h4 className="mb-2 font-semibold text-blue-900">Auto-filled Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                  <div>Name: <span className="font-medium">{JSON.parse(localStorage.getItem('user') || '{}').name}</span></div>
                  <div>Age: <span className="font-medium">{JSON.parse(localStorage.getItem('user') || '{}').age}</span></div>
                  <div>Caste: <span className="font-medium">{JSON.parse(localStorage.getItem('user') || '{}').caste}</span></div>
                  <div>Income: <span className="font-medium">₹{JSON.parse(localStorage.getItem('user') || '{}').income}</span></div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleSubmitApplication}
                disabled={applying}
              >
                {applying ? 'Submitting...' : 'Submit Application'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowApplicationDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
