import { useTheme } from '../hooks/useTheme';
import { Icon } from './Icon';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button type="button" onClick={toggleTheme} aria-label={label} title={label} className="grid size-11 shrink-0 place-items-center rounded-none border border-line bg-transparent text-control transition-colors duration-[120ms] hover:bg-control-hover hover:text-ink">
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="size-[18px]" />
    </button>
  );
}
