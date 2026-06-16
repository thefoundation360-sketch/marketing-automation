import { forwardRef, useState, useId } from 'react';
import { clsx } from 'clsx';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  success?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      success,
      leftIcon,
      rightElement,
      fullWidth = true,
      className,
      type,
      id: externalId,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === 'password';
    const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

    const hasError = Boolean(error);
    const hasSuccess = Boolean(success) && !hasError;

    return (
      <div className={clsx('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={id}
            className={clsx(
              'text-sm font-medium leading-none',
              disabled ? 'text-gray-400' : 'text-gray-700'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {/* Left Icon */}
          {leftIcon && (
            <span
              className={clsx(
                'absolute left-3 flex items-center justify-center w-4 h-4 pointer-events-none',
                disabled ? 'text-gray-300' : hasError ? 'text-red-400' : 'text-gray-400'
              )}
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            type={resolvedType}
            disabled={disabled}
            className={clsx(
              'flex-1 bg-white text-gray-900 text-sm placeholder:text-gray-400',
              'rounded-xl border px-3.5 py-3 leading-none',
              'transition-all duration-150 outline-none',
              'focus:ring-2 focus:ring-offset-0',
              'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
              leftIcon ? 'pl-9' : '',
              isPassword || rightElement || hasError || hasSuccess ? 'pr-10' : '',
              hasError
                ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                : hasSuccess
                ? 'border-green-300 focus:border-green-400 focus:ring-green-200'
                : 'border-gray-200 focus:border-orange-400 focus:ring-orange-100',
              className
            )}
            aria-describedby={
              error
                ? `${id}-error`
                : hint
                ? `${id}-hint`
                : success
                ? `${id}-success`
                : undefined
            }
            aria-invalid={hasError || undefined}
            {...props}
          />

          {/* Right side: password toggle > status icon > custom right element */}
          <div className="absolute right-3 flex items-center gap-1">
            {isPassword && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}

            {!isPassword && hasError && (
              <AlertCircle className="w-4 h-4 text-red-400 pointer-events-none" />
            )}

            {!isPassword && hasSuccess && (
              <CheckCircle2 className="w-4 h-4 text-green-500 pointer-events-none" />
            )}

            {!isPassword && !hasError && !hasSuccess && rightElement && (
              <span className="text-gray-400">{rightElement}</span>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-xs text-red-500 flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3 shrink-0" />
            {error}
          </p>
        )}

        {/* Success message */}
        {success && !error && (
          <p id={`${id}-success`} className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            {success}
          </p>
        )}

        {/* Hint */}
        {hint && !error && !success && (
          <p id={`${id}-hint`} className="text-xs text-gray-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
