const c = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        canvas: c('canvas'),
        surface: c('surface'),
        raised: c('raised'),
        line: c('line'),
        'line-strong': c('line-strong'),
        ink: c('ink'),
        muted: c('muted'),
        faint: c('faint'),
        accent: c('accent'),
        'accent-soft': 'rgb(var(--accent) / 0.12)',
        warn: c('warn'),
        'warn-soft': 'rgb(var(--warn) / 0.12)',
        danger: c('danger'),
        'danger-soft': 'rgb(var(--danger) / 0.12)',
        info: c('info'),
        'info-soft': 'rgb(var(--info) / 0.12)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      transitionTimingFunction: {
        exit: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
  },
}
