import { type ClassValue, clsx } from 'clsx';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  if (isToday(date)) {
    return format(date, 'h:mm a');
  } else if (isYesterday(date)) {
    return `Yesterday ${format(date, 'h:mm a')}`;
  } else {
    return format(date, 'MMM d, h:mm a');
  }
}

export function formatDate(dateString: string): string {
  return format(new Date(dateString), 'MMMM d, yyyy');
}

export function formatShortDate(dateString: string): string {
  return format(new Date(dateString), 'MMM d');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

export function getMatchColor(percentage: number): string {
  if (percentage >= 70) return 'text-green-600 bg-green-50';
  if (percentage >= 40) return 'text-orange-600 bg-orange-50';
  return 'text-gray-600 bg-gray-50';
}

export function getMatchRingColor(percentage: number): string {
  if (percentage >= 70) return '#22c55e';
  if (percentage >= 40) return '#f97316';
  return '#9ca3af';
}

export function calculateMatchPercentage(
  userGoals: string[],
  otherGoals: string[],
  userInterests: string[],
  otherInterests: string[]
): { percentage: number; sharedGoals: string[]; sharedInterests: string[] } {
  const userGoalsLower = userGoals.map(g => g.toLowerCase());
  const otherGoalsLower = otherGoals.map(g => g.toLowerCase());
  const userInterestsLower = userInterests.map(i => i.toLowerCase());
  const otherInterestsLower = otherInterests.map(i => i.toLowerCase());

  const sharedGoals = userGoals.filter((_, i) =>
    otherGoalsLower.some(og => og.includes(userGoalsLower[i]) || userGoalsLower[i].includes(og))
  );

  const sharedInterests = userInterests.filter((_, i) =>
    otherInterestsLower.includes(userInterestsLower[i])
  );

  const goalScore = otherGoals.length > 0
    ? (sharedGoals.length / Math.max(userGoals.length, otherGoals.length)) * 60
    : 0;
  const interestScore = otherInterests.length > 0
    ? (sharedInterests.length / Math.max(userInterests.length, otherInterests.length)) * 40
    : 0;

  const percentage = Math.min(100, Math.round(goalScore + interestScore + 10));

  return { percentage, sharedGoals, sharedInterests };
}

export function copyToClipboard(text: string): boolean {
  try {
    navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  }
}

export function generateUsername(fullName: string): string {
  const base = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 15);
  const suffix = Math.floor(Math.random() * 9999);
  return `${base}${suffix}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function calculateMRR(subscriptions: Array<{ tier: string; status: string }>): number {
  const prices = { free: 0, premium: 9.99, elite: 24.99, business: 99 };
  return subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (prices[s.tier as keyof typeof prices] || 0), 0);
}
