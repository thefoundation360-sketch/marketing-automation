import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-warm-900 mb-2">Terms of Service</h1>
        <p className="text-warm-400 text-sm mb-8">Last updated: June 16, 2026</p>

        <div className="prose prose-warm max-w-none space-y-8 text-warm-600">
          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">1. Acceptance of Terms</h2>
            <p className="leading-relaxed">By accessing or using DreamMatch ("Service"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the Service. These Terms apply to all visitors, users, and others who access or use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">2. Description of Service</h2>
            <p className="leading-relaxed">DreamMatch is a social platform that connects individuals based on shared bucket list goals and life aspirations. The Service includes profile creation, goal tracking, matching algorithms, messaging features, and community groups.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">3. Accounts and Registration</h2>
            <p className="leading-relaxed mb-2">You must be at least 18 years old to create an account. You are responsible for:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and truthful information</li>
              <li>Promptly notifying us of any unauthorized account use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">4. User Conduct</h2>
            <p className="leading-relaxed mb-2">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Post false, misleading, or impersonating content</li>
              <li>Harass, bully, or intimidate other users</li>
              <li>Share explicit, violent, or illegal content</li>
              <li>Use the Service for commercial solicitation without authorization</li>
              <li>Attempt to access accounts or data that doesn't belong to you</li>
              <li>Use automated bots or scrapers on the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">5. Subscription and Payments</h2>
            <p className="leading-relaxed">Paid subscriptions are billed in advance on a monthly or annual basis. Subscriptions automatically renew unless cancelled before the renewal date. Refunds may be issued within 7 days of a charge upon request. We reserve the right to modify pricing with 30 days' notice.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">6. Content Ownership</h2>
            <p className="leading-relaxed">You retain ownership of content you create and post. By posting content, you grant DreamMatch a non-exclusive, royalty-free license to display, distribute, and use that content in connection with the Service. You may not post content you don't own or have rights to.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">7. Privacy</h2>
            <p className="leading-relaxed">Your use of the Service is governed by our <Link to="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link>, which is incorporated into these Terms. By using the Service, you consent to our data practices as described therein.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">8. Disclaimers</h2>
            <p className="leading-relaxed">The Service is provided "as is" without warranties of any kind. DreamMatch does not guarantee the accuracy, completeness, or reliability of any content. We are not responsible for the actions, content, or representations of users or third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">9. Limitation of Liability</h2>
            <p className="leading-relaxed">To the maximum extent permitted by law, DreamMatch shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to loss of data, loss of profits, or personal injury.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">10. Termination</h2>
            <p className="leading-relaxed">We may terminate or suspend your account at any time for violations of these Terms. You may delete your account at any time through your settings. Upon termination, your right to use the Service ceases immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">11. Changes to Terms</h2>
            <p className="leading-relaxed">We reserve the right to modify these Terms at any time. We will notify you of significant changes by email or through the Service. Continued use after changes constitutes acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">12. Contact</h2>
            <p className="leading-relaxed">For questions about these Terms, contact us at <a href="mailto:legal@dreammatch.app" className="text-orange-500 hover:underline">legal@dreammatch.app</a> or visit our <Link to="/contact" className="text-orange-500 hover:underline">contact page</Link>.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-warm-200 flex items-center justify-between text-sm text-warm-400">
          <Link to="/" className="hover:text-warm-600 transition-colors">← Back to home</Link>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-warm-600 transition-colors">Privacy Policy</Link>
            <Link to="/contact" className="hover:text-warm-600 transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
