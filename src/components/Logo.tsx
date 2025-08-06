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
  
  // Use the newly uploaded RISE logo
  const logoSrc = "/lovable-uploads/c2f4fb4b-2b2b-4d58-85e9-6c31b062eda8.png" // RISE Functional Fitness Logo
  
  return (
    <img 
      src={logoSrc}
      alt={alt}
      className={`${className} cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={onClick}
    />
  )
}