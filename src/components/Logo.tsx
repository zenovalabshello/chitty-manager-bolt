export default function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <div
      className={`${className} flex items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-1/2 w-1/2">
        <path
          d="M5 7.5C5 6.67 5.67 6 6.5 6h11a1.5 1.5 0 0 1 0 3h-11A1.5 1.5 0 0 1 5 7.5Z"
          fill="currentColor"
        />
        <path
          d="M5 12.5c0-.83.67-1.5 1.5-1.5h11a1.5 1.5 0 0 1 0 3h-11A1.5 1.5 0 0 1 5 12.5Z"
          fill="currentColor"
          opacity="0.7"
        />
        <path
          d="M5 17.5c0-.83.67-1.5 1.5-1.5h7a1.5 1.5 0 0 1 0 3h-7A1.5 1.5 0 0 1 5 17.5Z"
          fill="currentColor"
          opacity="0.45"
        />
      </svg>
    </div>
  );
}
