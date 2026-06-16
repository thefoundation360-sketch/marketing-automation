import { Link } from 'react-router-dom'
import { CheckCircle, Heart, Star, Users, Target, ChevronRight, ArrowRight, Flame, Globe, Award } from 'lucide-react'

const TESTIMONIALS = [
  {
    quote: "Met my hiking partner for Kilimanjaro here. We've already done two climbs together!",
    name: "Sarah M.",
    location: "Denver, CO",
    goal: "Climb Kilimanjaro",
    avatar: "SM",
  },
  {
    quote: "Found three other people who want to road trip Route 66. Planning it now!",
    name: "James T.",
    location: "Chicago, IL",
    goal: "Road Trip Route 66",
    avatar: "JT",
  },
  {
    quote: "DreamMatch helped me find an accountability partner for learning Spanish. We practice daily!",
    name: "Priya K.",
    location: "Austin, TX",
    goal: "Become fluent in Spanish",
    avatar: "PK",
  },
]

const POPULAR_GOALS = [
  "See the Northern Lights", "Learn to surf", "Write a novel",
  "Run a marathon", "Visit Japan", "Start a business",
  "Learn to cook Thai food", "Skydive", "Volunteer abroad",
  "Climb Kilimanjaro", "Road trip Route 66", "Learn a new language",
]

