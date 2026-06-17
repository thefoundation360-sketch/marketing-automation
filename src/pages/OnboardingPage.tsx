import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { X, Plus, Camera, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, uploadAvatar, getAvatarUrl } from '../lib/supabase';
import type { GoalCategory } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const INTERESTS = [
  'Adventure Sports', 'Travel', 'Photography', 'Music', 'Cooking',
  'Art', 'Yoga', 'Hiking', 'Reading', 'Dancing',
  'Scuba Diving', 'Rock Climbing', 'Surfing', 'Film Making', 'Writing',
  'Volunteering', 'Cycling', 'Astronomy', 'Languages', 'Meditation',
];

const POPULAR_GOALS: { title: string; category: GoalCategory; emoji: string }[] = [
  { title: 'See the Northern Lights', category: 'travel', emoji: '🌌' },
  { title: 'Hike the Appalachian Trail', category: 'adventure', emoji: '🥾' },
  { title: 'Learn to surf', category: 'adventure', emoji: '🏄' },
  { title: 'Eat at a Michelin star restaurant', category: 'food', emoji: '⭐' },
  { title: 'Publish a book', category: 'creative', emoji: '📚' },
  { title: 'Run a marathon', category: 'wellness', emoji: '🏃' },
  { title: 'Volunteer abroad', category: 'philanthropy', emoji: '🌍' },
  { title: 'Start my own business', category: 'career', emoji: '💼' },
  { title: 'Skydive', category: 'adventure', emoji: '🪂' },
  { title: 'Learn a new language', category: 'creative', emoji: '🗣️' },
  { title: 'Travel to Japan', category: 'travel', emoji: '🗾' },
  { title: 'Learn to cook traditional cuisine', category: 'food', emoji: '🍜' },
];

const STEPS = ['Interests', 'Bucket List', 'About You', 'Preferences'];

