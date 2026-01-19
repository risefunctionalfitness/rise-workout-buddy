import React from "react"

// Flag components as inline SVGs for reliable cross-platform display
export const FlagDE = () => (
  <svg className="w-5 h-4 rounded-sm flex-shrink-0" viewBox="0 0 640 480">
    <path fill="#000" d="M0 0h640v160H0z"/>
    <path fill="#D00" d="M0 160h640v160H0z"/>
    <path fill="#FFCE00" d="M0 320h640v160H0z"/>
  </svg>
)

export const FlagAT = () => (
  <svg className="w-5 h-4 rounded-sm flex-shrink-0" viewBox="0 0 640 480">
    <path fill="#ED2939" d="M0 0h640v160H0z"/>
    <path fill="#fff" d="M0 160h640v160H0z"/>
    <path fill="#ED2939" d="M0 320h640v160H0z"/>
  </svg>
)

export const FlagCH = () => (
  <svg className="w-5 h-4 rounded-sm flex-shrink-0" viewBox="0 0 640 480">
    <path fill="#D52B1E" d="M0 0h640v480H0z"/>
    <path fill="#fff" d="M170 195h300v90H170z"/>
    <path fill="#fff" d="M275 90h90v300h-90z"/>
  </svg>
)

export const FlagNL = () => (
  <svg className="w-5 h-4 rounded-sm flex-shrink-0" viewBox="0 0 640 480">
    <path fill="#AE1C28" d="M0 0h640v160H0z"/>
    <path fill="#fff" d="M0 160h640v160H0z"/>
    <path fill="#21468B" d="M0 320h640v160H0z"/>
  </svg>
)

export const FlagBE = () => (
  <svg className="w-5 h-4 rounded-sm flex-shrink-0" viewBox="0 0 640 480">
    <path fill="#000" d="M0 0h213v480H0z"/>
    <path fill="#FCD116" d="M213 0h214v480H213z"/>
    <path fill="#ED2939" d="M427 0h213v480H427z"/>
  </svg>
)

export const FlagFR = () => (
  <svg className="w-5 h-4 rounded-sm flex-shrink-0" viewBox="0 0 640 480">
    <path fill="#002395" d="M0 0h213v480H0z"/>
    <path fill="#fff" d="M213 0h214v480H213z"/>
    <path fill="#ED2939" d="M427 0h213v480H427z"/>
  </svg>
)

export const FlagIT = () => (
  <svg className="w-5 h-4 rounded-sm flex-shrink-0" viewBox="0 0 640 480">
    <path fill="#009246" d="M0 0h213v480H0z"/>
    <path fill="#fff" d="M213 0h214v480H213z"/>
    <path fill="#CE2B37" d="M427 0h213v480H427z"/>
  </svg>
)

export const FlagGB = () => (
  <svg className="w-5 h-4 rounded-sm flex-shrink-0" viewBox="0 0 640 480">
    <path fill="#012169" d="M0 0h640v480H0z"/>
    <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z"/>
    <path fill="#C8102E" d="m424 281 216 159v40L369 281h55zm-184 20 6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 176h-60L0 42V0z"/>
    <path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z"/>
    <path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z"/>
  </svg>
)

export const FlagUS = () => (
  <svg className="w-5 h-4 rounded-sm flex-shrink-0" viewBox="0 0 640 480">
    <path fill="#BD3D44" d="M0 0h640v37H0zm0 74h640v37H0zm0 73h640v37H0zm0 74h640v37H0zm0 73h640v37H0zm0 74h640v37H0z"/>
    <path fill="#fff" d="M0 37h640v37H0zm0 73h640v37H0zm0 74h640v37H0zm0 73h640v37H0zm0 74h640v37H0z"/>
    <path fill="#192F5D" d="M0 0h260v259H0z"/>
  </svg>
)

export const countryCodeFlags: Record<string, React.FC> = {
  "+49": FlagDE,
  "+43": FlagAT,
  "+41": FlagCH,
  "+31": FlagNL,
  "+32": FlagBE,
  "+33": FlagFR,
  "+39": FlagIT,
  "+44": FlagGB,
  "+1": FlagUS,
}

export const countryCodes = [
  { code: "+49", country: "DE" },
  { code: "+43", country: "AT" },
  { code: "+41", country: "CH" },
  { code: "+31", country: "NL" },
  { code: "+32", country: "BE" },
  { code: "+33", country: "FR" },
  { code: "+39", country: "IT" },
  { code: "+44", country: "GB" },
  { code: "+1", country: "US" },
]

interface CountryFlagProps {
  code: string
}

export const CountryFlag: React.FC<CountryFlagProps> = ({ code }) => {
  const FlagComponent = countryCodeFlags[code]
  return FlagComponent ? <FlagComponent /> : null
}
