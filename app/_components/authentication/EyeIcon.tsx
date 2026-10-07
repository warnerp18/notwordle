// An eye for "show password"; with `crossed`, an eye with a line through it
// for "hide password". Decorative: the button around it has the aria-label.
const EyeIcon = ({ crossed = false }: { crossed?: boolean }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {crossed ? <path d="M3 3l18 18" /> : null}
  </svg>
);

export default EyeIcon;
