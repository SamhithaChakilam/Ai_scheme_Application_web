'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, FileText, Shield, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/5 to-background py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/50 px-4 py-1.5 text-sm backdrop-blur-sm">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Powered by AI & Machine Learning</span>
            </div>
            
            <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Find Government Schemes{' '}
              <span className="text-primary">You Qualify For</span>
            </h1>
            
            <p className="mb-8 text-pretty text-lg text-muted-foreground md:text-xl">
              Stop missing out on welfare benefits. Our AI-powered platform matches you with eligible government schemes instantly.
            </p>
            
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  User Login
                </Button>
              </Link>
              <Link href="/admin/login">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Admin Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative gradient */}
        <div className="absolute inset-x-0 top-0 -z-10 h-full w-full bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.1),transparent_50%)]" />
      </section>

      {/* Stats Section */}
      <section className="border-b py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-primary">15,000+</div>
              <div className="text-sm text-muted-foreground">Citizens Registered</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-primary">50+</div>
              <div className="text-sm text-muted-foreground">Government Schemes</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-primary">₹2.5Cr+</div>
              <div className="text-sm text-muted-foreground">Benefits Claimed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-balance text-3xl font-bold md:text-4xl">
              How It Works
            </h2>
            <p className="text-pretty text-muted-foreground">
              Simple, secure, and transparent process to access your benefits
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Register Once</CardTitle>
                <CardDescription>
                  Create your account with Aadhaar and submit all required documents
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>AI Matching</CardTitle>
                <CardDescription>
                  Our ML algorithm analyzes your profile against all available schemes
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Get Matched</CardTitle>
                <CardDescription>
                  Instantly see all schemes you're eligible for with confidence scores
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Apply & Track</CardTitle>
                <CardDescription>
                  Submit applications and track status in real-time from your dashboard
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-balance text-3xl font-bold md:text-4xl">
              Don't Miss Out on Your Benefits
            </h2>
            <p className="mb-8 text-pretty text-muted-foreground">
              Millions of rupees in welfare benefits go unclaimed every year. Join thousands of citizens who have discovered schemes they qualify for.
            </p>
            <Link href="/register">
              <Button size="lg">
                Create Your Account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
