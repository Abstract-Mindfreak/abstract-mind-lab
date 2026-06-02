import type { TFunction } from 'i18next'

export function buildDefaultLayout(t: TFunction) {
  return {
    global: {
      tabEnableClose: false,
      tabSetEnableTabStrip: true,
      splitterSize: 8,
    },
    layout: {
      type: 'row',
      weight: 100,
      children: [
        {
          type: 'tabset',
          weight: 24,
          selected: 0,
          children: [
            {
              type: 'tab',
              name: t('tabs.promptList'),
              component: 'prompt-list',
            },
          ],
        },
        {
          type: 'tabset',
          weight: 52,
          selected: 0,
          children: [
            {
              type: 'tab',
              name: t('tabs.graphCanvas'),
              component: 'graph-canvas',
            },
          ],
        },
        {
          type: 'row',
          weight: 24,
          children: [
            {
              type: 'tabset',
              weight: 50,
              selected: 0,
              children: [
                {
                  type: 'tab',
                  name: t('tabs.jsonInspector'),
                  component: 'json-inspector',
                },
              ],
            },
            {
              type: 'tabset',
              weight: 50,
              selected: 0,
              children: [
                {
                  type: 'tab',
                  name: t('tabs.diffAnalytics'),
                  component: 'diff-analytics',
                },
              ],
            }
          ],
        },
      ],
    },
  }
}
