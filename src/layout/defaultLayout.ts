export const DEFAULT_LAYOUT = {
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
            name: 'Prompt List',
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
            name: 'Graph Canvas',
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
                name: 'JSON Inspector',
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
                name: 'Diff Analytics',
                component: 'diff-analytics',
              },
            ],
          },
        ],
      },
    ],
  },
}
