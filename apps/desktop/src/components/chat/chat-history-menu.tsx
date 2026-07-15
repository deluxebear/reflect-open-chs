import type { ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { hasBridge, listChatConversations } from '@reflect/core'
import { Check, History, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { dateFnsLocaleForLanguage } from '@/i18n/date-fns-locale'
import { CHAT_QUERY_SCOPE } from '@/lib/query-client'
import { useChatSession } from '@/providers/chat-provider'
import { useGraph } from '@/providers/graph-provider'

/**
 * The conversation history: a dropdown over the persisted conversations,
 * newest first — select one to load it, `×` to delete it. The active
 * conversation is checked. Kept fresh by `invalidateChatQueries` after every
 * save and delete, so the list updates while a new conversation streams.
 */
export function ChatHistoryMenu(): ReactElement | null {
  const { t, i18n } = useTranslation('chat')
  const dateLocale = dateFnsLocaleForLanguage(i18n.language)
  const { graph, indexGeneration } = useGraph()
  const { activeConversationId, openConversation, deleteConversation } = useChatSession()

  const enabled = hasBridge() && indexGeneration !== null
  const { data: conversations } = useQuery({
    // The graph root is part of the key: conversations belong to one graph,
    // and a graph switch must never serve the previous graph's cached list.
    queryKey: [CHAT_QUERY_SCOPE, 'conversations', graph?.root],
    queryFn: () => listChatConversations(),
    enabled,
  })

  if (!enabled) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t('historyAria')}>
          <History aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        aria-label={t('historyAria')}
        side="top"
        align="end"
        sideOffset={6}
        className="w-72"
      >
        {conversations === undefined || conversations.length === 0 ? (
          <DropdownMenuItem disabled className="px-2 py-1.5 text-[13px] text-text-muted">
            {t('noPastChats')}
          </DropdownMenuItem>
        ) : (
          conversations.map((conversation) => {
            const current = conversation.id === activeConversationId
            return (
              <DropdownMenuItem
                key={conversation.id}
                onSelect={() => {
                  if (!current) {
                    void openConversation(conversation.id)
                  }
                }}
                className="group/conversation gap-2 px-2 py-1.5 text-[13px] text-text-secondary"
              >
                <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                <span className="shrink-0 text-xs text-text-muted">
                  {formatDistanceToNow(conversation.updatedMs, {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </span>
                {current ? (
                  <Check aria-hidden className="size-3.5 shrink-0 text-accent" />
                ) : (
                  <button
                    type="button"
                    aria-label={t('deleteChatAria', { title: conversation.title })}
                    onClick={(event) => {
                      event.stopPropagation()
                      void deleteConversation(conversation.id)
                    }}
                    className="invisible shrink-0 text-text-muted hover:text-text group-hover/conversation:visible"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                )}
              </DropdownMenuItem>
            )
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
