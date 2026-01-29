'use client';

import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number; // 0-5 scale, supports decimals
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function StarRating({
  rating,
  maxStars = 5,
  size = 'md',
  showValue = false,
  className = '',
}: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);

  const sizeClass = sizeClasses[size];

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star
          key={`full-${i}`}
          className={`${sizeClass} text-yellow-400 fill-yellow-400`}
        />
      ))}

      {/* Half star */}
      {hasHalfStar && (
        <div className="relative">
          <Star className={`${sizeClass} text-gray-300 dark:text-gray-600`} />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className={`${sizeClass} text-yellow-400 fill-yellow-400`} />
          </div>
        </div>
      )}

      {/* Empty stars */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star
          key={`empty-${i}`}
          className={`${sizeClass} text-gray-300 dark:text-gray-600`}
        />
      ))}

      {showValue && (
        <span className="ml-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// Simple version for displaying exact integer stars (no half stars)
export function SimpleStarRating({
  stars,
  maxStars = 5,
  size = 'md',
  className = '',
}: {
  stars: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClass = sizeClasses[size];

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: maxStars }).map((_, i) => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i < stars
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
    </div>
  );
}
