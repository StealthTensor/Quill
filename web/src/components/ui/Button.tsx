import React from 'react';

type Variant = 'primary' | 'default' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-canvas hover:bg-accent/85 border border-transparent font-semibold',
  default: 'bg-raised text-ink border border-line hover:border-line-strong hover:bg-line/40',
  ghost: 'bg-transparent text-muted border border-transparent hover:text-ink hover:bg-raised',
  danger: 'bg-danger-soft text-danger border border-danger/30 hover:bg-danger/20'
};

const SIZE: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-2xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2'
};

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'default', size = 'md', className = '', ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT[variant]} ${SIZE[size]} ${className}`} />);


}