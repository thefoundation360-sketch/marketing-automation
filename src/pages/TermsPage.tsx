import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Scale } from 'lucide-react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const SECTIONS = [
  {
    id: 'agreement',
    title: '1. Agreement to Terms',
    content: `By accessing or using DreamLink (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.

These Terms constitute a legally binding agreement between you and DreamLink Inc. ("DreamLink," "we," "us," or "our"). We reserve the right to update these Terms at any time. Continued use of the Service after changes constitutes your acceptance of the new Terms.`,
  },
  {
    id: 'description',
    title: '2. Description of Service',
    content: `DreamLink is a social platform that connects people based on shared bucket list goals and aspirations. The Service allows users to:

• Create and share personal bucket list goals
• Discover other users with similar dreams and aspirations
• Match and message compatible users
• Join groups and communities around shared goals
• Track goal progress and celebrate completions

DreamLink reserves the right to modify, suspend, or discontinue any part of the Service at any time, with or without notice.`,
  },
  {
    id: 'accounts',
    title: '3. User Accounts & Eligibility',
    content: `Age Requirement. You must be at least 18 years of age to create an account and access the full features of DreamLink. By creating an account, you represent and warrant that you are 18 or older.

Account Responsibility. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorised use of your account at support@dreamlink.app.

Accurate Information. You agree to provide accurate, current, and complete information during registration and to keep your profile information up to date. Impersonating another person or creating a false identity is strictly prohibited.

One Account Per Person. You may only maintain one personal account. Creating multiple accounts to circumvent restrictions or bans is prohibited.`,
  },
  {
    id: 'content',
    title: '4. User Content & Conduct',
    content: `Your Content. You retain ownership of all content you submit to DreamLink, including photos, goals, messages, and profile information ("User Content"). By submitting User Content, you grant DreamLink a non-exclusive, worldwide, royalty-free license to use, display, reproduce, and distribute your content within the Service.

Content Standards. You agree that your User Content will not:

• Be false, misleading, or deceptive
• Violate any third party's privacy, intellectual property, or other rights
• Contain nudity, graphic violence, hate speech, or discriminatory content
• Harass, threaten, or abuse other users
• Promote illegal activities or self-harm

Moderation. DreamLink may (but is not obligated to) review and remove User Content that we determine, in our sole discretion, violates these Terms or is otherwise objectionable.`,
  },
  {
    id: 'prohibited',
    title: '5. Prohibited Activities',
    content: `You agree not to engage in any of the following:

• Scraping, crawling, or collecting data from the Service without our written consent
• Attempting to gain unauthorised access to other accounts, systems, or networks
• Transmitting viruses, malware, or other harmful code
• Sending unsolicited communications (spam)
• Using the Service for commercial solicitation without our approval
• Reverse engineering or decompiling any part of the Service
• Using automated tools or bots to interact with the Service
• Selling, reselling, or sublicensing access to the Service
• Creating accounts on behalf of someone else without their explicit consent
• Using the Service to facilitate any illegal transaction

Violations may result in immediate suspension or permanent termination of your account.`,
  },
  {
    id: 'subscriptions',
    title: '6. Premium Subscriptions & Billing',
    content: `Paid Plans. DreamLink offers optional paid subscription plans ("Premium," "Elite," and "Business") with enhanced features. By subscribing, you authorise us to charge your payment method on a recurring basis.

Free Trial. Premium subscribers may be eligible for a 7-day free trial. If you do not cancel before the trial ends, your payment method will be charged the applicable subscription fee.

Billing Cycle. Subscriptions are billed monthly or annually, depending on the plan you select. Billing occurs at the start of each cycle.

Price Changes. We may change subscription prices upon 30 days' advance notice. Your continued use after the new price takes effect constitutes acceptance.

Auto-Renewal. Subscriptions renew automatically unless cancelled before the renewal date. You can manage your subscription in the app or via the Stripe customer portal.

Payment Processing. All payments are processed by Stripe. DreamLink does not store your full payment card details. By providing payment information, you authorise Stripe to process payments on our behalf.`,
  },
  {
    id: 'refunds',
    title: '7. Refund Policy',
    content: `Trial Cancellations. If you cancel during a free trial period, you will not be charged and no refund is necessary.

Monthly Subscriptions. Monthly subscription fees are non-refundable. If you cancel, you retain access until the end of the current billing period.

Annual Subscriptions. For annual subscriptions cancelled within 14 days of purchase, we will issue a pro-rated refund for unused months. After 14 days, annual subscription fees are non-refundable, though you will retain access until the period ends.

Technical Issues. If the Service is substantially unavailable due to our error for more than 72 consecutive hours, you may request a credit for the affected period by contacting support@dreamlink.app.

Refund requests should be submitted to support@dreamlink.app. We reserve the right to refuse refund requests that we determine, in our sole discretion, are fraudulent or abusive.`,
  },
  {
    id: 'ip',
    title: '8. Intellectual Property',
    content: `DreamLink Content. The Service and all content produced by DreamLink — including logos, graphics, software, text, and design — are owned by DreamLink Inc. and protected by copyright, trademark, and other intellectual property laws. Nothing in these Terms grants you a right to use DreamLink's name, logo, or branding without our prior written consent.

Your Content. As stated in Section 4, you retain ownership of your User Content. The licence you grant us is limited to operating and improving the Service.

Feedback. If you submit suggestions or feedback about the Service, we may use that feedback without obligation to you.

DMCA. If you believe your copyright has been infringed, please send a takedown notice to support@dreamlink.app with the required information under the Digital Millennium Copyright Act.`,
  },
  {
    id: 'privacy',
    title: '9. Privacy',
    content: `Your privacy is important to us. Our Privacy Policy, available at dreamlink.app/privacy, explains how we collect, use, and protect your personal information. By using the Service, you agree to the practices described in the Privacy Policy, which is incorporated by reference into these Terms.`,
  },
  {
    id: 'disclaimers',
    title: '10. Disclaimers & Limitation of Liability',
    content: `Disclaimer of Warranties. THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND. DREAMLINK DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

No Guarantee of Matches. DreamLink does not guarantee that you will match with any particular person or achieve any particular bucket list goal through using the Service.

Limitation of Liability. TO THE MAXIMUM EXTENT PERMITTED BY LAW, DREAMLINK SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICE.

Our total liability to you for any claim arising from or related to these Terms or the Service shall not exceed the greater of (a) the amount you paid to DreamLink in the 12 months preceding the claim, or (b) $100 USD.

Some jurisdictions do not allow exclusion of implied warranties or limitation of liability, so some of the above limitations may not apply to you.`,
  },
  {
    id: 'governing-law',
    title: '11. Governing Law',
    content: `These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.

Any legal action or proceeding arising under these Terms shall be brought exclusively in the federal or state courts located in Delaware, and you consent to personal jurisdiction and venue in those courts.

For users in the European Union or United Kingdom, mandatory consumer protection laws of your country of residence will apply alongside these Terms where required by law.`,
  },
  {
    id: 'changes',
    title: '12. Changes to Terms',
    content: `We may revise these Terms at any time. When we make material changes, we will notify you by email and/or by displaying a prominent notice in the app at least 7 days before the changes take effect.

If you continue to use the Service after revised Terms take effect, you accept the updated Terms. If you disagree with the changes, you must stop using the Service and may cancel your subscription for a pro-rated refund if applicable.`,
  },
  {
    id: 'contact',
    title: '13. Contact',
    content: `If you have questions about these Terms, please contact us:

DreamLink Inc.
Email: support@dreamlink.app
Website: dreamlink.app/contact

We aim to respond to all enquiries within 2 business days.`,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white">
      {/* Sticky nav */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" />
            DreamLink
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-14">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Scale className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
              <p className="text-sm text-gray-400 mt-0.5">Last updated: June 2026 · DreamLink Inc.</p>
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
            Please read these Terms of Service carefully before using DreamLink. By creating an account or using our app, you agree to be bound by these Terms.
          </div>
        </motion.div>

        {/* Table of contents */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6 mb-10"
        >
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Contents</h2>
          <ul className="space-y-1.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm text-orange-600 hover:text-orange-700 hover:underline transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Sections */}
        <div className="space-y-10">
          {SECTIONS.map((section, i) => (
            <motion.section
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.35, delay: i < 4 ? i * 0.05 : 0 }}
              className="scroll-mt-20"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title}</h2>
              <div className="prose prose-sm prose-gray max-w-none">
                {section.content.split('\n\n').map((para, pi) => (
                  <p key={pi} className="text-gray-600 leading-relaxed mb-3 whitespace-pre-line last:mb-0">
                    {para}
                  </p>
                ))}
              </div>
              {i < SECTIONS.length - 1 && (
                <div className="border-b border-orange-50 mt-10" />
              )}
            </motion.section>
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-16 pt-8 border-t border-orange-100 flex flex-wrap gap-4 text-sm text-gray-400">
          <Link to="/privacy" className="hover:text-orange-500 transition-colors">Privacy Policy</Link>
          <Link to="/contact" className="hover:text-orange-500 transition-colors">Contact Us</Link>
          <Link to="/pricing" className="hover:text-orange-500 transition-colors">Pricing</Link>
        </div>
      </div>
    </div>
  );
}