const HOW_IT_WORKS = [
  {
    step: "1",
    icon: "✏️",
    title: "Build Your Bucket List",
    description: "Add the dreams you want to chase — travel, adventure, creativity, career goals, and more.",
  },
  {
    step: "2",
    icon: "💫",
    title: "Match With Dreamers",
    description: "We connect you with people who share your goals. The more goals you share, the higher your match score.",
  },
  {
    step: "3",
    icon: "🎉",
    title: "Chase Dreams Together",
    description: "Chat, plan, join squads, and actually check off your bucket list goals with your new people.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FFFBF7]/90 backdrop-blur-md border-b border-warm-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-warm-900">DreamMatch</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/pricing" className="text-warm-600 hover:text-warm-900 transition-colors text-sm font-medium">Pricing</Link>
            <a href="#how-it-works" className="text-warm-600 hover:text-warm-900 transition-colors text-sm font-medium">How It Works</a>
            <Link to="/auth" className="text-warm-600 hover:text-warm-900 transition-colors text-sm font-medium">Sign In</Link>
            <Link
              to="/auth"
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm"
            >
              Get Started Free
            </Link>
          </div>
          <Link
            to="/auth"
            className="md:hidden bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-orange-200">
            <Star className="w-3 h-3 fill-current" />
            Now in beta — join 10,000+ dreamers
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-warm-900 leading-tight mb-6">
            Find your people.
            <br />
            <span className="gradient-text">Chase your dreams.</span>
          </h1>
          <p className="text-xl text-warm-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            DreamMatch connects you with people who share your bucket list goals.
            Stop waiting — find your adventure partner, accountability buddy, or squad today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/auth"
              className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
            >
              Start for free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/auth"
              className="w-full sm:w-auto border border-warm-200 text-warm-700 px-8 py-4 rounded-2xl text-lg font-medium hover:bg-warm-100 transition-colors flex items-center justify-center gap-2"
            >
              See how it works
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="mt-4 text-sm text-warm-400">No credit card required · Free forever plan</p>
        </div>

        {/* Hero Visual — floating profile cards */}
        <div className="max-w-sm mx-auto mt-16 relative h-80">
          {/* Background card */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 w-72 h-64 bg-white rounded-3xl shadow-xl border border-warm-100 rotate-6 opacity-60" />
          {/* Main card */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 bg-white rounded-3xl shadow-2xl border border-warm-100 overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-orange-400 to-orange-600 relative">
              <div className="absolute -bottom-8 left-6 w-16 h-16 bg-white rounded-2xl border-2 border-white shadow-md flex items-center justify-center text-2xl">
                👩‍🦰
              </div>
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-orange-600">
                87% Match
              </div>
            </div>
            <div className="pt-10 pb-4 px-6">
              <h3 className="font-bold text-warm-900">Maya Chen, 28</h3>
              <p className="text-warm-500 text-sm">San Francisco, CA</p>
              <div className="mt-3 p-2.5 bg-orange-50 rounded-xl border border-orange-100">
                <p className="text-xs text-orange-700 font-semibold mb-1.5">✨ You both want to...</p>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="text-xs bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full">See Northern Lights</span>
                  <span className="text-xs bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full">Learn Japanese</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Numbers */}
      <section className="py-16 bg-warm-900">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { number: "10K+", label: "Dreamers" },
            { number: "47K+", label: "Bucket Goals" },
            { number: "3.2K+", label: "Matches Made" },
            { number: "890+", label: "Goals Completed" },
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.number}</div>
              <div className="text-warm-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-warm-900 mb-4">How DreamMatch works</h2>
            <p className="text-warm-500 text-lg">Three steps to finding your dream people</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                  {step.icon}
                </div>
                <div className="inline-flex items-center justify-center w-6 h-6 bg-orange-500 text-white text-xs font-bold rounded-full mb-3">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold text-warm-900 mb-2">{step.title}</h3>
                <p className="text-warm-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Goals */}
      <section className="py-16 bg-orange-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-warm-900 mb-4">Millions of dreams waiting to be shared</h2>
          <p className="text-warm-500 mb-8">From solo adventures to group expeditions — your people are already here</p>
          <div className="flex flex-wrap justify-center gap-3">
            {POPULAR_GOALS.map(goal => (
              <span
                key={goal}
                className="bg-white border border-orange-200 text-warm-700 px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:shadow-md hover:border-orange-400 transition-all cursor-default"
              >
                {goal}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-warm-900 text-center mb-14">Everything you need to chase your dreams</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Heart className="w-6 h-6" />, title: "Smart Matching", desc: "Match with people based on shared bucket list goals — not just hobbies." },
              { icon: <Target className="w-6 h-6" />, title: "Bucket List Tracker", desc: "Organize, track, and celebrate your goals. Add photos when you complete them." },
              { icon: <Users className="w-6 h-6" />, title: "Dream Squads", desc: "Create groups around shared goals. Plan group adventures together." },
              { icon: <Globe className="w-6 h-6" />, title: "Discover Nearby", desc: "Find dreamers near you who want the same experiences." },
              { icon: <Award className="w-6 h-6" />, title: "Achievements", desc: "Celebrate milestones and share completions with your dream community." },
              { icon: <Star className="w-6 h-6" />, title: "Accountability", desc: "Premium members get matched with accountability partners for their goals." },
            ].map(feature => (
              <div key={feature.title} className="bg-white rounded-2xl p-6 border border-warm-100 shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-bold text-warm-900 mb-2">{feature.title}</h3>
                <p className="text-warm-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-warm-900 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-4">Real dreamers, real connections</h2>
          <p className="text-warm-400 text-center mb-12">Join thousands who found their dream people</p>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-warm-800 rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 text-orange-400 fill-current" />)}
                </div>
                <p className="text-warm-100 text-sm leading-relaxed mb-4">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{t.name}</p>
                    <p className="text-warm-400 text-xs">{t.location}</p>
                  </div>
                </div>
                <div className="mt-3 text-xs bg-warm-700 rounded-lg px-3 py-1.5 text-orange-300 inline-block">
                  ✓ {t.goal}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-warm-900 mb-4">Start free, upgrade when ready</h2>
          <p className="text-warm-500 mb-10">The free plan is generous. Upgrade for unlimited dreams.</p>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-warm-200 rounded-2xl p-6 text-left">
              <h3 className="font-bold text-warm-900 text-lg mb-1">Free Forever</h3>
              <p className="text-3xl font-bold text-warm-900 mb-4">$0</p>
              {["5 swipes per day", "3 active goals", "Basic messaging", "Browse matches"].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-warm-600 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {f}
                </div>
              ))}
              <Link to="/auth" className="mt-4 block w-full text-center border border-warm-200 text-warm-700 py-3 rounded-xl font-semibold hover:bg-warm-100 transition-colors">
                Get Started
              </Link>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-left relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-warm-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                MOST POPULAR
              </div>
              <h3 className="font-bold text-white text-lg mb-1">Premium</h3>
              <p className="text-3xl font-bold text-white mb-4">$9.99<span className="text-base font-normal text-orange-100">/mo</span></p>
              {["Unlimited swipes", "Unlimited goals", "Unlimited messaging", "See who liked you", "Full match breakdown", "7-day free trial"].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-orange-100 mb-2">
                  <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                  {f}
                </div>
              ))}
              <Link to="/pricing" className="mt-4 block w-full text-center bg-white text-orange-600 py-3 rounded-xl font-bold hover:bg-orange-50 transition-colors">
                Start Free Trial
              </Link>
            </div>
          </div>
          <Link to="/pricing" className="text-orange-500 font-semibold hover:text-orange-600 flex items-center gap-1 justify-center">
            See all plans including Elite & Business <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-orange-500 to-orange-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Your dreams aren't going to chase themselves.</h2>
          <p className="text-orange-100 text-lg mb-8">Join 10,000+ dreamers who stopped waiting and started doing.</p>
          <Link
            to="/auth"
            className="inline-block bg-white text-orange-600 px-10 py-4 rounded-2xl text-lg font-bold hover:bg-orange-50 transition-colors shadow-lg"
          >
            Find Your Dream People →
          </Link>
          <p className="mt-4 text-orange-200 text-sm">Free to join · No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-warm-900 text-warm-400 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold">DreamMatch</span>
              </div>
              <p className="text-sm max-w-xs">Find your people. Chase your dreams.</p>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
              <Link to="/auth" className="hover:text-white transition-colors">Sign Up</Link>
              <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
              <a href="mailto:hello@dreammatch.app" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
          <div className="border-t border-warm-800 pt-6 text-xs text-center">
            © {new Date().getFullYear()} DreamMatch. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
