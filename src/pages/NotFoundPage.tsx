import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Compass } from 'lucide-react';

// ---------------------------------------------------------------------------
// Floating background decorations
// ---------------------------------------------------------------------------
const FLOATERS = [
  { emoji: '⭐', size: 'text-2xl', x: '10%',  delay: 0,    duration: 3.2 },
  { emoji: '✨', size: 'text-xl',  x: '85%',  delay: 0.4,  duration: 2.8 },
  { emoji: '🌙', size: 'text-lg',  x: '25%',  delay: 0.8,  duration: 3.6 },
  { emoji: '💫', size: 'text-2xl', x: '70%',  delay: 1.2,  duration: 3.0 },
  { emoji: '🔮', size: 'text-lg',  x: '50%',  delay: 0.2,  duration: 4.0 },
  { emoji: '🌟', size: 'text-xl',  x: '40%',  delay: 1.5,  duration: 2.6 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function NotFoundPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-orange-50 via-amber-50 to-white flex flex-col items-center justify-center overflow-hidden px-4">
      {/* Floating background emojis */}
      {FLOATERS.map((f, i) => (
        <motion.div
          key={i}
          className={`absolute ${f.size} pointer-events-none select-none opacity-30`}
          style={{ left: f.x, top: '15%' }}
          animate={{ y: [0, -18, 0], rotate: [0, 8, -8, 0] }}
          transition={{
            duration: f.duration,
            delay: f.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {f.emoji}
        </motion.div>
      ))}

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 text-center max-w-md"
      >
        {/* Animated star hero */}
        <motion.div
          animate={{
            y: [0, -12, 0],
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="text-7xl md:text-8xl mb-6 inline-block"
          aria-hidden="true"
        >
          🌟
        </motion.div>

        {/* 404 pill */}
        <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 rounded-full px-4 py-1.5 text-sm font-bold mb-6">
          404 — Page not found
        </div>

        {/* Heading */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 leading-tight">
          Looks like this dream doesn&apos;t exist yet!
        </h1>

        {/* Sub-copy */}
        <p className="text-gray-500 text-lg mb-10 leading-relaxed">
          The page you are looking for may have moved, been deleted, or never existed in the first place. But hey — that just means there is room to add something new to your bucket list.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-2xl transition-all duration-150 shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 bg-white text-orange-500 border border-orange-200 hover:bg-orange-50 font-bold px-6 py-3 rounded-2xl transition-all duration-150 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
          >
            <Compass className="w-4 h-4" />
            Back to Discover
          </Link>
        </div>

        {/* Divider */}
        <div className="mt-12 flex items-center gap-3 text-gray-300">
          <div className="flex-1 h-px bg-orange-100" />
          <span className="text-sm">or</span>
          <div className="flex-1 h-px bg-orange-100" />
        </div>

        {/* Secondary links */}
        <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-gray-400">
          <Link to="/pricing" className="hover:text-orange-500 transition-colors">
            View Plans
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/contact" className="hover:text-orange-500 transition-colors">
            Contact Support
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms" className="hover:text-orange-500 transition-colors">
            Terms of Service
          </Link>
        </div>
      </motion.div>

      {/* Bottom gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(251, 191, 36, 0.05))',
        }}
      />
    </div>
  );
}
