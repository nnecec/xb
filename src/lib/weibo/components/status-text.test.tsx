import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { EMOTICON_CONFIG_QUERY_KEY } from '@/lib/weibo/app/emoticon-query'
import { MentionInlineText, StatusText } from '@/lib/weibo/components/status-text'
import type { WeiboEmoticonConfig } from '@/lib/weibo/models/emoticon'

function renderWithProviders(ui: React.ReactNode, emoticonConfig?: WeiboEmoticonConfig) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  if (emoticonConfig) {
    queryClient.setQueryData(EMOTICON_CONFIG_QUERY_KEY, emoticonConfig)
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('StatusText', () => {
  afterEach(() => {
    resetAppSettingsStoreForTest()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(globalThis, 'browser', {
      writable: true,
      value: {
        storage: {
          local: {
            get: vi.fn(async () => ({})),
            set: vi.fn(async () => {}),
          },
        },
      },
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    resetAppSettingsStoreForTest()
    const store = getAppSettingsStore({
      get: async () => ({ [APP_SETTINGS_STORAGE_KEY]: undefined }),
      set: async () => {},
    })
    store.setState({
      ...store.getState(),
      collapseRepliesEnabled: false,
      isHydrated: true,
    })
  })
  it('renders topic_struct topics as encoded search links', () => {
    const { container } = renderWithProviders(
      <StatusText
        item={{
          topicEntities: [
            {
              title: '天才卡丁车装修进度',
              url: 'https://s.weibo.com/weibo?q=%23%E5%A4%A9%E6%89%8D%E5%8D%A1%E4%B8%81%E8%BD%A6%E8%A3%85%E4%BF%AE%E8%BF%9B%E5%BA%A6%23',
            },
          ],
        }}
        text={'#天才卡丁车装修进度#\n\n今天把大路灯立起来了'}
      />,
    )

    const view = within(container)
    const link = view.getByRole('link', { name: '#天才卡丁车装修进度#' })
    expect(link).toHaveAttribute(
      'href',
      'https://s.weibo.com/weibo?q=%23%E5%A4%A9%E6%89%8D%E5%8D%A1%E4%B8%81%E8%BD%A6%E8%A3%85%E4%BF%AE%E8%BF%9B%E5%BA%A6%23',
    )
  })

  it('renders matched bracket phrases as inline emoticon images', () => {
    const { container } = renderWithProviders(
      <StatusText item={{ urlEntities: [], topicEntities: [] }} text="给你点个[赞]" />,
      {
        groups: [
          {
            title: '其他',
            items: [{ phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan.png' }],
          },
        ],
        phraseMap: {
          '[赞]': { phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan.png' },
        },
      },
    )

    const view = within(container)
    expect(view.getByRole('img', { name: '[赞]' })).toHaveAttribute(
      'src',
      'https://face.t.sinajs.cn/zan.png',
    )
  })

  it('keeps unmatched bracket phrases as plain text when config is missing', () => {
    const { container } = renderWithProviders(
      <StatusText item={{ urlEntities: [], topicEntities: [] }} text="这个先留着[不存在]" />,
      {
        groups: [],
        phraseMap: {},
      },
    )

    expect(container).toHaveTextContent('这个先留着[不存在]')
  })

  it('renders emoticons from item fallback data when the global dictionary is empty', () => {
    const { container } = renderWithProviders(
      <StatusText
        item={{
          emoticons: {
            '[二哈]': { phrase: '[二哈]', url: 'https://face.t.sinajs.cn/erha.png' },
          },
          urlEntities: [],
          topicEntities: [],
        }}
        text="不知道油价大涨带来的增量有多少[二哈]"
      />,
      {
        groups: [],
        phraseMap: {},
      },
    )

    const view = within(container)
    expect(view.getByRole('img', { name: '[二哈]' })).toHaveAttribute(
      'src',
      'https://face.t.sinajs.cn/erha.png',
    )
  })

  it('replaces emoticons only in plain text chunks and keeps url/topic entity links intact', () => {
    const { container } = renderWithProviders(
      <StatusText
        item={{
          urlEntities: [
            {
              shortUrl: 'http://t.cn/LINK',
              title: '真实链接',
              url: 'https://weibo.com/real-link',
            },
          ],
          topicEntities: [
            {
              title: '话题',
              url: 'https://s.weibo.com/weibo?q=%23%E8%AF%9D%E9%A2%98%23',
            },
          ],
        }}
        text="普通 http://t.cn/PLAIN [赞] #话题# 真链接 http://t.cn/LINK"
      />,
      {
        groups: [
          {
            title: '其他',
            items: [{ phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan.png' }],
          },
        ],
        phraseMap: {
          '[赞]': { phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan.png' },
        },
      },
    )

    const view = within(container)
    expect(view.getByRole('img', { name: '[赞]' })).toBeInTheDocument()
    expect(view.getByRole('link', { name: '#话题#' })).toHaveAttribute(
      'href',
      'https://s.weibo.com/weibo?q=%23%E8%AF%9D%E9%A2%98%23',
    )
    expect(view.getByRole('link', { name: '真实链接' })).toHaveAttribute(
      'href',
      'https://weibo.com/real-link',
    )
    expect(container).toHaveTextContent('http://t.cn/PLAIN')
  })

  it('renders reply-chain text as leading body plus stacked quoted segments', () => {
    const { container } = renderWithProviders(
      <StatusText
        item={{ urlEntities: [], topicEntities: [] }}
        text="回复@宋大力:哈哈 //@宋大力:第二段 //@罗永浩的十字路口:第三段"
      />,
    )

    const view = within(container)
    const replyChain = view.getByTestId('reply-chain')

    expect(container).toHaveTextContent('回复@宋大力:哈哈')
    expect(within(replyChain).getByRole('link', { name: '@宋大力' })).toBeInTheDocument()
    expect(within(replyChain).getByRole('link', { name: '@罗永浩的十字路口' })).toBeInTheDocument()
    expect(replyChain).toHaveTextContent('第二段')
    expect(replyChain).toHaveTextContent('第三段')
  })

  it('keeps topic and url entities in the leading body when reply-chain rendering is active', () => {
    const { container } = renderWithProviders(
      <StatusText
        item={{
          urlEntities: [
            {
              shortUrl: 'http://t.cn/LINK',
              title: '真实链接',
              url: 'https://weibo.com/real-link',
            },
          ],
          topicEntities: [
            {
              title: '话题',
              url: 'https://s.weibo.com/weibo?q=%23%E8%AF%9D%E9%A2%98%23',
            },
          ],
        }}
        text="#话题# 真链接 http://t.cn/LINK //@宋大力:第二段"
      />,
    )

    const view = within(container)
    expect(view.getByRole('link', { name: '#话题#' })).toHaveAttribute(
      'href',
      'https://s.weibo.com/weibo?q=%23%E8%AF%9D%E9%A2%98%23',
    )
    expect(view.getByRole('link', { name: '真实链接' })).toHaveAttribute(
      'href',
      'https://weibo.com/real-link',
    )
  })

  it('keeps mention and emoticon rendering inside reply-chain segments', () => {
    const { container } = renderWithProviders(
      <StatusText item={{ urlEntities: [], topicEntities: [] }} text="主文本 //@Alice:@Bob [赞]" />,
      {
        groups: [
          {
            title: '其他',
            items: [{ phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan.png' }],
          },
        ],
        phraseMap: {
          '[赞]': { phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan.png' },
        },
      },
    )

    const view = within(container)
    expect(view.getByRole('link', { name: '@Alice' })).toBeInTheDocument()
    expect(view.getByRole('link', { name: '@Bob' })).toBeInTheDocument()
    expect(view.getByRole('img', { name: '[赞]' })).toHaveAttribute(
      'src',
      'https://face.t.sinajs.cn/zan.png',
    )
  })

  it('falls back to plain text when //@ markers are malformed', () => {
    const { container } = renderWithProviders(
      <StatusText
        item={{ urlEntities: [], topicEntities: [] }}
        text="普通文本 //@坏格式 没有冒号"
      />,
    )

    expect(container).toHaveTextContent('普通文本 //@坏格式 没有冒号')
  })

  it('falls back to plain text when malformed and valid //@ markers are mixed together', () => {
    const { container } = renderWithProviders(
      <StatusText
        item={{ urlEntities: [], topicEntities: [] }}
        text="普通文本 //@坏 格式 //@宋大力:第二段"
      />,
    )

    expect(container).toHaveTextContent('普通文本 //@坏 格式 //@宋大力:第二段')
  })

  it('renders an inline image carousel inside the reply-chain segment that owns the short_url', () => {
    const { container } = renderWithProviders(
      <StatusText
        item={{
          urlEntities: [],
          topicEntities: [],
          imageEntities: {
            'http://t.cn/IMG': [
              {
                id: 'pic1',
                thumbnailUrl: 'https://img/thumb.jpg',
                largeUrl: 'https://img/large.jpg',
              },
            ],
          },
        }}
        text="//@硬哥://@顾扯淡:好玩吗 http://t.cn/IMG"
      />,
    )

    const view = within(container)
    const replyChain = view.getByTestId('reply-chain')
    const items = replyChain.querySelectorAll('[data-slot="item"]')

    expect(items).toHaveLength(2)
    expect(items[0]!.querySelector('img')).toBeNull()
    const carouselImg = items[1]!.querySelector('img')
    expect(carouselImg).not.toBeNull()
    expect(carouselImg).toHaveAttribute('src', 'https://img/thumb.jpg')
    expect(replyChain).not.toHaveTextContent('http://t.cn/IMG')
  })

  it('renders an inline image carousel after the text when the short_url lives outside any reply chain', () => {
    const { container } = renderWithProviders(
      <StatusText
        item={{
          urlEntities: [],
          topicEntities: [],
          imageEntities: {
            'http://t.cn/PIC': [
              {
                id: 'pic2',
                thumbnailUrl: 'https://img/p2-thumb.jpg',
                largeUrl: 'https://img/p2-large.jpg',
              },
            ],
          },
        }}
        text="这是正文 http://t.cn/PIC"
      />,
    )

    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('src', 'https://img/p2-thumb.jpg')
    expect(container).not.toHaveTextContent('http://t.cn/PIC')
    expect(container).toHaveTextContent('这是正文')
  })
})

describe('StatusText reply-chain collapsible', () => {
  it('renders all items without collapsible when collapseRepliesEnabled is false', () => {
    const { container } = renderWithProviders(
      <StatusText
        item={{ urlEntities: [], topicEntities: [] }}
        text="主文本 //@A:第一条 //@B:第二条 //@C:第三条"
      />,
    )

    const view = within(container)
    const replyChain = view.getByTestId('reply-chain')
    const items = replyChain.querySelectorAll('[data-slot="item"]')
    expect(items).toHaveLength(3)
    expect(container.querySelectorAll('[data-slot="collapsible"]')).toHaveLength(0)
  })

  it('renders all items without collapsible when chain has 2 or fewer items', () => {
    getAppSettingsStore().setState({ collapseRepliesEnabled: true })
    const { container } = renderWithProviders(
      <StatusText
        item={{ urlEntities: [], topicEntities: [] }}
        text="主文本 //@A:第一条 //@B:第二条"
      />,
    )

    const view = within(container)
    const replyChain = view.getByTestId('reply-chain')
    const items = replyChain.querySelectorAll('[data-slot="item"]')
    expect(items).toHaveLength(2)
    expect(container.querySelectorAll('[data-slot="collapsible"]')).toHaveLength(0)
  })

  it('collapses middle items when collapseRepliesEnabled is true and chain length > 2', () => {
    getAppSettingsStore().setState({ collapseRepliesEnabled: true })
    const { container } = renderWithProviders(
      <StatusText
        item={{ urlEntities: [], topicEntities: [] }}
        text="主文本 //@A:第一条 //@B:第二条 //@C:第三条 //@D:第四条"
      />,
    )

    expect(container.querySelectorAll('[data-slot="collapsible"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-slot="collapsible-trigger"]')).toHaveLength(1)
  })

  it('places collapsible trigger after second item', () => {
    getAppSettingsStore().setState({ collapseRepliesEnabled: true })
    const { container } = renderWithProviders(
      <StatusText
        item={{ urlEntities: [], topicEntities: [] }}
        text="主文本 //@A:第一条 //@B:第二条 //@C:第三条 //@D:第四条"
      />,
    )

    const allItems = container.querySelectorAll('[data-slot="item"]')
    expect(allItems).toHaveLength(3)
  })
})

describe('MentionInlineText', () => {
  it('renders mentions and emoticons in the same sentence', () => {
    const { container } = renderWithProviders(<MentionInlineText text="@Alice [赞]" />, {
      groups: [
        {
          title: '其他',
          items: [{ phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan.png' }],
        },
      ],
      phraseMap: {
        '[赞]': { phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan.png' },
      },
    })

    const view = within(container)
    expect(view.getByRole('link', { name: '@Alice' })).toBeInTheDocument()
    expect(view.getByRole('img', { name: '[赞]' })).toBeInTheDocument()
  })
})
