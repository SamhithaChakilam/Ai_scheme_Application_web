'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, FileText, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Scheme {
  id?: string
  _id?: string
  name: string
  description: string
  category: string
  benefits: string
  eligibility_criteria: any
  documents_required: string[]
}

export default function SchemeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const schemeId = params.id as string

  const API = process.env.NEXT_PUBLIC_API_URL || 'https://ai-scheme-application-web.onrender.com'

  const [scheme, setScheme] = useState<Scheme | null>(null)
  const [loading, setLoading] = useState(true)

  const [isEligible, setIsEligible] = useState(false)
  const [eligibilityChecked, setEligibilityChecked] = useState(false)

  useEffect(() => {
    fetchSchemeAndEligibility()
  }, [schemeId])


  // ----------------------------------------------------------------
  // FETCH SCHEME + CHECK ELIGIBILITY
  // ----------------------------------------------------------------
  const fetchSchemeAndEligibility = async () => {
    try {
      // 1) Fetch scheme details normally
      const res = await fetch(`${API}/api/schemes/${schemeId}`)
      const data = await res.json()

      if (res.ok && data.name) {
        setScheme(data)
      } else {
        // fallback: search from all schemes
        const allRes = await fetch(`${API}/api/schemes`)
        const allSchemes = await allRes.json()

        const found = allSchemes.find((s: any) =>
          s.id === schemeId || s._id === schemeId
        )

        setScheme(found || null)
      }

      // 2) Eligibility check
      const token = localStorage.getItem("token")
      if (!token) return router.push("/login")

      const eligRes = await fetch(`${API}/api/schemes/eligible`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      })

      const eligData = await eligRes.json()

      const eligible = eligData.eligible_schemes?.some(
        (s: any) => s.id === schemeId
      )

      setIsEligible(eligible)
      setEligibilityChecked(true)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ----------------------------------------------------------------
  // APPLY HANDLER
  // ----------------------------------------------------------------
  const handleApply = async () => {
    const token = localStorage.getItem("token")
    if (!token) return router.push("/login")

    const res = await fetch(`${API}/api/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ scheme_id: schemeId })
    })

    const data = await res.json()

    if (res.ok) {
      alert("Application submitted!")
      router.push("/applications")
    } else {
      alert(data.message)
    }
  }


  // ----------------------------------------------------------------
  // UI STATES
  // ----------------------------------------------------------------
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

        <Card>
          <CardHeader>
            <Badge variant="secondary" className="mb-2 w-fit">
              {scheme.category}
            </Badge>
            <CardTitle className="text-2xl">{scheme.name}</CardTitle>
            <CardDescription className="text-base">{scheme.description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">

            <div>
              <h3 className="mb-2 font-semibold">Benefits</h3>
              <div className="rounded-lg bg-primary/5 p-4">
                <p className="text-sm">{scheme.benefits}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-semibold">Eligibility Criteria</h3>
              <pre className="text-sm bg-muted p-3 rounded">
                {JSON.stringify(scheme.eligibility_criteria, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="mb-3 font-semibold">Required Documents</h3>
              <ul className="space-y-2">
                {scheme.documents_required.map((doc, i) => (
                  <li key={i} className="flex gap-2 items-center">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>

            {/* ----------------------------------------------------- */}
            {/* ELIGIBILITY RESULT + APPLY BUTTON  */}
            {/* ----------------------------------------------------- */}

            <div className="rounded-lg border p-4 mt-6">
              {!eligibilityChecked ? (
                <p className="text-sm text-muted-foreground">Checking eligibility...</p>
              ) : isEligible ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-green-600 font-medium">
                    <CheckCircle className="h-5 w-5" />
                    You are eligible for this scheme
                  </p>
                  <Button className="w-full" onClick={handleApply}>
                    Apply Now
                  </Button>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-red-600 font-medium">
                  <AlertCircle className="h-5 w-5" />
                  You are not eligible for this scheme
                </p>
              )}
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  )
}
