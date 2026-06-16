import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { X, Heart, SlidersHorizontal, RefreshCw, MapPin, Zap, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, getAvatarUrl } from '../lib/supabase';
import {
  DiscoverUser,
  GoalCategory,
  GOAL_CATEGORIES,
  TIER_LIMITS,
  BucketListGoal,
} from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function getInitials(name?: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function matchColor(pct: number) {
  if (pct >= 70) return 'bg-green-500 text-white';
  if (pct >= 40) return 'bg-orange-500 text-white';
  return 'bg-gray-400 text-white';
}

function calcMatchScore(
  myGoals: BucketListGoal[],
  myInterests: string[],
  theirGoals: BucketListGoal[],
  theirInterests: string[]
): { score: number; sharedGoalTitles: string[] } {
  const myGoalTitles = new Set(myGoals.map((g) => g.title.toLowerCase()));
  const myInterestSet = new Set(myInterests.map((i) => i.toLowerCase()));

  const sharedGoalItems = theirGoals.filter((g) => myGoalTitles.has(g.title.toLowerCase()));
  const sharedInterestItems = theirInterests.filter((i) => myInterestSet.has(i.toLowerCase()));

  const totalGoals = Math.max(1, myGoals.length + theirGoals.length);
  const totalInterests = Math.max(1, myInterests.length + theirInterests.length);

  const score =
    (sharedGoalItems.length / totalGoals) * 60 +
    (sharedInterestItems.length / totalInterests) * 40;

  return {
    score: Math.min(100, Math.round(score)),
    sharedGoalTitles: sharedGoalItems.map((g) => g.title),
  };
}

// ─── upgrade modal ───────────────────────────────────────────────────────────

function UpgradeModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-4xl">
            ⚡
          </span>
        </div>
        <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Daily Swipes Used Up
        </h2>
        <p className="mb-6 text-center text-gray-500">
          Upgrade to DreamLink Premium and unlock <strong>unlimited swipes</strong>, see who liked
          you, and more.
        </p>
        <button
          onClick={() => navigate('/pricing')}
          className="mb-3 w-full rounded-2xl bg-orange-500 py-4 text-lg font-bold text-white transition active:scale-95"
        >
          Unlock Unlimited Swipes
        </button>
        <button onClick={onClose} className="w-full text-sm text-gray-400">
          Maybe later
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── filter drawer ───────────────────────────────────────────────────────────

interface Filters {
  maxDistance: number;
  ageMin: number;
  ageMax: number;
  category: GoalCategory | 'all';
}

function FilterDrawer({
  filters,
  onApply,
  onClose,
}: {
  filters: Filters;
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<Filters>(filters);

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md rounded-t-3xl bg-white px-6 pb-10 pt-4 shadow-2xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* handle */}
        <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-gray-200" />
        <h3 className="mb-6 text-xl font-bold text-gray-900">Filters</h3>

        {/* distance */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Max Distance</span>
            <span className="text-sm font-bold text-orange-500">{local.maxDistance} km</span>
          </div>
          <input
            type="range"
            min={5}
            max={500}
            step={5}
            value={local.maxDistance}
            onChange={(e) => setLocal((f) => ({ ...f, maxDistance: Number(e.target.value) }))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-orange-200 accent-orange-500"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-400">
            <span>5 km</span>
            <span>500 km</span>
          </div>
        </div>

        {/* age range */}
        <div className="mb-5">
          <span className="mb-2 block text-sm font-semibold text-gray-700">Age Range</span>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={18}
              max={local.ageMax}
              value={local.ageMin}
              onChange={(e) => setLocal((f) => ({ ...f, ageMin: Number(e.target.value) }))}
              className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-center text-sm font-semibold focus:border-orange-400 focus:outline-none"
            />
            <span className="text-gray-400">—</span>
            <input
              type="number"
              min={local.ageMin}
              max={100}
              value={local.ageMax}
              onChange={(e) => setLocal((f) => ({ ...f, ageMax: Number(e.target.value) }))}
              className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-center text-sm font-semibold focus:border-orange-400 focus:outline-none"
            />
          </div>
        </div>

        {/* category */}
        <div className="mb-8">
          <span className="mb-3 block text-sm font-semibold text-gray-700">Goal Category</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setLocal((f) => ({ ...f, category: 'all' }))}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                local.category === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {GOAL_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setLocal((f) => ({ ...f, category: cat.value }))}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  local.category === cat.value
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            onApply(local);
            onClose();
          }}
          className="w-full rounded-2xl bg-orange-500 py-4 font-bold text-white transition active:scale-95"
        >
          Apply Filters
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── skeleton card ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="relative h-full w-full animate-pulse overflow-hidden rounded-3xl bg-gray-100">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-200 via-gray-100 to-gray-300" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="mb-2 h-7 w-40 rounded-full bg-gray-300" />
        <div className="mb-3 h-4 w-28 rounded-full bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-orange-200" />
          <div className="h-6 w-24 rounded-full bg-orange-200" />
        </div>
      </div>
    </div>
  );
}

