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
  
  // Dark mode: RISE Black, Light mode: RISE White
  const logoSrc = theme === "dark" 
    ? "/lovable-uploads/0b845073-7185-470c-9f04-c35431589618.png" // RISE Black
    : "/lovable-uploads/728316cf-cfdf-4d56-9d3c-044e4ec6b20c.png" // RISE White
  
  return (
    <img 
      src={logoSrc}
      alt={alt}
      className={`${className} cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={onClick}
    />
  )
}