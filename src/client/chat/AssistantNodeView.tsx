import { memo, useMemo, useSyncExternalStore } from 'react'
import type { ChatNodeViewProps, TurnTailOwnerProps } from '../contract/slots.ts'
import { AssistantMarkdown } from './AssistantMarkdown.tsx'
import { ChatBubble } from './bubbles/ChatBubble.tsx'
import { assistantBubbleCustom } from './bubbles/chrome.ts'

/** Streaming, settled, and interrupted Assistant states share one keyed renderer instance. */
export const AssistantNodeView = memo(function AssistantNodeView({
  node, useTurnData, openFile, renderMessageImages, fileMentions, chatFocus, skins, t,
}: ChatNodeViewProps<'assistant-step'>) {
  const data = node.data
  // Only a reply (a step carrying prose) wears the bubble: text-less steps are
  // runtime activity and render inside the fold box, where bubble chrome would
  // be noise. The grouping engine classifies by the same text test.
  const isReply = data.blocks.some(block => block.kind === 'text')
  const focus = useSyncExternalStore(
    chatFocus.subscribe,
    () => chatFocus.getSnapshot(),
    () => chatFocus.getSnapshot(),
  )
  // The applied skin resolves through the library snapshot, so a skin that
  // arrives after first paint (or gets edited) re-renders these bubbles.
  const skinsState = useSyncExternalStore(
    skins.state.subscribe,
    () => skins.state.getSnapshot(),
    () => skins.state.getSnapshot(),
  )
  const custom = useMemo(
    () => assistantBubbleCustom(focus, skins),
    [focus, skins, skinsState],
  )
  const turn = node.location.kind === 'turn' || node.location.kind === 'step'
    ? node.location.turn
    : undefined
  const tail = useTurnData('turn-tail')
  const owner = useMemo<TurnTailOwnerProps | undefined>(() => {
    if (turn?.status !== 'closed' || data.finalNode === undefined) return undefined
    if (tail?.closing?.finalNode.seq !== data.finalNode.seq) return undefined
    return { turn, seq: data.finalNode.seq, openFile }
  }, [data.finalNode, openFile, tail, turn])
  const mentions = useMemo(
    () => owner === undefined ? undefined : fileMentions(owner),
    [fileMentions, owner],
  )
  // ChatFocus folds a reply's thinking blocks into its preceding runtime run,
  // so a reply bubble suppresses its own reasoning. A text-less step is a
  // runtime member: its thinking IS the activity and must stay visible inside
  // the fold box (hiding it there reads as "activity missing").
  const reasoningHidden = focus.focusEnabled && isReply
  const markdown = (
    <AssistantMarkdown
      blocks={data.blocks}
      streaming={data.status === 'running'}
      interrupted={data.status === 'interrupted'}
      renderMessageImages={renderMessageImages}
      reasoningHidden={reasoningHidden}
      mentions={mentions}
      t={t}
    />
  )
  if (!focus.focusBubbles || !isReply) return markdown
  return (
    <ChatBubble
      role="assistant"
      compact={focus.focusBubbleStyle === 'compact'}
      time={data.time}
      custom={custom}
    >
      {markdown}
    </ChatBubble>
  )
})
