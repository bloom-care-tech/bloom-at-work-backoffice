import { cn } from "@/lib/utils";

type FieldErrorProps = {
  id?: string;
  message: string | null | undefined;
  className?: string;
};

export function FieldError({ id, message, className }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "font-ui text-xs text-bloom-garnet mt-1.5 leading-snug motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200",
        className,
      )}
    >
      {message}
    </p>
  );
}
