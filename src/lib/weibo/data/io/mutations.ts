import type { SubmitComposeInput } from '@/lib/weibo/models/compose'
import { wbPostForm } from '@/lib/weibo/services/client'
import { WEIBO_ENDPOINTS } from '@/lib/weibo/services/endpoints'

import { isWeiboMutationSuccess, type WeiboMutationResponse } from './shared'

function buildRepostPayload(input: SubmitComposeInput): Record<string, string> {
  if (input.target.kind !== 'status') {
    throw new Error('weibo-repost-requires-status-target')
  }

  return {
    id: input.target.statusId,
    comment: input.text,
    pic_id: '',
    is_repost: '0',
    comment_ori: '0',
    is_comment: input.alsoSecondaryAction ? '1' : '0',
    visible: '0',
    share_id: '',
  }
}

export async function setStatusLike(statusId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.setLike, {
    id: statusId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || response.message || '点赞失败')
  }
}

export async function cancelStatusLike(statusId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.cancelLike, {
    id: statusId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || response.message || '取消点赞失败')
  }
}

export async function setCommentLike(commentId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.setCommentLike, {
    object_id: commentId,
    object_type: 'comment',
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || response.message || '评论点赞失败')
  }
}

export async function cancelCommentLike(commentId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.cancelCommentLike, {
    object_id: commentId,
    object_type: 'comment',
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || response.message || '取消评论点赞失败')
  }
}

export async function deleteWeiboStatus(statusId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.statusDestroy, {
    id: statusId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || response.message || '删除微博失败')
  }
}

export async function deleteWeiboComment(commentId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.destroyComment, {
    cid: commentId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || response.message || '删除评论失败')
  }
}

export async function createFavorite(statusId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.createFavorites, {
    id: statusId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || response.message || '收藏失败')
  }
}

export async function destroyFavorite(statusId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.destroyFavorites, {
    id: statusId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || response.message || '取消收藏失败')
  }
}

function buildCommentPayload(input: SubmitComposeInput): Record<string, string> {
  const payload: Record<string, string> = {
    id: input.target.statusId,
    comment: input.text,
    pic_id: '',
    is_repost: input.alsoSecondaryAction ? '1' : '0',
    comment_ori: '0',
    is_comment: '0',
    fp: '',
  }

  if (input.target.kind === 'comment') {
    payload.cid = input.target.targetCommentId
  }

  return payload
}

export async function submitComposeAction(input: SubmitComposeInput): Promise<void> {
  if (input.target.mode === 'repost') {
    const response = await wbPostForm<WeiboMutationResponse>(
      WEIBO_ENDPOINTS.normalRepost,
      buildRepostPayload(input),
    )
    if (!isWeiboMutationSuccess(response)) {
      throw new Error(response.msg || response.message || '发送微博失败')
    }

    return
  }

  const endpoint =
    input.target.kind === 'comment' ? WEIBO_ENDPOINTS.commentReply : WEIBO_ENDPOINTS.commentCreate

  const response = await wbPostForm<WeiboMutationResponse>(endpoint, buildCommentPayload(input))

  if (response.ok !== 1) {
    throw new Error(response.msg || response.message || '发送微博失败')
  }
}

interface PublishStatusResponse {
  ok?: number
  msg?: string
  message?: string
  id?: string
  mid?: string
}

export async function publishWeiboStatus(content: string): Promise<void> {
  const response = await wbPostForm<PublishStatusResponse>(WEIBO_ENDPOINTS.statusUpdate, {
    content,
    visible: '0',
    share_id: '',
    vote: '',
    media: '',
    fp: '',
  })

  if (response.ok !== 1) {
    throw new Error(response.msg || response.message || '发布失败，请稍后再试')
  }
}
