import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star,
  Users,
  MessageCircle,
  CheckCircle,
  ArrowRight,
  List,
  Heart,
  Zap,
  Shield,
  Globe,
} from 'lucide-react';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

export default function LandingPage() {
  const howItWorksRef = useRef<HTMLDivElement>(null);

  const scrollToHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault();
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow">
              <span className="text-lg">🌟</span>
            </div>
            <span className="font-bold text-xl text-gray-900">DreamLink</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
            <a href="#how-it-works" onClick={scrollToHowItWorks} className="hover:text-orange-500 transition-colors">How It Works</a>
            <a href="#features" className="hover:text-orange-500 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-orange-500 transition-colors">Pricing</a>
          </div>
          <Link
            to="/auth"
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors shadow-sm"
          >
            Sign Up Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-300" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />

        {/* Floating emojis */}
        <motion.div
          className="absolute top-1/4 left-6 text-4xl opacity-70 select-none"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        >🏔️</motion.div>
        <motion.div
          className="absolute top-1/3 right-8 text-3xl opacity-70 select-none"
          animate={{ y: [0, 14, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        >✈️</motion.div>
        <motion.div
          className="absolute bottom-1/3 left-10 text-3xl opacity-60 select-none"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        >🎨</motion.div>
        <motion.div
          className="absolute bottom-1/4 right-12 text-3xl opacity-60 select-none"
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        >🧘</motion.div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full mb-6 border border-white/30">
              <Star className="w-4 h-4 fill-white" />
              Join 50,000+ dreamers worldwide
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white leading-tight mb-6 drop-shadow-sm">
              Find Your People.<br />Chase Your Dreams.
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-xl sm:text-2xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed">
              Connect with people who share your bucket list goals. Stop dreaming alone — find your adventure partner, travel buddy, or lifelong crew.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/auth"
                className="flex items-center justify-center gap-2 bg-white text-orange-500 font-bold text-lg px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#how-it-works"
                onClick={scrollToHowItWorks}
                className="flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm text-white font-semibold text-lg px-8 py-4 rounded-2xl border-2 border-white/40 hover:bg-white/30 transition-all duration-200"
              >
                See How It Works
              </a>
            </motion.div>
          </motion.div>

          {/* Hero mockup cards */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
            className="mt-16 flex justify-center gap-4"
          >
            {[
              { emoji: '🏔️', name: 'Alex K.', goal: 'Hike Patagonia', match: '94%' },
              { emoji: '🎸', name: 'Maya R.', goal: 'Learn guitar & busk in Paris', match: '87%' },
            ].map((card, i) => (
              <motion.div
                key={i}
                className="bg-white rounded-3xl shadow-2xl p-4 w-36 sm:w-44 text-left"
                animate={{ rotate: i === 0 ? -3 : 3 }}
              >
                <div className="text-4xl mb-2">{card.emoji}</div>
                <div className="font-bold text-gray-900 text-sm">{card.name}</div>
                <div className="text-gray-500 text-xs mt-1 leading-snug">{card.goal}</div>
                <div className="mt-2 inline-flex items-center gap-1 bg-orange-100 text-orange-600 text-xs font-bold px-2 py-1 rounded-full">
                  <Heart className="w-3 h-3 fill-orange-500" />
                  {card.match} match
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" ref={howItWorksRef} className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-orange-500 font-semibold text-sm uppercase tracking-wider mb-3">Simple as 1-2-3</motion.p>
            <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-extrabold text-gray-900">How DreamLink Works</motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid sm:grid-cols-3 gap-8"
          >
            {[
              {
                icon: <List className="w-7 h-7 text-orange-500" />,
                step: '01',
                title: 'Add Your Bucket List Goals',
                desc: 'Tell us your wildest dreams — from skydiving in New Zealand to publishing a novel. The more specific, the better your matches.',
                emoji: '📝',
              },
              {
                icon: <Users className="w-7 h-7 text-orange-500" />,
                step: '02',
                title: 'Match With Dreamers Like You',
                desc: 'Our algorithm connects you with people who share your exact goals. Swipe through profiles and see your compatibility score.',
                emoji: '💫',
              },
              {
                icon: <Globe className="w-7 h-7 text-orange-500" />,
                step: '03',
                title: 'Go Chase Them Together',
                desc: 'Chat, plan, and make it happen. Join groups organized around specific goals, or go one-on-one with your dream partner.',
                emoji: '🚀',
              },
            ].map((item) => (
              <motion.div
                key={item.step}
                variants={fadeInUp}
                className="relative bg-orange-50 rounded-3xl p-8 text-center hover:shadow-lg transition-shadow"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {item.step}
                </div>
                <div className="text-5xl mb-4">{item.emoji}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-orange-500 font-semibold text-sm uppercase tracking-wider mb-3">Everything You Need</motion.p>
            <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-extrabold text-gray-900">Built for Dreamers</motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-10">
            {/* Swipe Cards Mockup */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeInUp}
              className="flex flex-col items-center"
            >
              <div className="relative w-48 h-64 mb-6">
                {/* Stack of cards */}
                <div className="absolute inset-0 bg-amber-200 rounded-3xl rotate-6 shadow" />
                <div className="absolute inset-0 bg-orange-200 rounded-3xl rotate-3 shadow" />
                <div className="absolute inset-0 bg-white rounded-3xl shadow-xl p-5 flex flex-col justify-between">
                  <div className="text-5xl text-center">🌊</div>
                  <div>
                    <div className="font-bold text-gray-900">Jordan M.</div>
                    <div className="text-xs text-gray-500 mt-1">Surf in Bali · Learn to freedive</div>
                    <div className="mt-3 flex gap-2">
                      <div className="bg-red-100 text-red-400 rounded-full p-2 flex-1 flex justify-center">✕</div>
                      <div className="bg-green-100 text-green-500 rounded-full p-2 flex-1 flex justify-center">♥</div>
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Smart Swipe Matching</h3>
              <p className="text-gray-500 text-sm text-center leading-relaxed">Swipe through profiles ranked by goal overlap. See your compatibility score before you even match.</p>
            </motion.div>

            {/* Messaging Mockup */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeInUp}
              className="flex flex-col items-center"
            >
              <div className="relative w-48 h-64 mb-6 bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-orange-400 to-amber-400 px-4 py-3 flex items-center gap-2">
                  <div className="text-xl">🏄</div>
                  <span className="text-white font-semibold text-sm">Jordan M.</span>
                </div>
                <div className="flex-1 p-3 space-y-2 overflow-hidden">
                  <div className="bg-orange-50 rounded-2xl rounded-tl-none px-3 py-2 text-xs text-gray-700 max-w-[80%]">
                    OMG you want to surf in Bali too?! 🏄‍♀️
                  </div>
                  <div className="bg-orange-500 rounded-2xl rounded-tr-none px-3 py-2 text-xs text-white max-w-[80%] ml-auto">
                    Yes!! Let's plan it for April 🌴
                  </div>
                  <div className="bg-orange-50 rounded-2xl rounded-tl-none px-3 py-2 text-xs text-gray-700 max-w-[80%]">
                    I'm so in!! 🎉
                  </div>
                </div>
                <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full text-xs text-gray-400 px-3 py-1.5">Message...</div>
                  <div className="text-orange-500">➤</div>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Real Conversations</h3>
              <p className="text-gray-500 text-sm text-center leading-relaxed">Message your matches instantly. No paywalls blocking meaningful connections once you match.</p>
            </motion.div>

            {/* Bucket List Mockup */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeInUp}
              className="flex flex-col items-center"
            >
              <div className="relative w-48 h-64 mb-6 bg-white rounded-3xl shadow-xl overflow-hidden p-4">
                <div className="text-sm font-bold text-gray-900 mb-3">My Bucket List ✨</div>
                {[
                  { emoji: '✈️', text: 'Northern Lights', done: true },
                  { emoji: '🤿', text: 'Dive the Great Barrier Reef', done: false },
                  { emoji: '🗼', text: 'Live abroad for 3 months', done: false },
                  { emoji: '📖', text: 'Write a novel', done: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-green-400' : 'border-2 border-orange-300'}`}>
                      {item.done && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div className={`text-xs flex-1 ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {item.emoji} {item.text}
                    </div>
                  </div>
                ))}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Track Your Dreams</h3>
              <p className="text-gray-500 text-sm text-center leading-relaxed">Organize your bucket list by category. Mark goals complete and share your victories with the community.</p>
            </motion.div>
          </div>

          {/* Additional features row */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12"
          >
            {[
              { icon: <Zap className="w-5 h-5" />, label: 'Instant Matches' },
              { icon: <Shield className="w-5 h-5" />, label: 'Safe & Verified' },
              { icon: <Users className="w-5 h-5" />, label: 'Group Adventures' },
              { icon: <MessageCircle className="w-5 h-5" />, label: 'Group Chats' },
            ].map((feat) => (
              <motion.div
                key={feat.label}
                variants={fadeInUp}
                className="flex flex-col items-center gap-2 bg-white rounded-2xl p-4 shadow-sm border border-orange-100 text-center"
              >
                <div className="text-orange-500">{feat.icon}</div>
                <span className="text-xs font-semibold text-gray-700">{feat.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-orange-500 font-semibold text-sm uppercase tracking-wider mb-3">Simple Pricing</motion.p>
            <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-extrabold text-gray-900">Choose Your Adventure</motion.h2>
            <motion.p variants={fadeInUp} className="text-gray-500 mt-4 max-w-xl mx-auto">Start free. Upgrade when you're ready to unlock your full potential.</motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {[
              {
                name: 'Free',
                price: '$0',
                period: 'forever',
                color: 'bg-gray-50 border-gray-200',
                highlight: false,
                badge: null,
                features: ['5 swipes per day', '3 active goals', '10 messages/day', 'Basic matching'],
              },
              {
                name: 'Premium',
                price: '$9.99',
                period: '/month',
                color: 'bg-gradient-to-b from-orange-500 to-amber-500 border-transparent',
                highlight: true,
                badge: 'Most Popular',
                features: ['Unlimited swipes', 'Unlimited goals', 'Unlimited messages', 'See who liked you', 'Priority placement'],
              },
              {
                name: 'Elite',
                price: '$24.99',
                period: '/month',
                color: 'bg-gray-50 border-gray-200',
                highlight: false,
                badge: 'Best Value',
                features: ['Everything in Premium', 'Advanced analytics', 'Goal breakdown insights', 'VIP support', 'Exclusive groups'],
              },
              {
                name: 'Business',
                price: '$99',
                period: '/month',
                color: 'bg-gray-50 border-gray-200',
                highlight: false,
                badge: null,
                features: ['Team goal tracking', 'Up to 50 members', 'Custom branding', 'API access', 'Dedicated account manager'],
              },
            ].map((tier) => (
              <motion.div
                key={tier.name}
                variants={fadeInUp}
                className={`relative rounded-3xl border p-6 flex flex-col ${tier.color} ${tier.highlight ? 'scale-105 shadow-2xl' : 'shadow-sm'}`}
              >
                {tier.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full ${tier.highlight ? 'bg-white text-orange-500' : 'bg-orange-500 text-white'}`}>
                    {tier.badge}
                  </div>
                )}
                <div className={`font-bold text-lg mb-1 ${tier.highlight ? 'text-white' : 'text-gray-900'}`}>{tier.name}</div>
                <div className={`text-3xl font-extrabold ${tier.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {tier.price}
                  <span className={`text-sm font-normal ${tier.highlight ? 'text-white/80' : 'text-gray-500'}`}>{tier.period}</span>
                </div>
                <div className={`my-4 border-t ${tier.highlight ? 'border-white/30' : 'border-gray-200'}`} />
                <ul className="space-y-2 flex-1 mb-6">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${tier.highlight ? 'text-white' : 'text-orange-400'}`} />
                      <span className={`text-sm ${tier.highlight ? 'text-white/90' : 'text-gray-600'}`}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth"
                  className={`text-center text-sm font-bold py-3 rounded-2xl transition-all duration-200 ${
                    tier.highlight
                      ? 'bg-white text-orange-500 hover:bg-orange-50'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  {tier.name === 'Free' ? 'Get Started' : 'Get ' + tier.name}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-orange-50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-orange-500 font-semibold text-sm uppercase tracking-wider mb-3">Real Stories</motion.p>
            <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-extrabold text-gray-900">Dreams Come True</motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid sm:grid-cols-3 gap-6"
          >
            {[
              {
                emoji: '🏔️',
                name: 'Sarah Chen',
                location: 'San Francisco, CA',
                quote: 'I matched with two people who both wanted to hike Kilimanjaro. Six months later, we actually did it together. DreamLink changed my life.',
                goals: 'Climbed Kilimanjaro 🏔️',
              },
              {
                emoji: '🎸',
                name: 'Marcus Williams',
                location: 'Austin, TX',
                quote: 'Found my bandmate on DreamLink of all places! We both had "start a band" on our lists. We just released our first EP.',
                goals: 'Released first EP 🎶',
              },
              {
                emoji: '🌏',
                name: 'Priya Nair',
                location: 'London, UK',
                quote: 'I was nervous to travel solo to Southeast Asia. DreamLink connected me with three other women doing the same trip. Best month of my life.',
                goals: 'Backpacked SE Asia 🌏',
              },
            ].map((t) => (
              <motion.div
                key={t.name}
                variants={fadeInUp}
                className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-6 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-xl">{t.emoji}</div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-gray-500 text-xs">{t.location}</div>
                  </div>
                </div>
                <div className="mt-4 bg-green-50 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {t.goals}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-orange-500 to-amber-400 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Ready to Start?
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-white/90 text-xl mb-10">
            Your people are out there, sharing your exact dreams. The only question is — when are you going to find them?
          </motion.p>
          <motion.div variants={fadeInUp}>
            <Link
              to="/auth"
              className="inline-flex items-center gap-3 bg-white text-orange-500 font-extrabold text-lg px-10 py-5 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
            >
              Create Your Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
          <motion.p variants={fadeInUp} className="text-white/70 text-sm mt-6">
            No credit card required. Free forever plan available.
          </motion.p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8 mb-10">
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-2 mb-3 justify-center sm:justify-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow">
                  <span className="text-lg">🌟</span>
                </div>
                <span className="font-bold text-xl text-white">DreamLink</span>
              </div>
              <p className="text-sm max-w-xs leading-relaxed">
                Connecting dreamers worldwide. Chase your bucket list with people who get it.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-8 text-sm">
              <div className="text-center sm:text-left">
                <div className="text-white font-semibold mb-3">Product</div>
                <div className="space-y-2">
                  <a href="#how-it-works" onClick={scrollToHowItWorks} className="block hover:text-orange-400 transition-colors">How It Works</a>
                  <a href="#features" className="block hover:text-orange-400 transition-colors">Features</a>
                  <a href="#pricing" className="block hover:text-orange-400 transition-colors">Pricing</a>
                </div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-white font-semibold mb-3">Legal</div>
                <div className="space-y-2">
                  <Link to="/terms" className="block hover:text-orange-400 transition-colors">Terms of Service</Link>
                  <Link to="/privacy" className="block hover:text-orange-400 transition-colors">Privacy Policy</Link>
                  <Link to="/contact" className="block hover:text-orange-400 transition-colors">Contact Us</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-xs">
            <p>© {new Date().getFullYear()} DreamLink. All rights reserved. Made with ❤️ for dreamers everywhere.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
