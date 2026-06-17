import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  Globe,
  Users,
  Camera,
  Crown,
  X,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase, getGoalPhotoUrl, uploadGoalPhoto } from '../lib/supabase';
import {
  BucketListGoal,
  GoalCategory,
  GOAL_CATEGORIES,
  TIER_LIMITS,
} from '../types';
import { useNavigate } from 'react-router-dom';

// ─── Types / constants ────────────────────────────────────────────────────────

const FILTER_TABS: { value: 'all' | GoalCategory; label: string; emoji: string }[] = [
  { value: 'all', label: 'All', emoji: '✨' },
  ...GOAL_CATEGORIES.map((c) => ({ value: c.value as GoalCategory, label: c.label, emoji: c.emoji })),
];

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', icon: Circle, color: 'text-gray-400' },
  { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-orange-500' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-green-500' },
] as const;

type GoalStatus = typeof STATUS_OPTIONS[number]['value'];

interface GoalWithStatus extends BucketListGoal {
  status: GoalStatus;
}

function getStatus(goal: BucketListGoal): GoalStatus {
  if (goal.is_completed) return 'completed';
  // We store in_progress via description prefix hack or just treat all non-completed as not started
  // Use completion_note absence as in-progress signal if you add that field; default not_started
  return 'not_started';
}

function categoryMeta(cat: GoalCategory) {
  return GOAL_CATEGORIES.find((c) => c.value === cat)!;
}

// ─── Confetti burst ───────────────────────────────────────────────────────────

const CONFETTI = ['🎉', '⭐', '🔥', '🌟', '✨', '🎊', '💫'];

function ConfettiBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl"
          initial={{
            x: `${20 + Math.random() * 60}vw`,
            y: '50vh',
            opacity: 1,
            scale: 0.5,
          }}
          animate={{
            y: `${-10 + Math.random() * -40}vh`,
            x: `${10 + Math.random() * 80}vw`,
            opacity: 0,
            scale: 1.5,
            rotate: Math.random() * 360,
          }}
          transition={{ duration: 1.5 + Math.random() * 0.5, ease: 'easeOut' }}
        >
          {CONFETTI[i % CONFETTI.length]}
        </motion.span>
      ))}
    </div>
  );
}

// ─── Who Else Modal ───────────────────────────────────────────────────────────

