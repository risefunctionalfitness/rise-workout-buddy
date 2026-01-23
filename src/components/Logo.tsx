import { useTheme } from "next-themes"

interface LogoProps {
  className?: string
  onClick?: () => void
  alt?: string
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "h-10", 
  onClick, 
  alt = "RISE Functional Fitness Logo" 
}) => {
  const { theme } = useTheme()
  
  // Dark mode: White text logo, Light mode: Dark text logo
  const logoSrc = theme === "dark" 
    ? "/logos/rise_dark.png"   // White text for dark backgrounds
    : "/logos/rise_white.png"  // Dark text for light backgrounds
  
  return (
    <img 
      src={logoSrc}
      alt={alt}
      className={`${className} cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={onClick}
    />
  )
}