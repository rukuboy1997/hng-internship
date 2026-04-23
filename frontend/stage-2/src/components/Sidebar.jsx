import { useTheme } from '../context/ThemeContext'

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9.99963" cy="10.0003" r="5.15" stroke="#858BB2" strokeWidth="1.5"/>
      <path d="M9.99963 1.66699V2.91699" stroke="#858BB2" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9.99963 17.083V18.333" stroke="#858BB2" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M4.16699 5.00049L5.04199 5.87549" stroke="#858BB2" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14.958 15.7949L15.833 16.6699" stroke="#858BB2" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M1.66699 10L2.91699 10" stroke="#858BB2" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M17.083 10L18.333 10" stroke="#858BB2" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M4.16699 14.9995L5.04199 14.1245" stroke="#858BB2" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14.958 4.20508L15.833 3.33008" stroke="#858BB2" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M9.99995 1.25C9.13133 1.25 8.29064 1.40837 7.51389 1.69758C9.79228 2.78472 11.25 4.97822 11.25 7.5C11.25 11.0899 8.08985 14 4.16667 14C3.15326 14 2.19083 13.7891 1.33482 13.4124C2.57853 15.7218 5.1088 17.5 7.91667 17.5C12.0588 17.5 15.4167 14.1421 15.4167 10C15.4167 5.85786 12.0588 2.5 7.91667 2.5L9.99995 1.25Z" fill="#858BB2"/>
    </svg>
  )
}

export default function Sidebar() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <>
      {/* Desktop: left sidebar */}
      <nav
        className="hidden lg:flex fixed left-0 top-0 h-full w-[103px] bg-[#373B53] dark:bg-[#1E2139] flex-col items-center justify-between rounded-r-[20px] z-50 overflow-hidden"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="w-full">
          <div className="w-[103px] h-[103px] bg-[#7C5DFA] rounded-r-[20px] flex items-center justify-center relative">
            <div className="w-[103px] h-[52px] bg-[#9277FF] rounded-tl-[20px] absolute bottom-0 rounded-br-[20px]" />
            <svg className="relative z-10" width="40" height="38" viewBox="0 0 40 38" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Invoice App Logo">
              <path d="M10.6942 0.693604L0 37.2961H22.7749L33.4692 0.693604H10.6942Z" fill="white"/>
              <path opacity="0.5" d="M20.7249 0.693604L10.0307 37.2961H29.5736L40.2678 0.693604H20.7249Z" fill="white"/>
            </svg>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex flex-col items-center gap-6 pb-8">
          <button
            onClick={toggleTheme}
            className="text-[#858BB2] hover:text-white transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
          <div className="w-full h-px bg-[#494E6E]" />
          <div className="w-8 h-8 rounded-full bg-[#F9FAFE] overflow-hidden flex items-center justify-center" aria-label="User profile">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="16" cy="16" r="16" fill="#494E6E"/>
              <circle cx="16" cy="13" r="6" fill="#858BB2"/>
              <ellipse cx="16" cy="27" rx="10" ry="7" fill="#858BB2"/>
            </svg>
          </div>
        </div>
      </nav>

      {/* Mobile/Tablet: top bar */}
      <nav
        className="lg:hidden fixed top-0 left-0 right-0 h-[72px] bg-[#373B53] dark:bg-[#1E2139] flex items-center justify-between z-50"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="w-[72px] h-[72px] bg-[#7C5DFA] rounded-r-[20px] flex items-center justify-center relative overflow-hidden">
          <div className="w-[72px] h-[36px] bg-[#9277FF] rounded-tl-[20px] absolute bottom-0 rounded-br-[20px]" />
          <svg className="relative z-10" width="28" height="26" viewBox="0 0 40 38" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Invoice App Logo">
            <path d="M10.6942 0.693604L0 37.2961H22.7749L33.4692 0.693604H10.6942Z" fill="white"/>
            <path opacity="0.5" d="M20.7249 0.693604L10.0307 37.2961H29.5736L40.2678 0.693604H20.7249Z" fill="white"/>
          </svg>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-6 pr-6">
          <button
            onClick={toggleTheme}
            className="text-[#858BB2] hover:text-white transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
          <div className="h-8 w-px bg-[#494E6E]" />
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center" aria-label="User profile">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="16" cy="16" r="16" fill="#494E6E"/>
              <circle cx="16" cy="13" r="6" fill="#858BB2"/>
              <ellipse cx="16" cy="27" rx="10" ry="7" fill="#858BB2"/>
            </svg>
          </div>
        </div>
      </nav>
    </>
  )
}