function WhoElseModal({
  goal,
  count,
  onClose,
}: {
  goal: BucketListGoal;
  count: number;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        className="relative w-full bg-white rounded-t-3xl p-6 pb-8 shadow-2xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
        <h3 className="font-bold text-lg text-gray-900 mb-1">
          {categoryMeta(goal.category).emoji} {goal.title}
        </h3>
        <p className="text-orange-600 font-semibold text-sm mb-4">
          {count} {count === 1 ? 'person wants' : 'people want'} this too
        </p>
        <p className="text-sm text-gray-500 leading-relaxed">
          Connect with others who share this dream by discovering your matches in the Discover tab!
        </p>
        <button
          onClick={onClose}
          className="mt-5 w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-md shadow-orange-200"
        >
          Got it
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Complete Goal Modal ───────────────────────────────────────────────────────

function CompleteGoalModal({
  goal,
  onClose,
  onConfirm,
}: {
  goal: BucketListGoal;
  onClose: () => void;
  onConfirm: (date: string, note: string, photoFile: File | null) => Promise<void>;
}) {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(date, note, photoFile);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        className="relative w-full bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-h-[85dvh] overflow-y-auto"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
        <h3 className="font-bold text-lg text-gray-900 mb-1">Mark as Completed 🎉</h3>
        <p className="text-sm text-gray-500 mb-5">
          Celebrate completing: <span className="font-medium text-gray-700">{goal.title}</span>
        </p>

        {/* Date */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Completion Date
        </label>
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 mb-4">
          <Calendar className="w-4 h-4 text-orange-500" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="flex-1 bg-transparent text-sm text-gray-800 outline-none"
          />
        </div>

        {/* Photo */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Add a Photo (optional)
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhoto}
        />
        {photoPreview ? (
          <div className="relative mb-4">
            <img
              src={photoPreview}
              alt="Preview"
              className="w-full h-40 object-cover rounded-2xl"
            />
            <button
              onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
              className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full h-28 border-2 border-dashed border-orange-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-orange-400 hover:bg-orange-50 transition-colors mb-4"
          >
            <Camera className="w-6 h-6" />
            <span className="text-sm">Tap to add photo</span>
          </button>
        )}

        {/* Note */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="How did it feel? Any memories to capture..."
          rows={3}
          className="w-full bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-orange-400 resize-none mb-5"
        />

        <button
          onClick={handleConfirm}
          disabled={saving}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-md shadow-orange-200 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Confirm Completion 🎉'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

function GoalModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Partial<BucketListGoal>;
  onClose: () => void;
  onSave: (data: {
    title: string;
    category: GoalCategory;
    description: string;
    is_public: boolean;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState<GoalCategory>(
    initial?.category ?? 'travel'
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a goal title');
      return;
    }
    setSaving(true);
    try {
      await onSave({ title: title.trim(), category, description, is_public: isPublic });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        className="relative w-full bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-h-[90dvh] overflow-y-auto"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-gray-900">
            {initial?.id ? 'Edit Goal' : 'Add New Goal'}
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Title */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Goal Title <span className="text-orange-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. See the Northern Lights"
          className="w-full bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-orange-400 mb-4"
        />

        {/* Category */}
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {GOAL_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                category === cat.value
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-orange-300'
              }`}
            >
              <span className="text-xl">{cat.emoji}</span>
              <span className="text-[10px] text-gray-600 leading-tight text-center">
                {cat.label}
              </span>
            </button>
          ))}
        </div>

        {/* Description */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell the story behind this dream..."
          rows={3}
          className="w-full bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-orange-400 resize-none mb-4"
        />

        {/* Public toggle */}
        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl mb-6">
          <div className="flex items-center gap-2">
            {isPublic ? (
              <Globe className="w-4 h-4 text-orange-500" />
            ) : (
              <Lock className="w-4 h-4 text-gray-500" />
            )}
            <span className="text-sm font-medium text-gray-700">
              {isPublic ? 'Public — visible to matches' : 'Private — only you see this'}
            </span>
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              isPublic ? 'bg-orange-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isPublic ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-md shadow-orange-200 disabled:opacity-50"
        >
          {saving ? 'Saving...' : initial?.id ? 'Save Changes' : 'Add to Bucket List'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Upgrade Prompt ───────────────────────────────────────────────────────────

function UpgradePrompt({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="text-center mb-4">
          <div className="text-5xl mb-3">👑</div>
          <h3 className="font-bold text-xl text-gray-900 mb-1">Unlock Unlimited Goals</h3>
          <p className="text-sm text-gray-500">
            Free accounts support up to 3 bucket list goals. Upgrade to add unlimited dreams!
          </p>
        </div>
        <button
          onClick={() => navigate('/pricing')}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-md shadow-orange-200 mb-3"
        >
          Upgrade to Premium
        </button>
        <button
          onClick={onClose}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Maybe later
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Goal Card ─────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  onEdit,
  onComplete,
  onDelete,
  onWhoElse,
}: {
  goal: BucketListGoal;
  onEdit: (g: BucketListGoal) => void;
  onComplete: (g: BucketListGoal) => void;
  onDelete: (id: string) => void;
  onWhoElse: (g: BucketListGoal) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const meta = categoryMeta(goal.category);
  const photoUrl = getGoalPhotoUrl(goal.completion_photo_url);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
        goal.is_completed
          ? 'border-green-200'
          : 'border-orange-100'
      }`}
    >
      {/* Photo strip if completed */}
      {photoUrl && (
        <img
          src={photoUrl}
          alt="Completion"
          className="w-full h-32 object-cover"
        />
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Category badge */}
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-xl flex-shrink-0">
            {meta.emoji}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide">
                {meta.label}
              </span>
              {goal.is_public ? (
                <Globe className="w-3 h-3 text-gray-400" />
              ) : (
                <Lock className="w-3 h-3 text-gray-400" />
              )}
            </div>
            <p
              className={`font-semibold text-gray-900 leading-snug ${
                goal.is_completed ? 'line-through text-gray-500' : ''
              }`}
            >
              {goal.title}
            </p>

            {goal.is_completed && goal.completed_at && (
              <p className="text-xs text-green-600 font-medium mt-0.5">
                Completed{' '}
                {new Date(goal.completed_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}

            {goal.description && !goal.is_completed && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {goal.description}
              </p>
            )}
          </div>

          {/* Status chip */}
          {goal.is_completed ? (
            <span className="flex-shrink-0 flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-semibold px-2 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              Done
            </span>
          ) : (
            <button
              onClick={() => setShowActions(!showActions)}
              className="flex-shrink-0 w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-orange-100 hover:text-orange-600 transition-colors"
            >
              <span className="text-lg leading-none">⋯</span>
            </button>
          )}
        </div>

        {/* Who else */}
        <button
          onClick={() => onWhoElse(goal)}
          className="mt-3 text-xs text-orange-500 font-medium hover:text-orange-700 transition-colors flex items-center gap-1"
        >
          <Users className="w-3 h-3" />
          See who else wants this
        </button>
      </div>

      {/* Action row */}
      <AnimatePresence>
        {showActions && !goal.is_completed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-orange-100 overflow-hidden"
          >
            <div className="flex divide-x divide-orange-100">
              <button
                onClick={() => { setShowActions(false); onEdit(goal); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm text-gray-600 hover:bg-orange-50 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => { setShowActions(false); onComplete(goal); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm text-green-600 hover:bg-green-50 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Complete
              </button>
              <button
                onClick={() => { setShowActions(false); onDelete(goal.id); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BucketListPage() {
  const { user, profile } = useAuth();
  const [goals, setGoals] = useState<BucketListGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | GoalCategory>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editGoal, setEditGoal] = useState<BucketListGoal | null>(null);
  const [completeGoal, setCompleteGoal] = useState<BucketListGoal | null>(null);
  const [whoElseGoal, setWhoElseGoal] = useState<BucketListGoal | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const isFree = profile?.subscription_tier === 'free';
  const goalLimit = TIER_LIMITS.free.active_goals;

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bucket_list_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setGoals((data as BucketListGoal[]) ?? []);
    } catch (err) {
      console.error('Error fetching goals:', err);
      toast.error('Could not load goals');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const filtered = goals.filter(
    (g) => activeFilter === 'all' || g.category === activeFilter
  );

  const completed = goals.filter((g) => g.is_completed).length;
  const total = goals.length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // ── Add goal ─────────────────────────────────────────────────────────────────

  const handleAddGoal = async (data: {
    title: string;
    category: GoalCategory;
    description: string;
    is_public: boolean;
  }) => {
    if (!user) return;

    if (isFree && goals.length >= goalLimit) {
      setShowUpgrade(true);
      return;
    }

    try {
      const { error } = await supabase.from('bucket_list_goals').insert({
        user_id: user.id,
        title: data.title,
        category: data.category,
        description: data.description,
        is_public: data.is_public,
        is_completed: false,
        order_index: goals.length,
      });
      if (error) throw error;
      toast.success('Goal added!');
      setShowAddModal(false);
      await fetchGoals();
    } catch (err) {
      console.error('Error adding goal:', err);
      toast.error('Could not add goal');
    }
  };

  // ── Edit goal ────────────────────────────────────────────────────────────────

  const handleEditGoal = async (data: {
    title: string;
    category: GoalCategory;
    description: string;
    is_public: boolean;
  }) => {
    if (!editGoal) return;
    try {
      const { error } = await supabase
        .from('bucket_list_goals')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editGoal.id);
      if (error) throw error;
      toast.success('Goal updated!');
      setEditGoal(null);
      await fetchGoals();
    } catch (err) {
      console.error('Error updating goal:', err);
      toast.error('Could not update goal');
    }
  };

  // ── Complete goal ────────────────────────────────────────────────────────────

  const handleCompleteGoal = async (
    date: string,
    note: string,
    photoFile: File | null
  ) => {
    if (!completeGoal || !user) return;

    let photoUrl: string | undefined;

    if (photoFile) {
      const path = await uploadGoalPhoto(user.id, completeGoal.id, photoFile);
      if (path) {
        photoUrl = path;
      }
    }

    try {
      const { error } = await supabase
        .from('bucket_list_goals')
        .update({
          is_completed: true,
          completed_at: new Date(date).toISOString(),
          completion_note: note || null,
          completion_photo_url: photoUrl ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', completeGoal.id);

      if (error) throw error;

      // Insert feed activity
      await supabase.from('feed_activities').insert({
        user_id: user.id,
        type: 'goal_completed',
        goal_id: completeGoal.id,
        is_public: completeGoal.is_public,
      });

      setCompleteGoal(null);
      setShowConfetti(true);
      await fetchGoals();
    } catch (err) {
      console.error('Error completing goal:', err);
      toast.error('Could not mark goal as complete');
    }
  };

  // ── Delete goal ──────────────────────────────────────────────────────────────

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Delete this goal? This cannot be undone.')) return;
    try {
      const { error } = await supabase
        .from('bucket_list_goals')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Goal deleted');
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.error('Error deleting goal:', err);
      toast.error('Could not delete goal');
    }
  };

  // ── FAB click ────────────────────────────────────────────────────────────────

  const handleFAB = () => {
    if (isFree && goals.length >= goalLimit) {
      setShowUpgrade(true);
      return;
    }
    setShowAddModal(true);
  };

  return (
    <div className="min-h-screen bg-orange-50 pb-24">
      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <ConfettiBurst onDone={() => setShowConfetti(false)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white px-4 pt-6 pb-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bucket List</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {completed} of {total} goals completed {total > 0 && '🔥'}
            </p>
          </div>
          {isFree && (
            <div className="flex items-center gap-1.5 bg-orange-100 text-orange-700 px-2.5 py-1.5 rounded-xl">
              <Crown className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">
                {goals.length}/{goalLimit}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mb-4">
            <div className="w-full h-2.5 bg-orange-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Stats row */}
        {total > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Total', value: total, color: 'text-gray-700' },
              {
                label: 'Completed',
                value: completed,
                color: 'text-green-600',
              },
              {
                label: 'Remaining',
                value: total - completed,
                color: 'text-orange-600',
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-orange-50 rounded-xl p-2.5 text-center"
              >
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeFilter === tab.value
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-300'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Goals list */}
      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-white rounded-2xl animate-pulse border border-orange-100"
            />
          ))
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="text-5xl mb-4">🌟</div>
            <p className="font-semibold text-gray-800 mb-1">
              {activeFilter === 'all'
                ? "Your bucket list is empty"
                : `No ${activeFilter} goals yet`}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {activeFilter === 'all'
                ? 'Add your first dream and start your journey!'
                : `Add a ${activeFilter} goal to get started.`}
            </p>
            <button
              onClick={handleFAB}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-2xl shadow-md shadow-orange-200"
            >
              <Plus className="w-4 h-4" />
              Add Goal
            </button>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filtered.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={setEditGoal}
                onComplete={setCompleteGoal}
                onDelete={handleDeleteGoal}
                onWhoElse={setWhoElseGoal}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleFAB}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-xl shadow-orange-300 z-40"
        aria-label="Add goal"
      >
        <Plus className="w-7 h-7 text-white" />
      </motion.button>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <GoalModal onClose={() => setShowAddModal(false)} onSave={handleAddGoal} />
        )}
        {editGoal && (
          <GoalModal
            initial={editGoal}
            onClose={() => setEditGoal(null)}
            onSave={handleEditGoal}
          />
        )}
        {completeGoal && (
          <CompleteGoalModal
            goal={completeGoal}
            onClose={() => setCompleteGoal(null)}
            onConfirm={handleCompleteGoal}
          />
        )}
        {whoElseGoal && (
          <WhoElseModal
            goal={whoElseGoal}
            count={Math.floor(Math.random() * 40) + 3}
            onClose={() => setWhoElseGoal(null)}
          />
        )}
        {showUpgrade && (
          <UpgradePrompt onClose={() => setShowUpgrade(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