const CATEGORY_OPTIONS: { value: GoalCategory; emoji: string; label: string }[] = [
  { value: 'travel', emoji: '✈️', label: 'Travel' },
  { value: 'adventure', emoji: '🏔️', label: 'Adventure' },
  { value: 'food', emoji: '🍜', label: 'Food' },
  { value: 'creative', emoji: '🎨', label: 'Creative' },
  { value: 'wellness', emoji: '🧘', label: 'Wellness' },
  { value: 'philanthropy', emoji: '❤️', label: 'Give Back' },
  { value: 'career', emoji: '💼', label: 'Career' },
  { value: 'relationships', emoji: '👥', label: 'People' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoalItem {
  title: string;
  category: GoalCategory;
}

interface OnboardingData {
  selectedInterests: string[];
  goals: GoalItem[];
  fullName: string;
  age: string;
  location: string;
  bio: string;
  username: string;
  avatarFile: File | null;
  avatarPreview: string | null;
  preference: 'solo' | 'squad' | 'both' | null;
}

// ─── Slide animation ──────────────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: 'easeOut' as const },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    transition: { duration: 0.25, ease: 'easeIn' as const },
  }),
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    selectedInterests: [],
    goals: [],
    fullName: profile?.full_name || '',
    age: profile?.age ? String(profile.age) : '',
    location: profile?.location || '',
    bio: profile?.bio || '',
    username: profile?.username || '',
    avatarFile: null,
    avatarPreview: profile?.avatar_url ? getAvatarUrl(profile.avatar_url) : null,
    preference: profile?.solo_squad_preference || null,
  });

  const [goalInput, setGoalInput] = useState('');
  const [goalCategory, setGoalCategory] = useState<GoalCategory>('adventure');
  const [usernameError, setUsernameError] = useState('');

  // ─── Navigation ─────────────────────────────────────────────────────────────

  const goNext = () => {
    if (!canProceed()) return;
    setDirection(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const canProceed = (): boolean => {
    if (step === 0) return data.selectedInterests.length >= 3;
    if (step === 1) return data.goals.length >= 1;
    if (step === 2) {
      return (
        data.fullName.trim().length >= 2 &&
        data.username.trim().length >= 3 &&
        !usernameError
      );
    }
    if (step === 3) return data.preference !== null;
    return true;
  };

  // ─── Step 1 helpers ─────────────────────────────────────────────────────────

  const toggleInterest = (interest: string) => {
    setData((prev) => ({
      ...prev,
      selectedInterests: prev.selectedInterests.includes(interest)
        ? prev.selectedInterests.filter((i) => i !== interest)
        : [...prev.selectedInterests, interest],
    }));
  };

  // ─── Step 2 helpers ─────────────────────────────────────────────────────────

  const addGoal = (title: string, category: GoalCategory = goalCategory) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (data.goals.some((g) => g.title.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('You already added that goal!');
      return;
    }
    setData((prev) => ({ ...prev, goals: [...prev.goals, { title: trimmed, category }] }));
    setGoalInput('');
  };

  const removeGoal = (index: number) => {
    setData((prev) => ({ ...prev, goals: prev.goals.filter((_, i) => i !== index) }));
  };

  // ─── Step 3 helpers ─────────────────────────────────────────────────────────

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5MB');
      return;
    }
    const preview = URL.createObjectURL(file);
    setData((prev) => ({ ...prev, avatarFile: file, avatarPreview: preview }));
  };

  const checkUsername = async (username: string) => {
    if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      setUsernameError('Only lowercase letters, numbers, and underscores');
      return;
    }
    if (profile?.username && profile.username === username) {
      setUsernameError('');
      return;
    }
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();
    setUsernameError(existing ? 'Username is already taken' : '');
  };

  // ─── Save & Complete ─────────────────────────────────────────────────────────

  const handleComplete = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      let avatarPath: string | null = profile?.avatar_url || null;
      if (data.avatarFile) {
        const uploaded = await uploadAvatar(user.id, data.avatarFile);
        if (uploaded) avatarPath = uploaded;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName.trim(),
          username: data.username.trim(),
          age: data.age ? parseInt(data.age) : null,
          location: data.location.trim() || null,
          bio: data.bio.trim() || null,
          avatar_url: avatarPath,
          solo_squad_preference: data.preference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      await supabase.from('user_interests').delete().eq('user_id', user.id);
      if (data.selectedInterests.length > 0) {
        const interestRows = data.selectedInterests.map((interest) => ({
          user_id: user.id,
          interest,
        }));
        const { error: interestError } = await supabase.from('user_interests').insert(interestRows);
        if (interestError) throw interestError;
      }

      if (data.goals.length > 0) {
        const goalRows = data.goals.map((goal, index) => ({
          user_id: user.id,
          title: goal.title,
          category: goal.category,
          is_completed: false,
          is_public: true,
          order_index: index,
        }));
        const { error: goalsError } = await supabase.from('bucket_list_goals').insert(goalRows);
        if (goalsError) throw goalsError;
      }

      await refreshProfile();
      toast.success('Profile set up! Welcome to DreamLink 🌟');
      navigate('/discover');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex flex-col">
      {/* Header with progress */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-orange-100 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                <span className="text-sm">🌟</span>
              </div>
              <span className="font-bold text-gray-900">DreamLink</span>
            </div>
            <span className="text-xs font-medium text-orange-500">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>

          <div className="flex gap-1.5">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i <= step ? 'bg-orange-500' : 'bg-orange-100'
                  }`}
                />
              </div>
            ))}
          </div>

          <div className="flex mt-1.5">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1 text-center">
                <span
                  className={`text-xs font-medium ${
                    i === step ? 'text-orange-500' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-lg mx-auto w-full">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="px-4 py-6"
            >
              {step === 0 && (
                <StepInterests data={data} onToggle={toggleInterest} />
              )}
              {step === 1 && (
                <StepGoals
                  data={data}
                  goalInput={goalInput}
                  goalCategory={goalCategory}
                  onInputChange={setGoalInput}
                  onCategoryChange={setGoalCategory}
                  onAddGoal={addGoal}
                  onRemoveGoal={removeGoal}
                />
              )}
              {step === 2 && (
                <StepAboutYou
                  data={data}
                  usernameError={usernameError}
                  onDataChange={(updates) => setData((prev) => ({ ...prev, ...updates }))}
                  onCheckUsername={checkUsername}
                  onAvatarClick={() => fileInputRef.current?.click()}
                  fileInputRef={fileInputRef}
                  onAvatarChange={handleAvatarChange}
                />
              )}
              {step === 3 && (
                <StepPreferences
                  data={data}
                  onSelect={(pref) => setData((prev) => ({ ...prev, preference: pref }))}
                  onAvatarClick={() => fileInputRef.current?.click()}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 0 && (
            <button
              onClick={goBack}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-3.5 rounded-2xl border-2 border-orange-200 text-orange-500 font-semibold text-sm hover:bg-orange-50 transition-all disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          <button
            onClick={isLast ? handleComplete : goNext}
            disabled={!canProceed() || isSaving}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-200 disabled:text-orange-300 text-white font-bold py-3.5 rounded-2xl transition-all duration-200 text-sm shadow-md hover:shadow-lg"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isLast ? 'Complete Setup' : 'Continue'}
                {!isLast && <ChevronRight className="w-4 h-4" />}
                {isLast && <Check className="w-4 h-4" />}
              </>
            )}
          </button>
        </div>

        {step === 0 && (
          <p className="text-center text-xs text-gray-400 mt-2">
            Select at least 3 interests to continue
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Interests ────────────────────────────────────────────────────────

function StepInterests({
  data,
  onToggle,
}: {
  data: OnboardingData;
  onToggle: (interest: string) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-1">What are you into?</h2>
      <p className="text-gray-500 text-sm mb-6">
        Select at least 3 interests. We'll use these to find your best matches.
      </p>

      <div className="flex flex-wrap gap-2.5">
        {INTERESTS.map((interest) => {
          const selected = data.selectedInterests.includes(interest);
          return (
            <motion.button
              key={interest}
              onClick={() => onToggle(interest)}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2.5 rounded-full text-sm font-semibold border-2 transition-all duration-150 ${
                selected
                  ? 'bg-orange-500 border-orange-500 text-white shadow-md'
                  : 'bg-white border-orange-200 text-gray-700 hover:border-orange-400 hover:bg-orange-50'
              }`}
            >
              {selected && <Check className="inline w-3 h-3 mr-1 -mt-0.5" />}
              {interest}
            </motion.button>
          );
        })}
      </div>

      {data.selectedInterests.length > 0 && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 text-center text-orange-500 font-semibold text-sm"
        >
          {data.selectedInterests.length} selected
          {data.selectedInterests.length < 3 &&
            ` · ${3 - data.selectedInterests.length} more to go`}
        </motion.p>
      )}
    </div>
  );
}

// ─── Step 2: Bucket List Goals ────────────────────────────────────────────────

function StepGoals({
  data,
  goalInput,
  goalCategory,
  onInputChange,
  onCategoryChange,
  onAddGoal,
  onRemoveGoal,
}: {
  data: OnboardingData;
  goalInput: string;
  goalCategory: GoalCategory;
  onInputChange: (v: string) => void;
  onCategoryChange: (c: GoalCategory) => void;
  onAddGoal: (title: string, category?: GoalCategory) => void;
  onRemoveGoal: (i: number) => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAddGoal(goalInput);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Your bucket list</h2>
      <p className="text-gray-500 text-sm mb-5">
        Add goals you want to achieve. We'll match you with people who share them.
      </p>

      {/* Category selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onCategoryChange(cat.value)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              goalCategory === cat.value
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-white border-orange-200 text-gray-600 hover:border-orange-300'
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Text input */}
      <div className="flex gap-2 mb-5">
        <input
          type="text"
          value={goalInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Climb Mt. Fuji"
          className="flex-1 px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition-all"
        />
        <button
          onClick={() => onAddGoal(goalInput)}
          disabled={!goalInput.trim()}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-200 text-white rounded-xl px-4 transition-all"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Added goals */}
      {data.goals.length > 0 && (
        <div className="mb-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Your goals
          </div>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {data.goals.map((goal, i) => {
                const cat = CATEGORY_OPTIONS.find((c) => c.value === goal.category);
                return (
                  <motion.div
                    key={`${goal.title}-${i}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5 bg-orange-100 text-orange-800 px-3 py-2 rounded-full text-sm font-medium"
                  >
                    <span>{cat?.emoji}</span>
                    <span>{goal.title}</span>
                    <button
                      onClick={() => onRemoveGoal(i)}
                      className="ml-1 text-orange-400 hover:text-orange-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Popular suggestions */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Popular goals
        </div>
        <div className="grid grid-cols-1 gap-2">
          {POPULAR_GOALS.filter(
            (g) => !data.goals.some((dg) => dg.title === g.title)
          )
            .slice(0, 6)
            .map((goal) => (
              <button
                key={goal.title}
                onClick={() => onAddGoal(goal.title, goal.category)}
                className="flex items-center gap-3 bg-white border border-orange-100 hover:border-orange-300 hover:bg-orange-50 px-4 py-3 rounded-xl text-left transition-all group"
              >
                <span className="text-xl flex-shrink-0">{goal.emoji}</span>
                <span className="text-sm text-gray-700 font-medium flex-1">{goal.title}</span>
                <Plus className="w-4 h-4 text-orange-400 group-hover:text-orange-500 flex-shrink-0" />
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: About You ────────────────────────────────────────────────────────

function StepAboutYou({
  data,
  usernameError,
  onDataChange,
  onCheckUsername,
  onAvatarClick,
  fileInputRef,
  onAvatarChange,
}: {
  data: OnboardingData;
  usernameError: string;
  onDataChange: (updates: Partial<OnboardingData>) => void;
  onCheckUsername: (username: string) => void;
  onAvatarClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Tell us about you</h2>
      <p className="text-gray-500 text-sm mb-6">
        This info helps others decide if they want to adventure with you.
      </p>

      {/* Avatar upload */}
      <div className="flex justify-center mb-6">
        <button onClick={onAvatarClick} className="relative group">
          <div className="w-24 h-24 rounded-full bg-orange-100 border-4 border-orange-200 overflow-hidden flex items-center justify-center">
            {data.avatarPreview ? (
              <img
                src={data.avatarPreview}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl">😊</span>
            )}
          </div>
          <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-md border-2 border-white">
            <Camera className="w-4 h-4 text-white" />
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onAvatarChange}
        />
      </div>

      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Full Name <span className="text-orange-500">*</span>
          </label>
          <input
            type="text"
            value={data.fullName}
            onChange={(e) => onDataChange({ fullName: e.target.value })}
            placeholder="Your name"
            className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition-all"
          />
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Username <span className="text-orange-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
              @
            </span>
            <input
              type="text"
              value={data.username}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                onDataChange({ username: val });
                if (val.length >= 3) onCheckUsername(val);
              }}
              placeholder="your_username"
              className={`w-full pl-8 pr-4 py-3 rounded-xl border-2 outline-none text-sm transition-all ${
                usernameError
                  ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100'
                  : 'border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
              }`}
            />
          </div>
          {usernameError && (
            <p className="text-red-500 text-xs mt-1">{usernameError}</p>
          )}
          {!usernameError && data.username.length >= 3 && (
            <p className="text-green-500 text-xs mt-1 flex items-center gap-1">
              <Check className="w-3 h-3" />
              @{data.username} is available
            </p>
          )}
        </div>

        {/* Age + Location */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Age</label>
            <input
              type="number"
              min={18}
              max={120}
              value={data.age}
              onChange={(e) => onDataChange({ age: e.target.value })}
              placeholder="e.g. 28"
              className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location</label>
            <input
              type="text"
              value={data.location}
              onChange={(e) => onDataChange({ location: e.target.value })}
              placeholder="City, Country"
              className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition-all"
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-sm font-semibold text-gray-700">Bio</label>
            <span
              className={`text-xs font-medium ${
                data.bio.length > 140 ? 'text-red-400' : 'text-gray-400'
              }`}
            >
              {data.bio.length}/160
            </span>
          </div>
          <textarea
            value={data.bio}
            onChange={(e) => {
              if (e.target.value.length <= 160) onDataChange({ bio: e.target.value });
            }}
            placeholder="Tell dreamers a bit about yourself and what drives you..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Preferences ──────────────────────────────────────────────────────

function StepPreferences({
  data,
  onSelect,
  onAvatarClick,
}: {
  data: OnboardingData;
  onSelect: (pref: 'solo' | 'squad' | 'both') => void;
  onAvatarClick: () => void;
}) {
  const options: {
    value: 'solo' | 'squad' | 'both';
    emoji: string;
    title: string;
    desc: string;
  }[] = [
    {
      value: 'solo',
      emoji: '🧗',
      title: 'Solo Adventures',
      desc: "I'm looking for a one-on-one partner to chase dreams with.",
    },
    {
      value: 'squad',
      emoji: '👥',
      title: 'Squad Goals',
      desc: 'I want to build a crew and tackle bucket list items as a group.',
    },
    {
      value: 'both',
      emoji: '🌟',
      title: 'Both',
      desc: "I'm open to either — bring on all kinds of dreamers!",
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
        How do you want to connect?
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        This helps us surface the right kind of matches for you.
      </p>

      <div className="space-y-3 mb-8">
        {options.map((opt) => {
          const selected = data.preference === opt.value;
          return (
            <motion.button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                selected
                  ? 'border-orange-500 bg-orange-50 shadow-md'
                  : 'border-orange-100 bg-white hover:border-orange-300 hover:bg-orange-50/50'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                  selected ? 'bg-orange-500' : 'bg-orange-100'
                }`}
              >
                {opt.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`font-bold text-base ${
                    selected ? 'text-orange-700' : 'text-gray-900'
                  }`}
                >
                  {opt.title}
                </div>
                <div className="text-sm text-gray-500 mt-0.5">{opt.desc}</div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  selected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                }`}
              >
                {selected && <Check className="w-3 h-3 text-white" />}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Avatar reminder */}
      {!data.avatarPreview && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-5"
        >
          <span className="text-2xl flex-shrink-0">📸</span>
          <div className="flex-1">
            <div className="font-semibold text-amber-800 text-sm">Add a profile photo</div>
            <div className="text-amber-700 text-xs mt-0.5 mb-2">
              Profiles with photos get 3x more matches. Don't miss out!
            </div>
            <button
              onClick={onAvatarClick}
              className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Upload Photo →
            </button>
          </div>
        </motion.div>
      )}

      {data.avatarPreview && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4 mb-5">
          <img
            src={data.avatarPreview}
            alt="Your profile"
            className="w-12 h-12 rounded-full object-cover border-2 border-green-300"
          />
          <div>
            <div className="font-semibold text-green-800 text-sm flex items-center gap-1">
              <Check className="w-4 h-4" />
              Profile photo added!
            </div>
            <button
              onClick={onAvatarClick}
              className="text-xs text-green-600 hover:text-green-700 font-medium mt-0.5"
            >
              Change photo
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
        <div className="text-sm font-bold text-gray-800 mb-2">Your profile summary</div>
        <div className="text-xs text-gray-600 space-y-1">
          <div>✅ {data.selectedInterests.length} interests selected</div>
          <div>
            ✅ {data.goals.length} bucket list goal
            {data.goals.length !== 1 ? 's' : ''} added
          </div>
          {data.fullName && <div>✅ Name: {data.fullName}</div>}
          {data.username && <div>✅ @{data.username}</div>}
          {data.location && <div>✅ Based in {data.location}</div>}
        </div>
      </div>
    </div>
  );
}
