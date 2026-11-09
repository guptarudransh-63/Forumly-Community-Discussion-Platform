import React from 'react';

export const Avatar = ({ src, name = '', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const initial = name ? name[0].toUpperCase() : '?';

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover border border-slate-200 dark:border-slate-700 ${sizeClasses[size] || sizeClasses.md} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold bg-brand-500 text-white ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      {initial}
    </div>
  );
};