// ─── match overlay ───────────────────────────────────────────────────────────

function MatchOverlay({
  user,
  onDismiss,
}: {
  user: DiscoverUser;
  onDismiss: () => void;
}) {
  const avatarUrl = getAvatarUrl(user.avatar_url);
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-orange-600 to-rose-600 px-8 text-white"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      {/* confetti-ish particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-3 w-3 rounded-full"
          style={{ backgroundColor: ['#fbbf24', '#f97316', '#fb7185', '#a78bfa'][i % 4] }}
          initial={{ x: 0, y: 0, scale: 0 }}
          animate={{
            x: (Math.random() - 0.5) * 300,
            y: (Math.random() - 0.5) * 400,
            scale: [0, 1.5, 0],
            rotate: Math.random() * 360,
          }}
          transition={{ duration: 1.2, delay: i * 0.06, ease: 'easeOut' }}
        />
      ))}

      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-6 text-5xl font-black tracking-tight"
      >
        It's a Match!
      </motion.div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
        className="mb-4 h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-xl"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={user.full_name ?? ''} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-orange-300 text-3xl font-bold text-white">
            {getInitials(user.full_name)}
          </div>
        )}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-1 text-xl font-bold"
      >
        {user.full_name}
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mb-10 text-center text-sm text-white/80"
      >
        You both share {user.shared_goals.length} dream{user.shared_goals.length !== 1 ? 's' : ''}!
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        onClick={onDismiss}
        className="w-full max-w-xs rounded-2xl bg-white px-6 py-4 text-center font-bold text-orange-600 shadow-lg transition active:scale-95"
      >
        Send a Message
      </motion.button>
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75 }}
        onClick={onDismiss}
        className="mt-3 text-sm text-white/70"
      >
        Keep Swiping
      </motion.button>
    </motion.div>
  );
}

// ─── profile card ────────────────────────────────────────────────────────────

interface ProfileCardProps {
  user: DiscoverUser;
  onLike: () => void;
  onPass: () => void;
  isTop: boolean;
  stackIndex: number; // 0 = top, 1,2,3 = behind
}

