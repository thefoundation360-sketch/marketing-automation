import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Tab = 'login' | 'signup';

interface LoginFormData {
  email: string;
  password: string;
}

interface SignupFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface ResetFormData {
  resetEmail: string;
}

const formVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.2 } },
};

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle, signInAsGuest, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Login form
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    reset: resetLoginForm,
  } = useForm<LoginFormData>();

  // Signup form
  const {
    register: signupRegister,
    handleSubmit: handleSignupSubmit,
    formState: { errors: signupErrors },
    watch: signupWatch,
    reset: resetSignupForm,
  } = useForm<SignupFormData>();

  // Reset password form
  const {
    register: resetRegister,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
    reset: resetResetForm,
  } = useForm<ResetFormData>();

  const signupPassword = signupWatch('password');

  const switchTab = (newTab: Tab) => {
    setTab(newTab);
    setShowForgotPassword(false);
    resetLoginForm();
    resetSignupForm();
  };

  const onLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    const { error } = await signIn(data.email, data.password);
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message || 'Invalid email or password.');
      return;
    }

    toast.success('Welcome back!');
    navigate('/discover');
  };

  const onSignup = async (data: SignupFormData) => {
    setIsSubmitting(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message || 'Something went wrong. Please try again.');
      return;
    }

    toast.success('Account created! Welcome to DreamLink 🌟');
    navigate('/onboarding');
  };

  const onResetPassword = async (data: ResetFormData) => {
    setIsSubmitting(true);
    const { error } = await resetPassword(data.resetEmail);
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message || 'Could not send reset email.');
      return;
    }

    toast.success('Reset link sent! Check your email.');
    resetResetForm();
    setShowForgotPassword(false);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setIsGoogleLoading(false);

    if (error) {
      toast.error(error.message || 'Google sign-in failed.');
    }
    // On success, redirect happens via OAuth flow
  };

  const handleGuestSignIn = async () => {
    await signInAsGuest();
    toast('Browsing as guest. Sign up to save your progress!', { icon: '👋' });
    navigate('/discover');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-300 flex items-center justify-center px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-20 -left-16 w-80 h-80 bg-white/10 rounded-full"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg">
              <span className="text-2xl">🌟</span>
            </div>
            <span className="font-extrabold text-2xl text-white drop-shadow-sm">DreamLink</span>
          </Link>
          <p className="text-white/80 text-sm mt-2">Chase your dreams with your people</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {(['login', 'signup'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 py-4 text-sm font-bold capitalize transition-colors ${
                  tab === t
                    ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-50/50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {/* LOGIN */}
              {tab === 'login' && !showForgotPassword && (
                <motion.div
                  key="login"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-5">
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          placeholder="you@example.com"
                          {...loginRegister('email', {
                            required: 'Email is required',
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: 'Enter a valid email address',
                            },
                          })}
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                            loginErrors.email
                              ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                              : 'border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
                          }`}
                        />
                      </div>
                      {loginErrors.email && (
                        <p className="text-red-500 text-xs mt-1.5">{loginErrors.email.message}</p>
                      )}
                    </div>

                    {/* Password */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-sm font-semibold text-gray-700">Password</label>
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Your password"
                          {...loginRegister('password', {
                            required: 'Password is required',
                            minLength: { value: 6, message: 'At least 6 characters' },
                          })}
                          className={`w-full pl-10 pr-10 py-3 rounded-xl border text-sm outline-none transition-all ${
                            loginErrors.password
                              ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                              : 'border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {loginErrors.password && (
                        <p className="text-red-500 text-xs mt-1.5">{loginErrors.password.message}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Log In
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* FORGOT PASSWORD */}
              {tab === 'login' && showForgotPassword && (
                <motion.div
                  key="forgot"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-5 -ml-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back to login
                  </button>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Reset your password</h3>
                  <p className="text-gray-500 text-sm mb-5">Enter your email and we'll send you a reset link.</p>

                  <form onSubmit={handleResetSubmit(onResetPassword)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          placeholder="you@example.com"
                          {...resetRegister('resetEmail', {
                            required: 'Email is required',
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: 'Enter a valid email address',
                            },
                          })}
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                            resetErrors.resetEmail
                              ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                              : 'border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
                          }`}
                        />
                      </div>
                      {resetErrors.resetEmail && (
                        <p className="text-red-500 text-xs mt-1.5">{resetErrors.resetEmail.message}</p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* SIGNUP */}
              {tab === 'signup' && (
                <motion.div
                  key="signup"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <form onSubmit={handleSignupSubmit(onSignup)} className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Your full name"
                          {...signupRegister('fullName', {
                            required: 'Name is required',
                            minLength: { value: 2, message: 'Name must be at least 2 characters' },
                          })}
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                            signupErrors.fullName
                              ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                              : 'border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
                          }`}
                        />
                      </div>
                      {signupErrors.fullName && (
                        <p className="text-red-500 text-xs mt-1.5">{signupErrors.fullName.message}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          placeholder="you@example.com"
                          {...signupRegister('email', {
                            required: 'Email is required',
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: 'Enter a valid email address',
                            },
                          })}
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                            signupErrors.email
                              ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                              : 'border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
                          }`}
                        />
                      </div>
                      {signupErrors.email && (
                        <p className="text-red-500 text-xs mt-1.5">{signupErrors.email.message}</p>
                      )}
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a password"
                          {...signupRegister('password', {
                            required: 'Password is required',
                            minLength: { value: 8, message: 'At least 8 characters' },
                          })}
                          className={`w-full pl-10 pr-10 py-3 rounded-xl border text-sm outline-none transition-all ${
                            signupErrors.password
                              ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                              : 'border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {signupErrors.password && (
                        <p className="text-red-500 text-xs mt-1.5">{signupErrors.password.message}</p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Repeat your password"
                          {...signupRegister('confirmPassword', {
                            required: 'Please confirm your password',
                            validate: (val) => val === signupPassword || 'Passwords do not match',
                          })}
                          className={`w-full pl-10 pr-10 py-3 rounded-xl border text-sm outline-none transition-all ${
                            signupErrors.confirmPassword
                              ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                              : 'border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {signupErrors.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1.5">{signupErrors.confirmPassword.message}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Create Account
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <p className="text-center text-xs text-gray-400 leading-relaxed">
                      By signing up you agree to our{' '}
                      <Link to="/terms" className="text-orange-500 hover:underline">Terms</Link>
                      {' '}and{' '}
                      <Link to="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link>.
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Divider */}
            {!showForgotPassword && (
              <div className="mt-5 mb-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or continue with</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )}

            {/* Google + Guest */}
            {!showForgotPassword && (
              <div className="space-y-3">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 hover:border-orange-200 hover:bg-orange-50 py-3 rounded-xl transition-all text-sm font-semibold text-gray-700 disabled:opacity-50"
                >
                  {isGoogleLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
                  ) : (
                    <span className="text-lg">🔵</span>
                  )}
                  Continue with Google
                </button>

                <button
                  onClick={handleGuestSignIn}
                  className="w-full text-center text-sm text-gray-500 hover:text-orange-500 transition-colors py-2 font-medium"
                >
                  Continue as Guest →
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-white/70 text-xs mt-6">
          © {new Date().getFullYear()} DreamLink · All rights reserved
        </p>
      </motion.div>
    </div>
  );
}
