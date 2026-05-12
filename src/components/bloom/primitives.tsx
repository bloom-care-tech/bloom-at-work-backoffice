import { motion, useReducedMotion } from "framer-motion";
import { ReactNode, ButtonHTMLAttributes, forwardRef } from "react";
import { Link } from "react-router-dom";
import { LockSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const ease = [0.2, 0.7, 0.2, 1] as const;

/* ───────────────────────── Eyebrow ───────────────────────── */
type EyebrowTone = "garnet" | "sky" | "terracotta" | "cream" | "aubergine";
const eyebrowTone: Record<EyebrowTone, string> = {
  garnet: "text-bloom-garnet",
  sky: "text-bloom-sky",
  terracotta: "text-bloom-terracotta",
  cream: "text-bloom-cream",
  aubergine: "text-bloom-aubergine",
};

export const Eyebrow = ({
  tone = "garnet",
  children,
  className,
}: {
  tone?: EyebrowTone;
  children: ReactNode;
  className?: string;
}) => <span className={cn("eyebrow", eyebrowTone[tone], className)}>{children}</span>;

/* ───────────────────────── PillButton ───────────────────────── */
type PillVariant = "primary" | "inverse" | "ghost-cream" | "ghost-aubergine";
const pillVariants: Record<PillVariant, string> = {
  primary: "bg-bloom-garnet text-bloom-cream hover:bg-bloom-garnet/90",
  inverse: "bg-bloom-cream text-bloom-aubergine hover:bg-bloom-cream-deep",
  "ghost-cream": "bg-transparent text-bloom-cream border border-bloom-cream/40 hover:bg-bloom-cream/10",
  "ghost-aubergine": "bg-transparent text-bloom-aubergine border border-bloom-aubergine/30 hover:bg-bloom-aubergine/5",
};

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PillVariant;
  asLink?: string;
}
export const PillButton = forwardRef<HTMLButtonElement, PillButtonProps>(
  ({ variant = "primary", asLink, className, children, ...props }, ref) => {
    const cls = cn(
      "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 font-ui text-sm font-medium transition-colors duration-260 ease-bloom",
      pillVariants[variant],
      className,
    );
    if (asLink) {
      return (
        <Link to={asLink} className={cls}>
          {children}
        </Link>
      );
    }
    return (
      <button ref={ref} className={cls} {...props}>
        {children}
      </button>
    );
  },
);
PillButton.displayName = "PillButton";

/* ───────────────────────── FadeIn ───────────────────────── */
export const FadeIn = ({
  children,
  delay = 0,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) => {
  const reduce = useReducedMotion();
  const MotionTag = motion[As] as typeof motion.div;
  return (
    <MotionTag
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.52, ease, delay }}
      className={className}
    >
      {children}
    </MotionTag>
  );
};

/* ───────────────────────── Citation ───────────────────────── */
export const Citation = ({
  children,
  className,
  tone = "aubergine",
}: {
  children: ReactNode;
  className?: string;
  tone?: "aubergine" | "cream";
}) => (
  <p className={cn("citation", tone === "cream" && "text-bloom-cream/60", className)}>{children}</p>
);

/* ───────────────────────── StatBlock ───────────────────────── */
export const StatBlock = ({
  value,
  label,
  source,
  tone = "aubergine",
  underline = "garnet",
}: {
  value: ReactNode;
  label: ReactNode;
  source?: ReactNode;
  tone?: "aubergine" | "cream";
  underline?: "garnet" | "cream" | "sky";
}) => {
  const lineColor =
    underline === "cream" ? "bg-bloom-cream/40" : underline === "sky" ? "bg-bloom-sky" : "bg-bloom-garnet";
  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "font-serif-display text-5xl md:text-6xl leading-none",
          tone === "cream" ? "text-bloom-cream" : "text-bloom-aubergine",
        )}
      >
        {value}
      </div>
      <div className={cn("h-px w-12", lineColor)} />
      <div
        className={cn(
          "font-ui text-sm leading-snug max-w-xs",
          tone === "cream" ? "text-bloom-cream/85" : "text-bloom-aubergine/80",
        )}
      >
        {label}
      </div>
      {source && <Citation tone={tone}>{source}</Citation>}
    </div>
  );
};

/* ───────────────────────── WaveGlyph ───────────────────────── */
export const WaveGlyph = ({
  className,
  color = "currentColor",
}: {
  className?: string;
  color?: string;
}) => (
  <svg
    viewBox="0 0 40 12"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    className={className}
    aria-hidden
  >
    <path d="M1 6 C 6 1, 11 11, 16 6 S 26 1, 31 6 S 39 11, 39 6" />
  </svg>
);

/* ───────────────────────── PhoneFrame ───────────────────────── */
export const PhoneFrame = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={cn(
      "relative rounded-[28px] bg-bloom-aubergine p-2 shadow-[0_30px_60px_-20px_hsl(var(--bloom-aubergine)/0.45)]",
      className,
    )}
  >
    <div className="rounded-[22px] overflow-hidden bg-bloom-cream-deep aspect-[9/19] relative">{children}</div>
  </div>
);

/* ───────────────────────── TrustLine ───────────────────────── */
export const TrustLine = ({
  children,
  className,
  tone = "aubergine",
}: {
  children: ReactNode;
  className?: string;
  tone?: "aubergine" | "cream";
}) => (
  <p
    className={cn(
      "font-ui text-xs flex items-center justify-center gap-2",
      tone === "cream" ? "text-bloom-cream/65" : "text-bloom-aubergine/65",
      className,
    )}
  >
    <LockSimple size={13} weight="regular" />
    <span>{children}</span>
  </p>
);
