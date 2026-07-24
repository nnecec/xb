interface WeiboMutationResponse {
  ok?: number
  msg?: string
  message?: string
  result?: boolean
}

function isWeiboMutationSuccess(response: WeiboMutationResponse): boolean {
  return response.ok === 1 || response.result === true
}

export type { WeiboMutationResponse }
export { isWeiboMutationSuccess }