function ProfileCard({ user, onLike, onPass, isTop, stackIndex }: ProfileCardProps) {
  const avatarUrl = getAvatarUrl(user.avatar_url);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-18, 0, 18]);
  const likeOpacity = useTransform(x, [20, 80], [0, 1]);
  const passOpacity = useTransform(x, [-80, -20], [1, 0]);

  const handleDragEnd = useCallback(
    async (_: unknown, info: { offset: { x: number } }) => {
      const threshold = 100;
      if (info.offset.x > threshold) {
        await controls.start({ x: 600, opacity: 0, transition: { duration: 0.35 } });
        onLike();
      } else if (info.offset.x < -threshold) {
        await controls.start({ x: -600, opacity: 0, transition: { duration: 0.35 } });
        onPass();
      } else {
        controls.start({ x: 0, rotate: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } });
      }
    },
    [controls, onLike, onPass]
  );

  const scaleBack = 1 - stackIndex * 0.04;
  const yBack = stackIndex * 12;

  if (!isTop) {
    return (
      <motion.div
        className="absolute inset-0 overflow-hidden rounded-3xl bg-white shadow-lg"
        style={{ scale: scaleBack, y: -yBack, zIndex: 10 - stackIndex }}
        animate={{ scale: scaleBack, y: -yBack }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <CardContent avatarUrl={avatarUrl} user={user} />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab overflow-hidden rounded-3xl bg-white shadow-2xl active:cursor-grabbing"
      style={{ x, rotate, zIndex: 20 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      animate={controls}
      onDragEnd={handleDragEnd}
    >
      {/* LIKE stamp */}
      <motion.div
        className="pointer-events-none absolute left-6 top-10 z-30 rotate-[-20deg] rounded-xl border-4 border-green-400 px-4 py-1.5"
        style={{ opacity: likeOpacity }}
      >
        <span className="text-2xl font-black tracking-wider text-green-400">LIKE</span>
      </motion.div>
      {/* PASS stamp */}
      <motion.div
        className="pointer-events-none absolute right-6 top-10 z-30 rotate-[20deg] rounded-xl border-4 border-red-400 px-4 py-1.5"
        style={{ opacity: passOpacity }}
      >
        <span className="text-2xl font-black tracking-wider text-red-400">PASS</span>
      </motion.div>

      <CardContent avatarUrl={avatarUrl} user={user} />

      {/* action buttons overlay */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-8 pb-8">
        <button
          className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-xl transition active:scale-90"
          onClick={onPass}
        >
          <X className="h-7 w-7 text-rose-500" strokeWidth={2.5} />
        </button>
        <button
          className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-500 shadow-xl transition active:scale-90"
          onClick={onLike}
        >
          <Heart className="h-7 w-7 text-white" fill="white" strokeWidth={2} />
        </button>
      </div>
    </motion.div>
  );
}

function CardContent({
  avatarUrl,
  user,
}: {
  avatarUrl: string | null;
  user: DiscoverUser;
}) {
  const pct = user.match_percentage;
  const badgeClass = matchColor(pct);

  return (
    <div className="relative h-full w-full select-none">
      {/* photo / gradient */}
      {avatarUrl ? (
        <img src={avatarUrl} alt={user.full_name ?? ''} className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-7xl font-black text-white"
          style={{
            background: `linear-gradient(135deg, #f97316 0%, #fb923c 40%, #fdba74 100%)`,
          }}
        >
          {getInitials(user.full_name)}
        </div>
      )}

      {/* gradient scrim at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* match % badge */}
      <div
        className={`absolute right-4 top-4 z-10 flex h-12 w-12 flex-col items-center justify-center rounded-full shadow-lg ${badgeClass}`}
      >
        <span className="text-xs font-black leading-none">{pct}%</span>
        <span className="text-[9px] leading-none opacity-80">match</span>
      </div>

      {/* info panel */}
      <div className="absolute bottom-28 left-0 right-0 px-5 pb-2 text-white">
        <div className="mb-1 flex items-end gap-2">
          <span className="text-2xl font-bold leading-tight">
            {user.full_name ?? 'Unknown'}
          </span>
          {user.age && (
            <span className="mb-0.5 text-lg font-light text-white/80">{user.age}</span>
          )}
        </div>

        {(user.location || user.distance_km !== undefined) && (
          <div className="mb-3 flex items-center gap-1 text-xs text-white/70">
            <MapPin className="h-3 w-3" />
            {user.location && <span>{user.location}</span>}
            {user.distance_km !== undefined && (
              <span className="ml-1">· {Math.round(user.distance_km)} km away</span>
            )}
          </div>
        )}

        {/* shared goals */}
        {user.shared_goals.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {user.shared_goals.slice(0, 3).map((goal) => (
              <span
                key={goal}
                className="rounded-full bg-orange-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
              >
                {goal}
              </span>
            ))}
          </div>
        )}

        {/* interests */}
        {user.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {user.interests.slice(0, 5).map((interest) => (
              <span
                key={interest}
                className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs text-white/90 backdrop-blur-sm"
              >
                {interest}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="mb-6 text-7xl">🌍</div>
      <h2 className="mb-2 text-2xl font-bold text-gray-900">You've seen everyone nearby</h2>
      <p className="mb-8 text-gray-500">
        Expand your filters or check back later for new dream seekers.
      </p>
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 rounded-2xl bg-orange-500 px-8 py-3.5 font-bold text-white shadow-lg transition active:scale-95"
      >
        <RefreshCw className="h-4 w-4" />
        Refresh
      </button>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<DiscoverUser[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [matchedUser, setMatchedUser] = useState<DiscoverUser | null>(null);
  const [swipesToday, setSwipesToday] = useState(profile?.swipes_today ?? 0);

  const [filters, setFilters] = useState<Filters>({
    maxDistance: 100,
    ageMin: 18,
    ageMax: 65,
    category: 'all',
  });

  // My own goals + interests for scoring
  const myGoalsRef = useRef<BucketListGoal[]>([]);
  const myInterestsRef = useRef<string[]>([]);

  const tier = profile?.subscription_tier ?? 'free';
  const swipeLimit = TIER_LIMITS[tier].swipes_per_day;
  const canSwipe = swipeLimit === Infinity || swipesToday < swipeLimit;

  // ── fetch my data ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetchMyData = async () => {
      const [goalsRes, interestsRes] = await Promise.all([
        supabase.from('bucket_list_goals').select('*').eq('user_id', user.id).eq('is_public', true),
        supabase.from('user_interests').select('interest').eq('user_id', user.id),
      ]);
      myGoalsRef.current = (goalsRes.data as BucketListGoal[]) ?? [];
      myInterestsRef.current = (interestsRes.data ?? []).map(
        (r: { interest: string }) => r.interest
      );
    };
    fetchMyData();
  }, [user]);

  // ── fetch discover profiles ────────────────────────────────────────────────
  const fetchProfiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get already-swiped IDs
      const { data: swipedData } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', user.id);

      const swipedIds = (swipedData ?? []).map((s: { swiped_id: string }) => s.swiped_id);

      // Get blocked IDs (both directions)
      const { data: blockedData } = await supabase
        .from('blocks')
        .select('blocked_id, blocker_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

      const blockedIds = (blockedData ?? []).map((b: { blocked_id: string; blocker_id: string }) =>
        b.blocker_id === user.id ? b.blocked_id : b.blocker_id
      );

      const excludeIds = [...new Set([user.id, ...swipedIds, ...blockedIds])];

      // Fetch candidate profiles
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_guest', false)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(50);

      if (filters.ageMin) query = query.gte('age', filters.ageMin);
      if (filters.ageMax) query = query.lte('age', filters.ageMax);

      const { data: profilesData, error } = await query;
      if (error) throw error;

      const candidates = (profilesData ?? []) as DiscoverUser[];

      // Fetch goals + interests for each candidate
      const enriched = await Promise.all(
        candidates.map(async (p) => {
          const [goalsRes, interestsRes] = await Promise.all([
            supabase
              .from('bucket_list_goals')
              .select('*')
              .eq('user_id', p.id)
              .eq('is_public', true),
            supabase.from('user_interests').select('interest').eq('user_id', p.id),
          ]);

          const goals = (goalsRes.data as BucketListGoal[]) ?? [];
          const interests = ((interestsRes.data ?? []) as { interest: string }[]).map(
            (r) => r.interest
          );

          // Filter by category
          const filteredGoals =
            filters.category === 'all'
              ? goals
              : goals.filter((g) => g.category === filters.category);

          const { score, sharedGoalTitles } = calcMatchScore(
            myGoalsRef.current,
            myInterestsRef.current,
            filteredGoals,
            interests
          );

          // Distance calculation (haversine)
          let distance_km: number | undefined;
          if (
            profile?.latitude &&
            profile?.longitude &&
            p.latitude &&
            p.longitude
          ) {
            const R = 6371;
            const dLat = ((p.latitude - profile.latitude) * Math.PI) / 180;
            const dLon = ((p.longitude - profile.longitude) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos((profile.latitude * Math.PI) / 180) *
                Math.cos((p.latitude * Math.PI) / 180) *
                Math.sin(dLon / 2) ** 2;
            distance_km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          }

          return {
            ...p,
            goals,
            interests,
            match_percentage: score,
            shared_goals: sharedGoalTitles,
            distance_km,
          } as DiscoverUser;
        })
      );

      // Filter by distance
      const distanceFiltered = enriched.filter((p) =>
        p.distance_km === undefined ? true : p.distance_km <= filters.maxDistance
      );

      // Sort by match %
      distanceFiltered.sort((a, b) => b.match_percentage - a.match_percentage);

      setProfiles(distanceFiltered);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, [user, profile, filters]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // ── record swipe ───────────────────────────────────────────────────────────
  const recordSwipe = async (targetUser: DiscoverUser, action: 'like' | 'pass') => {
    if (!user) return;

    // Optimistic UI: advance card
    setCurrentIndex((i) => i + 1);

    if (action === 'like') {
      const newCount = swipesToday + 1;
      setSwipesToday(newCount);

      try {
        // Record swipe
        await supabase.from('swipes').insert({
          swiper_id: user.id,
          swiped_id: targetUser.id,
          action: 'like',
        });

        // Update daily count in profile
        await supabase
          .from('profiles')
          .update({ swipes_today: newCount })
          .eq('id', user.id);

        // Check if mutual like (i.e. they already liked us)
        const { data: theirSwipe } = await supabase
          .from('swipes')
          .select('id')
          .eq('swiper_id', targetUser.id)
          .eq('swiped_id', user.id)
          .eq('action', 'like')
          .maybeSingle();

        if (theirSwipe) {
          // Create match
          const matchPct = targetUser.match_percentage;
          const sharedGoalIds = targetUser.goals
            .filter((g) => targetUser.shared_goals.includes(g.title))
            .map((g) => g.id);

          await supabase.from('matches').insert({
            user1_id: user.id,
            user2_id: targetUser.id,
            match_percentage: matchPct,
            shared_goals: targetUser.shared_goals,
            shared_goal_ids: sharedGoalIds,
          });

          setMatchedUser(targetUser);
        }
      } catch (err) {
        console.error('Error recording like:', err);
      }
    } else {
      // pass — record but don't count against daily limit
      supabase.from('swipes').insert({
        swiper_id: user.id,
        swiped_id: targetUser.id,
        action: 'pass',
      });
    }
  };

  const handleLike = () => {
    const target = profiles[currentIndex];
    if (!target) return;
    if (!canSwipe) {
      setShowUpgrade(true);
      return;
    }
    recordSwipe(target, 'like');
  };

  const handlePass = () => {
    const target = profiles[currentIndex];
    if (!target) return;
    recordSwipe(target, 'pass');
  };

  const handleMatchDismiss = () => {
    const matchId = matchedUser;
    setMatchedUser(null);
    if (matchId) {
      navigate('/matches');
    }
  };

  const remaining = profiles.length - currentIndex;
  const currentUser = profiles[currentIndex];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-orange-50">
      {/* header */}
      <header className="flex items-center justify-between px-4 pb-2 pt-safe-top pt-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Dream<span className="text-orange-500">Link</span>
          </h1>
          <p className="text-xs text-gray-400">
            {tier === 'free' && swipeLimit !== Infinity
              ? `${Math.max(0, swipeLimit - swipesToday)} swipes left today`
              : 'Unlimited swipes'}
          </p>
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition active:scale-90"
        >
          <SlidersHorizontal className="h-5 w-5 text-gray-600" />
        </button>
      </header>

      {/* swipe limit bar (free tier) */}
      {tier === 'free' && swipeLimit !== Infinity && (
        <div className="mx-4 mb-2 overflow-hidden rounded-full bg-gray-200 h-1.5">
          <div
            className="h-full rounded-full bg-orange-400 transition-all"
            style={{ width: `${Math.max(0, (1 - swipesToday / swipeLimit) * 100)}%` }}
          />
        </div>
      )}

      {/* card area */}
      <div className="relative flex flex-1 items-center justify-center px-4 pb-4">
        {loading ? (
          <div className="relative h-[70vh] w-full max-w-sm">
            <SkeletonCard />
          </div>
        ) : remaining === 0 ? (
          <EmptyState onRefresh={fetchProfiles} />
        ) : (
          <div className="relative h-[70vh] w-full max-w-sm">
            {/* stack (behind cards) */}
            <AnimatePresence>
              {[2, 1].map((offset) => {
                const idx = currentIndex + offset;
                if (idx >= profiles.length) return null;
                return (
                  <ProfileCard
                    key={profiles[idx].id}
                    user={profiles[idx]}
                    onLike={handleLike}
                    onPass={handlePass}
                    isTop={false}
                    stackIndex={offset}
                  />
                );
              })}
            </AnimatePresence>

            {/* top card */}
            <AnimatePresence mode="wait">
              {currentUser && (
                <ProfileCard
                  key={currentUser.id}
                  user={currentUser}
                  onLike={handleLike}
                  onPass={handlePass}
                  isTop={true}
                  stackIndex={0}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* upgrade nudge when limit hit (inline) */}
      {!loading && !canSwipe && remaining > 0 && (
        <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl bg-orange-100 px-4 py-3">
          <Zap className="h-5 w-5 shrink-0 text-orange-500" />
          <p className="flex-1 text-sm text-orange-800">
            Daily swipe limit reached.{' '}
            <button
              onClick={() => setShowUpgrade(true)}
              className="font-bold underline"
            >
              Upgrade for unlimited
            </button>
          </p>
        </div>
      )}

      {/* modals */}
      <AnimatePresence>
        {showFilters && (
          <FilterDrawer
            filters={filters}
            onApply={(f) => {
              setFilters(f);
              setShowFilters(false);
            }}
            onClose={() => setShowFilters(false)}
          />
        )}
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
        {matchedUser && (
          <MatchOverlay user={matchedUser} onDismiss={handleMatchDismiss} />
        )}
      </AnimatePresence>
    </div>
  );
}
