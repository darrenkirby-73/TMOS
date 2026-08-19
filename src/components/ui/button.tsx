"use client";

const variants = {
  primary:
    "bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-50",
  ghost:
    "border border-border-subtle bg-surface text-foreground hover:bg-background disabled:opacity-50",
  danger:
    "border border-border-subtle bg-surface text-negative hover:bg-background disabled:opacity-50",
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${variants[variant]} ${className}`}
    />
  );
}
