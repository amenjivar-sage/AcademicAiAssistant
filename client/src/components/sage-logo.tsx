interface SageLogoProps {
  className?: string;
  size?: number;
}

export default function SageLogo({ className = "", size = 32 }: SageLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Tree Trunk */}
      <rect
        x="14"
        y="20"
        width="4"
        height="8"
        rx="2"
        fill="currentColor"
        opacity="0.8"
      />
      
      {/* Main Branches - Geometric diamond/leaf shapes */}
      <path
        d="M16 4L20 8L16 12L12 8L16 4Z"
        fill="currentColor"
        opacity="0.9"
      />
      
      {/* Left Branch */}
      <path
        d="M8 12L12 16L8 20L4 16L8 12Z"
        fill="currentColor"
        opacity="0.7"
      />
      
      {/* Right Branch */}
      <path
        d="M24 12L28 16L24 20L20 16L24 12Z"
        fill="currentColor"
        opacity="0.7"
      />
      
      {/* Small accent leaves */}
      <circle cx="10" cy="10" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="22" cy="10" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="6" cy="18" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="26" cy="18" r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}