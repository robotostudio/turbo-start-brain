export interface IconProps {
  className?: string;
}

export function CopyIcon({ className }: Readonly<IconProps>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.125"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5.8125 5.8125V4.3125C5.8125 3.48407 6.48407 2.8125 7.3125 2.8125H13.6875C14.5159 2.8125 15.1875 3.48407 15.1875 4.3125V10.695C15.1875 11.5235 14.5159 12.195 13.6875 12.195H12.1875M2.8125 7.3125V13.6875C2.8125 14.5159 3.48407 15.1875 4.3125 15.1875H10.6875C11.5159 15.1875 12.1875 14.5159 12.1875 13.6875V7.3125C12.1875 6.48407 11.5159 5.8125 10.6875 5.8125H4.3125C3.48407 5.8125 2.8125 6.48407 2.8125 7.3125Z" />
    </svg>
  );
}
