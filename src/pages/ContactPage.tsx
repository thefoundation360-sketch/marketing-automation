import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Mail, MessageCircle, Twitter, Instagram } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    // Simulate send (replace with your email service or Supabase function)
    await new Promise(r => setTimeout(r, 1200))
    setSending(false)
    setSent(true)
    toast.success('Message sent! We\'ll get back to you soon.')
  }

  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      <nav className="sticky top-0 bg-[#FFFBF7]/95 backdrop-blur-md border-b border-warm-200 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-warm-900">DreamMatch</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-warm-900 mb-2">Get in touch</h1>
          <p className="text-warm-500">We'd love to hear from you. We usually respond within 24 hours.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact options sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-warm-100 rounded-2xl p-5">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-3">
                <Mail className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="font-semibold text-warm-900 mb-1 text-sm">Email Support</h3>
              <a href="mailto:hello@dreammatch.app" className="text-orange-500 text-sm hover:underline">hello@dreammatch.app</a>
            </div>
            <div className="bg-white border border-warm-100 rounded-2xl p-5">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-3">
                <MessageCircle className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="font-semibold text-warm-900 mb-1 text-sm">Live Chat</h3>
              <p className="text-warm-400 text-sm">Available in-app for Premium users</p>
            </div>
            <div className="bg-white border border-warm-100 rounded-2xl p-5">
              <h3 className="font-semibold text-warm-900 mb-3 text-sm">Follow us</h3>
              <div className="flex gap-3">
                <a href="#" className="w-9 h-9 bg-warm-100 rounded-xl flex items-center justify-center hover:bg-orange-100 transition-colors">
                  <Twitter className="w-4 h-4 text-warm-600" />
                </a>
                <a href="#" className="w-9 h-9 bg-warm-100 rounded-xl flex items-center justify-center hover:bg-orange-100 transition-colors">
                  <Instagram className="w-4 h-4 text-warm-600" />
                </a>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
              <h3 className="font-semibold text-orange-900 mb-1 text-sm">Business inquiries</h3>
              <a href="mailto:business@dreammatch.app" className="text-orange-600 text-sm hover:underline">business@dreammatch.app</a>
            </div>
          </div>

          {/* Contact form */}
          <div className="md:col-span-2">
            {sent ? (
              <div className="bg-white border border-warm-100 rounded-2xl p-8 text-center">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-bold text-warm-900 mb-2">Message sent!</h3>
                <p className="text-warm-500 mb-6">Thanks for reaching out. We'll get back to you at {form.email} within 24 hours.</p>
                <button
                  onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }) }}
                  className="text-orange-500 font-semibold hover:text-orange-600"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white border border-warm-100 rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-warm-700 mb-1.5">Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full border border-warm-200 rounded-xl px-3.5 py-2.5 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 bg-warm-50"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-warm-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full border border-warm-200 rounded-xl px-3.5 py-2.5 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 bg-warm-50"
                      placeholder="you@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1.5">Subject</label>
                  <select
                    value={form.subject}
                    onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    required
                    className="w-full border border-warm-200 rounded-xl px-3.5 py-2.5 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 bg-warm-50"
                  >
                    <option value="">Select a topic...</option>
                    <option value="general">General question</option>
                    <option value="billing">Billing / subscription</option>
                    <option value="bug">Report a bug</option>
                    <option value="safety">Safety / report a user</option>
                    <option value="feedback">Feature feedback</option>
                    <option value="business">Business / partnership</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1.5">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    className="w-full border border-warm-200 rounded-xl px-3.5 py-2.5 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 bg-warm-50 resize-none"
                    placeholder="Tell us how we can help..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-bold hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-60"
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-warm-200 flex items-center justify-between text-sm text-warm-400">
          <Link to="/" className="hover:text-warm-600 transition-colors">← Back to home</Link>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-warm-600 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-warm-600 transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
