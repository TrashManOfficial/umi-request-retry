/**
 * 网络请求工具 封装umi-request
 * 更详细的 api 文档: https://github.com/umijs/umi-request
 */

import type { Context } from 'umi-request'
import { extend } from 'umi-request'
import { notification } from 'antd'

// codeMessage仅供参考 具体根据和后端协商,在详细定义.
const codeMessage = {
  200: '服务器成功返回请求的数据。',
  400: '发出的请求有错误，服务器没有进行新建或修改数据的操作。',
  500: '服务器发生错误，请检查服务器。',
}
type mapCode = 200 | 400 | 500

/**
 * 错误异常处理程序
 */
const errorHandler = (error: { response: Response }): Response => {
  const { response } = error
  if (response && response.status) {
    let errorText = codeMessage[response.status as mapCode] || response.statusText
    const { status, url } = response
    response
      ?.clone()
      ?.json()
      ?.then((res) => {
        // 后端返回错误信息,就用后端传回的
        errorText = res.msg ? res.msg : errorText
        notification.error({
          message: `请求错误 ${status}: ${url}`,
          description: errorText,
        })
      })
  } else if (!response) {
    notification.error({
      description: '您的网络发生异常，无法连接服务器',
      message: '网络异常',
    })
  }
  return response
}
/**
 * 配置request请求时的默认参数
 */
const request = extend({
  errorHandler, // 默认错误处理
  credentials: 'include', // 默认请求是否带上cookie
})

export const requestInstanceMiddleware = async (ctx: Context, next: () => void) => {
  const { req } = ctx
  const { url, options } = req
  try {
    await next()
  } catch (error: any) {
    // 发生网络错误时重试请求
    if (error) {
      ctx.res = await requestRetry(url, options, error)
      return
    }
    throw error
  }
}

export const abortControlInterceptor = (url: string, options: any) => {
  const controller = new AbortController()
  const { signal } = controller
  return {
    url,
    options: { ...options, signal, controller },
  }
}

export const requestCountInterceptor = (url: string, options: any) => {
  const { retryCount, retryInterval, currentCount = 1 } = options
  if (retryCount >= 0) {
    let timeout = retryInterval ?? Math.min(1000 * 2 ** currentCount, 30000)
    // if (retryCount === 1) {
    //   // 测试代码，测试最后一次成功是否正常返回
    //   timeout = 10000
    // }
    // eslint-disable-next-line no-param-reassign
    options = { ...options, timeout, currentCount }
  }
  return {
    url,
    options,
  }
}

export async function requestRetry(url: string, options: any, error: any) {
  const { controller, currentCount } = options
  if (!options.retryCount) {
    throw error
  }
  // 取消未完成的请求
  controller.abort()
  const response = await request(url, {
    ...options,
    retryCount: options?.retryCount - 1,
    currentCount: currentCount && currentCount + 1,
  })
  return response
}

request.use(requestInstanceMiddleware)
request.interceptors.request.use(abortControlInterceptor)
request.interceptors.request.use(requestCountInterceptor)
/**
 * @url 请求的url
 * @parameter 上传的参数
 */

export default request
