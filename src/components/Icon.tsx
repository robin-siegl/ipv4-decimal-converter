export interface IconProps {
  name: 'copy' | 'check' | 'arrows' | 'chevron';
  className?: string;
  title?: string;
}

export function Icon({ name, className = 'size-5', title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0 fill-none stroke-current [stroke-width:1.7] [stroke-linecap:square] [stroke-linejoin:miter]`} aria-hidden={title ? void 0 : true} aria-label={title} role={title ? 'img' : void 0}>
      {name === 'copy' && <><rect x="8" y="8" width="12" height="12" /><path d="M16 8V3H3v13h5" /></>}
      {name === 'check' && <path d="m5 12 4 4L19 6" />}
      {name === 'arrows' && <path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4" />}
      {name === 'chevron' && <path d="m6 9 6 6 6-6" />}
    </svg>
  );
}
