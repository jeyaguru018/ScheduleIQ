import React from 'react';
import { cn } from '../../lib/utils';

export function Avatar({ name, email, size = 'md', className, ...props }) {
  // Use DiceBear/ui-avatars based on the user's name
  // It handles initial extraction nicely
  const encodedName = encodeURIComponent(name || 'User');
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-24 h-24 text-2xl'
  };

  const imgSize = { sm: 32, md: 40, lg: 48, xl: 64, '2xl': 96 }[size];
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodedName}&background=random&color=fff&size=${imgSize}&bold=true`;

  return (
    <div 
      className={cn(
        "relative rounded-full overflow-hidden bg-surface-variant flex items-center justify-center border border-outline-variant shrink-0",
        sizeMap[size],
        className
      )}
      {...props}
    >
      <img 
        src={avatarUrl} 
        alt={name} 
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
