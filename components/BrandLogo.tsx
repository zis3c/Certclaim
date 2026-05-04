import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
};

export default function BrandLogo({ className }: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      role="img"
      aria-label="FEWDE certificate logo"
      className={cn("text-primary", className)}
    >
      <path d="M156 92h145l71 72v256H156V92Z" fill="currentColor" opacity="0.1" />
      <path d="M301 92v72h71" fill="currentColor" opacity="0.18" />
      <path
        d="M156 92h145l71 72v256H156V92Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="26"
      />
      <path
        d="M301 92v72h71"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="26"
      />
      <path
        d="M207 218h98M207 270h98M207 322h55"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="22"
        opacity="0.55"
      />
      <path
        d="m265 329 38 38 82-100"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="34"
      />
    </svg>
  );
}
