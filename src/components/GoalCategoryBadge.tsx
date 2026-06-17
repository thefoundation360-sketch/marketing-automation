import { clsx } from 'clsx';
import { GoalCategory, GOAL_CATEGORIES } from '../types';

interface GoalCategoryBadgeProps {
  category: GoalCategory;
  /** Controls the visual weight of the badge */
  size?: 'xs' | 'sm' | 'md';
  /** Show only the emoji without the label text */
  emojiOnly?: boolean;
  /** Additional className for the pill element */
  className?: string;
}

const sizeClasses = {
  xs: 'px-1.5 py-0.5 text-[10px] gap-1 rounded-md',
  sm: 'px-2 py-1 text-xs gap-1 rounded-lg',
  md: 'px-3 py-1.5 text-sm gap-1.5 rounded-xl',
};

const emojiSizes = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-sm',
};

export default function GoalCategoryBadge({
  category,
  size = 'sm',
  emojiOnly = false,
  className,
}: GoalCategoryBadgeProps) {
  const categoryConfig = GOAL_CATEGORIES.find((c) => c.value === category);

  if (!categoryConfig) return null;

  const { emoji, label, color } = categoryConfig;

  return (
    <span
      className={clsx(
        'inline-flex items-center font-semibold whitespace-nowrap select-none',
        sizeClasses[size],
        color,
        className
      )}
      title={emojiOnly ? label : undefined}
      aria-label={label}
    >
      <span className={emojiSizes[size]}>{emoji}</span>
      {!emojiOnly && <span>{label}</span>}
    </span>
  );
}
