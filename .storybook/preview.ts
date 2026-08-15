import { createElement } from 'react'
import type { Preview } from '@storybook/react'
import { MX_DS_ROOT_CLASS } from '../src/design-system/tokens'
import '../src/index.css'
import '../src/design-system/tokens/primitives.css'
import '../src/design-system/tokens/semantic.css'
import '../src/design-system/tokens/components.css'

const preview: Preview = {
  // Todo story renderiza sob o escopo do Design System, com a densidade
  // selecionável — é assim que o AppShell monta a árvore em produção.
  globalTypes: {
    density: {
      description: 'Densidade do MX Design System',
      defaultValue: 'standard',
      toolbar: {
        title: 'Densidade',
        items: ['comfortable', 'standard', 'compact'],
      },
    },
  },
  decorators: [
    (Story, context) =>
      createElement(
        'div',
        { className: MX_DS_ROOT_CLASS, 'data-mx-density': context.globals.density },
        createElement(Story),
      ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'surface',
      values: [
        { name: 'surface', value: '#ffffff' },
        { name: 'surface-alt', value: '#f5f5f7' },
        { name: 'mx-black', value: '#0a0a0a' },
      ],
    },
    a11y: {
      element: '#storybook-root',
      manual: false,
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile 390px',
          styles: { width: '390px', height: '844px' },
          type: 'mobile',
        },
        tablet: {
          name: 'Tablet 768px',
          styles: { width: '768px', height: '1024px' },
          type: 'tablet',
        },
        desktop: {
          name: 'Desktop 1440px',
          styles: { width: '1440px', height: '900px' },
          type: 'desktop',
        },
      },
    },
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default preview
