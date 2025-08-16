import React from 'react';

// Badge image mapping - verwende Supabase Storage URLs für alle 12 verfügbaren Badges
const BADGE_IMAGE_MAP: Record<string, string> = {
  'target': 'https://vdpeyaphtsbrhygupfbc.supabase.co/storage/v1/object/public/challenge-badges/target-badge.png',
  'dumbbell': 'https://vdpeyaphtsbrhygupfbc.supabase.co/storage/v1/object/public/challenge-badges/dumbbell-badge.png',
  'flame': 'https://vdpeyaphtsbrhygupfbc.supabase.co/storage/v1/object/public/challenge-badges/flame-badge.png',
  'clock': 'https://vdpeyaphtsbrhygupfbc.supabase.co/storage/v1/object/public/challenge-badges/clock-badge.png',
  'sun': 'https://vdpeyaphtsbrhygupfbc.supabase.co/storage/v1/object/public/challenge-badges/sun-badge.png',
  'star': 'https://vdpeyaphtsbrhygupfbc.supabase.co/storage/v1/object/public/challenge-badges/star-badge.png',
  'trophy': 'https://vdpeyaphtsbrhygupfbc.supabase.co/storage/v1/object/public/challenge-badges/trophy-badge.png',
  'zap': 'https://vdpeyaphtsbrhygupfbc.supabase.co/storage/v1/object/public/challenge-badges/zap-badge.png',
  'calendar': 'https://vdpeyaphtsbrhygupfbc.supabase.co/storage/v1/object/public/challenge-badges/calendar-badge.png',
  'heart': 'https://vdpeyaphtsbrhygupfbc.supabase.co/storage/v1/object/public/challenge-badges/heart-badge.png',
  'power': 'https://vdpeyaphtsbrhygupfbc.supabase.co/storage/v1/object/public/challenge-badges/power-badge.png',
  'consistency': 'https://vdpeyaphtsbrhygupfbc.supabase.co/storage/v1/object/public/challenge-badges/consistency-badge.png'
};

interface BadgeImageProps {
  icon: string;
  alt: string;
  className?: string;
}

export const BadgeImage: React.FC<BadgeImageProps> = ({ icon, alt, className = "w-8 h-8" }) => {
  const imageSrc = BADGE_IMAGE_MAP[icon];
  
  if (!imageSrc) {
    // Fallback to a default badge image or icon
    return (
      <div className={`${className} bg-primary/10 rounded-full flex items-center justify-center`}>
        <span className="text-xs text-primary">🏆</span>
      </div>
    );
  }

  return (
    <img 
      src={imageSrc} 
      alt={alt}
      className={`${className} object-contain`}
    />
  );
};

export const BADGE_ICONS_FOR_ADMIN = [
  { value: "target", label: "Target", image: BADGE_IMAGE_MAP.target },
  { value: "dumbbell", label: "Dumbbell", image: BADGE_IMAGE_MAP.dumbbell },
  { value: "flame", label: "Fire", image: BADGE_IMAGE_MAP.flame },
  { value: "clock", label: "Clock", image: BADGE_IMAGE_MAP.clock },
  { value: "sun", label: "Sun", image: BADGE_IMAGE_MAP.sun },
  { value: "star", label: "Star", image: BADGE_IMAGE_MAP.star },
  { value: "trophy", label: "Trophy", image: BADGE_IMAGE_MAP.trophy },
  { value: "zap", label: "Lightning", image: BADGE_IMAGE_MAP.zap },
  { value: "calendar", label: "Calendar", image: BADGE_IMAGE_MAP.calendar },
  { value: "heart", label: "Heart", image: BADGE_IMAGE_MAP.heart },
  { value: "power", label: "Power Start", image: BADGE_IMAGE_MAP.power },
  { value: "consistency", label: "Consistency King/Queen", image: BADGE_IMAGE_MAP.consistency }
];