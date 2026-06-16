import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Clock,
  CheckCircle2,
  Twitter,
  Instagram,
  ChevronRight,
  AlertCircle,
  Headphones,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SUBJECT_OPTIONS = [
  { value: '', label: 'Select a category...' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'billing', label: 'Billing & Subscriptions' },
  { value: 'safety', label: 'Safety Report' },
  { value: 'partnership', label: 'Partnership / Business Enquiry' },
  { value: 'general', label: 'General Question' },
];

const FAQ_LINKS = [
  { label: 'How does matching work?', href: '/pricing#faq' },
  { label: 'How do I cancel my subscription?', href: '/pricing#faq' },
  { label: 'Can I use DreamLink anonymously?', href: '/privacy' },
  { label: 'What is included in the free plan?', href: '/pricing' },
];

const SOCIAL_LINKS = [
  {
    name: 'Twitter / X',
    handle: '@dreamlinkapp',
    href: 'https://twitter.com/dreamlinkapp',
    icon: Twitter,
    color: 'text-sky-500',
    bg: 'bg-sky-50 hover:bg-sky-100',
  },
  {
    name: 'Instagram',
    handle: '@dreamlink.app',
    href: 'https://instagram.com/dreamlink.app',
    icon: Instagram,
    color: 'text-pink-500',
    bg: 'bg-pink-50 hover:bg-pink-100',
  },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ContactPage() {
  const { user, profile } = useAuth();

  const [form, setForm] = useState<FormState>({
    name: profile?.full_name ?? '',
    email: user?.email ?? '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validate(): boolean {
    const newErrors: Partial<FormState> = {};
    if (!form.name.trim()) newErrors.name = 'Name is required.';
    if (!form.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!form.subject) newErrors.subject = 'Please select a category.';
    if (!form.message.trim()) {
      newErrors.message = 'Message is required.';
    } else if (form.message.trim().length < 20) {
      newErrors.message = 'Please provide a little more detail (at least 20 characters).';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    // In production this would call a Supabase Edge Function or email API
    await new Promise<void>((resolve) => setTimeout(resolve, 1200));
    setSubmitting(false);
    setSubmitted(true);
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white">
      {/* Nav */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" />
            DreamLink
          </Link>
          {user && (
            <Link to="/discover" className="text-sm text-gray-500 hover:text-orange-500 transition-colors">
              Back to App
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-14">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <Headphones className="w-7 h-7 text-orange-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Get in Touch</h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Have a question, spotted a bug, or want to explore a partnership? We would love to hear from you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Send us a message</h2>

              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Message sent!</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mb-6">
                      Thanks for reaching out. We will get back to you at{' '}
                      <span className="font-medium text-gray-700">{form.email}</span> within 24–48 hours.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setForm({ name: profile?.full_name ?? '', email: user?.email ?? '', subject: '', message: '' });
                      }}
                      className="text-sm text-orange-500 hover:text-orange-600 font-semibold underline underline-offset-2 transition-colors"
                    >
                      Send another message
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSubmit}
                    noValidate
                    className="space-y-5"
                  >
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Your Name <span className="text-orange-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Jane Smith"
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1 ${
                          errors.name
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 bg-white hover:border-orange-300'
                        }`}
                      />
                      {errors.name && (
                        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.name}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email Address <span className="text-orange-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="jane@example.com"
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1 ${
                          errors.email
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 bg-white hover:border-orange-300'
                        }`}
                      />
                      {errors.email && (
                        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.email}
                        </p>
                      )}
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Subject / Category <span className="text-orange-500">*</span>
                      </label>
                      <select
                        value={form.subject}
                        onChange={(e) => handleChange('subject', e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1 appearance-none bg-white ${
                          errors.subject
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 hover:border-orange-300'
                        } ${form.subject === '' ? 'text-gray-400' : 'text-gray-800'}`}
                      >
                        {SUBJECT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {errors.subject && (
                        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.subject}
                        </p>
                      )}
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Message <span className="text-orange-500">*</span>
                      </label>
                      <textarea
                        value={form.message}
                        onChange={(e) => handleChange('message', e.target.value)}
                        rows={5}
                        placeholder="Tell us how we can help..."
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1 resize-none ${
                          errors.message
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 bg-white hover:border-orange-300'
                        }`}
                      />
                      <div className="flex items-start justify-between mt-1">
                        {errors.message ? (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {errors.message}
                          </p>
                        ) : (
                          <span />
                        )}
                        <span className={`text-xs ${form.message.length > 1000 ? 'text-red-400' : 'text-gray-400'}`}>
                          {form.message.length}/1000
                        </span>
                      </div>
                    </div>

                    {/* Safety note */}
                    {form.subject === 'safety' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700"
                      >
                        <strong>Safety reports are a priority.</strong> For immediate danger, please contact your local emergency services first. We investigate all safety reports within 24 hours and take appropriate action.
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                    >
                      {submitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Message'
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="space-y-6"
          >
            {/* Contact info */}
            <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">Alternative contact</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Email</p>
                    <a href="mailto:support@dreamlink.app" className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                      support@dreamlink.app
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Response time</p>
                    <p className="text-sm font-semibold text-gray-700">24–48 hours</p>
                    <p className="text-xs text-gray-400">Mon–Fri (excluding holidays)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ links */}
            <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">Quick answers</h2>
              <ul className="space-y-2">
                {FAQ_LINKS.map((faq) => (
                  <li key={faq.label}>
                    <Link
                      to={faq.href}
                      className="flex items-center justify-between gap-2 text-sm text-gray-600 hover:text-orange-600 transition-colors group py-1"
                    >
                      <span>{faq.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 shrink-0 transition-colors" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social links */}
            <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">Follow us</h2>
              <div className="space-y-3">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-colors ${social.bg}`}
                  >
                    <social.icon className={`w-4 h-4 ${social.color}`} />
                    <div>
                      <p className="text-xs text-gray-500">{social.name}</p>
                      <p className={`text-sm font-semibold ${social.color}`}>{social.handle}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="mt-14 pt-8 border-t border-orange-100 flex flex-wrap justify-center gap-4 text-sm text-gray-400">
          <Link to="/terms" className="hover:text-orange-500 transition-colors">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-orange-500 transition-colors">Privacy Policy</Link>
          <Link to="/pricing" className="hover:text-orange-500 transition-colors">Pricing</Link>
        </div>
      </div>
    </div>
  );
}
