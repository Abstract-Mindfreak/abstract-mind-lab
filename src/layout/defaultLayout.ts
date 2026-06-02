import type { IJsonModel } from 'flexlayout-react'
import type { TFunction } from 'i18next'

export function buildDefaultLayout(t: TFunction): IJsonModel {
  return {
    global: {
      tabEnableClose: true,
      tabEnablePopout: true,
      tabEnableRename: true,
      borderEnableAutoHide: true,
      borderSize: 260,
      tabSetEnableTabStrip: true,
      tabSetEnableCloseButton: false,
    },
    borders: [
      {
        type: 'border',
        location: 'bottom',
        size: 220,
        selected: 0,
        children: [
          {
            id: 'terminal-tab',
            type: 'tab',
            name: t('tabs.terminal'),
            component: 'terminal-panel',
            enableClose: false,
          },
        ],
      },
      {
        type: 'border',
        location: 'right',
        size: 280,
        selected: 0,
        children: [
          {
            id: 'settings-tab',
            type: 'tab',
            name: t('tabs.settings'),
            component: 'workspace-settings',
            enableClose: false,
          },
        ],
      },
    ],
    layout: {
      type: 'row',
      weight: 100,
      children: [
        {
          type: 'tabset',
          id: 'prompt-list-tabset',
          weight: 24,
          selected: 0,
          children: [
            {
              id: 'prompt-list-tab',
              type: 'tab',
              name: t('tabs.promptList'),
              component: 'prompt-list',
              enableClose: false,
            },
          ],
        },
        {
          type: 'tabset',
          id: 'workspace-tabset',
          weight: 52,
          selected: 1,
          children: [
            {
              id: 'graph-canvas-tab',
              type: 'tab',
              name: t('tabs.graphCanvas'),
              component: 'graph-canvas',
              enableClose: false,
            },
            {
              id: 'json-preview-tab',
              type: 'tab',
              name: t('tabs.jsonPreview'),
              component: 'json-inspector',
              enableClose: false,
              config: {
                mode: 'preview',
              },
            },
          ],
        },
        {
          type: 'row',
          weight: 24,
          children: [
            {
              type: 'tabset',
              id: 'json-tabset',
              weight: 50,
              selected: 0,
              children: [
                {
                  id: 'json-inspector-tab',
                  type: 'tab',
                  name: t('tabs.jsonInspector'),
                  component: 'json-inspector',
                  enableClose: false,
                  config: {
                    mode: 'selection',
                  },
                },
              ],
            },
            {
              type: 'tabset',
              id: 'diff-tabset',
              weight: 50,
              selected: 0,
              children: [
                {
                  id: 'diff-analytics-tab',
                  type: 'tab',
                  name: t('tabs.diffAnalytics'),
                  component: 'diff-analytics',
                  enableClose: false,
                },
              ],
            }
          ],
        },
      ],
    },
  }
}
