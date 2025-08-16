import React from 'react';

// Badge image mapping - alle 12 verfügbaren Badges
const BADGE_IMAGE_MAP: Record<string, string> = {
  'target': '/lovable-uploads/0b5d2f27-b47b-4048-bf89-c694f5f02606.png',
  'dumbbell': '/lovable-uploads/198f00f6-b784-40cf-8fd4-5b44ad87605a.png', 
  'flame': '/lovable-uploads/3518fba7-0704-4745-97bf-c14a51a4732c.png',
  'clock': '/lovable-uploads/3556a9d3-2592-4e32-b44a-4118140c23b8.png',
  'sun': '/lovable-uploads/42ff74f1-fbb3-426c-b567-4d43950e5543.png',
  'star': '/lovable-uploads/7baa88b3-5814-40a7-b522-33813a2ec885.png',
  'trophy': '/lovable-uploads/8a13e880-4305-4f6d-bb4a-1f2b4650dd36.png',
  'zap': '/lovable-uploads/92ae5157-61ac-4a34-850f-7a1e0ebbabf7.png',
  'calendar': '/lovable-uploads/97c3e6bf-0940-4442-b89a-2155e4f0d895.png',
  'heart': '/lovable-uploads/b1f1270b-1ced-4aa4-93cb-d52260dee947.png',
  'power': '/lovable-uploads/ddcfe9c9-3661-454e-a806-9641c47013f2.png',
  'consistency': '/lovable-uploads/92e67bd6-7844-4e51-af09-f7c174b43333.png'
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