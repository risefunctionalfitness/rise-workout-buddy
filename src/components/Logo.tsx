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
  
  // Dark mode: Symbol only, Light mode: Full logo with text
  const logoSrc = theme === "dark" 
    ? "/lovable-uploads/7baa88b3-5814-40a7-b522-33813a2ec885.png" // RISE Symbol
    : "/lovable-uploads/c2f4fb4b-2b2b-4d58-85e9-6c31b062eda8.png" // RISE Full Logo
  
  return (
    <img 
      src={logoSrc}
      alt={alt}
      className={`${className} cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={onClick}
    />
  )
}