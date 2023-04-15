import fs from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import puppeteer, { Browser, HTTPResponse, Page, Protocol } from 'puppeteer'

import { ControllerConfig, controller } from './controller'
import { request } from './request'
import { quickSort } from './sort'
import {
  isArray,
  isObject,
  isUndefined,
  log,
  logError,
  logSuccess,
  logWarn,
  mkdirDirSync
} from './utils'

import {
  DataRequestConfig,
  FileRequestConfig,
  PageRequestConfig,
  PageRequestConfigCookies,
  CrawlDataConfig,
  CrawlFileConfig,
  CrawlPageSingleRes,
  CrawlPageConfig,
  StartPollingConfig,
  LoaderCrawlPageConfig,
  CrawlPageConfigObject,
  LoaderCrawlDataConfig,
  LoaderCrawlFileConfig,
  CrawlDataSingleRes,
  CrawlFileSingleRes,
  CrawlDataConfigObject,
  LoaderPageRequestConfig,
  LoaderDataRequestConfig,
  LoaderFileRequestConfig,
  CrawlFileConfigObject
} from './types/api'
import { LoaderXCrawlConfig } from './types'

async function crawlRequestSingle(
  controllerConfig: ControllerConfig<
    LoaderDataRequestConfig | LoaderFileRequestConfig,
    any
  >
) {
  const { requestConfig } = controllerConfig

  return await request(requestConfig)
}

function parseCrawlPageCookies(
  url: string,
  cookies: PageRequestConfigCookies
): Protocol.Network.CookieParam[] {
  const cookiesArr: Protocol.Network.CookieParam[] = []

  if (typeof cookies === 'string') {
    cookies.split('; ').forEach((item) => {
      const cookie = item.split('=')
      cookiesArr.push({ name: cookie[0], value: cookie[1], url })
    })
  } else if (Array.isArray(cookies)) {
    cookies.forEach((cookie) => {
      if (!cookie.url) {
        cookie.url = url
      }

      cookiesArr.push(cookie)
    })
  } else if (typeof cookies === 'object' && cookies) {
    if (!cookies.url) {
      cookies.url = url
    }

    cookiesArr.push(cookies)
  }

  return cookiesArr
}

function transformRequestConfig(
  config: string | PageRequestConfig | (string | PageRequestConfig)[]
): PageRequestConfig[]
function transformRequestConfig(
  config: string | DataRequestConfig | (string | DataRequestConfig)[]
): DataRequestConfig[]
function transformRequestConfig(
  config: (string | FileRequestConfig)[]
): FileRequestConfig[]
function transformRequestConfig(config: any) {
  return isArray(config)
    ? config.map((item) => (isObject(item) ? item : { url: item }))
    : [isObject(config) ? config : { url: config }]
}

function loaderCommonConfig(
  xCrawlConfig: LoaderXCrawlConfig,
  requestObjects: (PageRequestConfig | DataRequestConfig | FileRequestConfig)[],
  loaderConfig:
    | LoaderCrawlPageConfig
    | LoaderCrawlDataConfig
    | LoaderCrawlFileConfig
) {
  // 1.requestConfigs
  loaderConfig.requestConfigs = requestObjects.map((requestConfig) => {
    let { url, timeout, proxy, maxRetry, priority } = requestConfig

    // 1.1.baseUrl
    if (!isUndefined(xCrawlConfig.baseUrl)) {
      url = xCrawlConfig.baseUrl + url
    }

    // 1.2.timeout
    // requestConfig > loaderConfig > xCrawlConfig
    if (isUndefined(timeout)) {
      if (!isUndefined(loaderConfig.timeout)) {
        timeout = loaderConfig.timeout
      } else {
        timeout = xCrawlConfig.timeout
      }
    }

    // 1.3.porxy
    // requestConfig > loaderConfig > xCrawlConfig
    if (isUndefined(proxy)) {
      if (!isUndefined(loaderConfig.proxy)) {
        proxy = loaderConfig.proxy
      } else if (!isUndefined(xCrawlConfig.proxy)) {
        proxy = xCrawlConfig.proxy
      }
    }

    // 1.4.maxRetry
    // requestConfig > loaderConfig > xCrawlConfig
    if (isUndefined(maxRetry)) {
      if (!isUndefined(loaderConfig.maxRetry)) {
        maxRetry = loaderConfig.maxRetry
      } else {
        maxRetry = xCrawlConfig.maxRetry
      }
    }

    // 1.5.priority
    if (isUndefined(priority)) {
      priority = 0
    }

    return { ...requestConfig, url, timeout, proxy, maxRetry, priority }
  })

  // 2.intervalTime
  if (
    isUndefined(loaderConfig.intervalTime) &&
    !isUndefined(xCrawlConfig.intervalTime)
  ) {
    loaderConfig.intervalTime = xCrawlConfig.intervalTime
  }
}

function loaderPageConfig(
  xCrawlConfig: LoaderXCrawlConfig,
  rawConfig: CrawlPageConfig
): LoaderCrawlPageConfig {
  const loaderConfig: LoaderCrawlPageConfig = { requestConfigs: [] }

  const requestObjects: PageRequestConfig[] = []
  // requestConfig 统一转成 PageRequestConfig 类型
  if (isObject(rawConfig) && Object.hasOwn(rawConfig, 'requestConfigs')) {
    // CrawlPageConfigObject 处理
    const { requestConfigs, proxy, timeout, cookies, intervalTime, maxRetry } =
      rawConfig as CrawlPageConfigObject

    // 给 loaderConfig 装载 API Config
    loaderConfig.proxy = proxy
    loaderConfig.cookies = cookies
    loaderConfig.intervalTime = intervalTime
    loaderConfig.maxRetry = maxRetry
    loaderConfig.timeout = timeout

    requestObjects.push(...transformRequestConfig(requestConfigs))
  } else {
    // string | PageRequestConfig | (string | PageRequestConfig)[] 处理
    const transformRes = transformRequestConfig(
      rawConfig as string | PageRequestConfig | (string | PageRequestConfig)[]
    )

    requestObjects.push(...transformRes)
  }

  // 装载公共配置到 loaderConfig
  loaderCommonConfig(xCrawlConfig, requestObjects, loaderConfig)

  // 装载单独的配置
  if (!isUndefined(loaderConfig.cookies)) {
    loaderConfig.requestConfigs.forEach((requestConfig) => {
      const { cookies } = requestConfig

      // cookies
      if (isUndefined(cookies) && !isUndefined(loaderConfig.cookies)) {
        // 装载 API Config
        requestConfig.cookies = loaderConfig.cookies
      }
    })
  }

  return loaderConfig
}

function loaderDataConfig(
  xCrawlConfig: LoaderXCrawlConfig,
  rawConfig: CrawlDataConfig
): LoaderCrawlDataConfig {
  const loaderConfig: LoaderCrawlDataConfig = { requestConfigs: [] }

  // requestConfig 统一转成 DataRequestConfig 类型
  const requestObjects: DataRequestConfig[] = []
  if (isObject(rawConfig) && Object.hasOwn(rawConfig, 'requestConfigs')) {
    // CrawlDataConfigObject 处理
    const { requestConfigs, proxy, timeout, intervalTime, maxRetry } =
      rawConfig as CrawlDataConfigObject

    // 给 loaderConfig 装载 API Config
    loaderConfig.proxy = proxy
    loaderConfig.intervalTime = intervalTime
    loaderConfig.maxRetry = maxRetry
    loaderConfig.timeout = timeout

    requestObjects.push(...transformRequestConfig(requestConfigs))
  } else {
    // string | DataRequestConfig | (string | DataRequestConfig)[] 处理
    const transformRes = transformRequestConfig(
      rawConfig as string | DataRequestConfig | (string | DataRequestConfig)[]
    )

    requestObjects.push(...transformRequestConfig(transformRes))
  }

  // 装载公共配置到 loaderConfig
  loaderCommonConfig(xCrawlConfig, requestObjects, loaderConfig)

  return loaderConfig
}

function loaderFileConfig(
  xCrawlConfig: LoaderXCrawlConfig,
  rawConfig: CrawlFileConfig
): LoaderCrawlFileConfig {
  const loaderConfig: LoaderCrawlFileConfig = { requestConfigs: [] }

  // requestConfig 统一转成 FileRequestConfig 类型
  const requestObjects: FileRequestConfig[] = []
  if (isObject(rawConfig) && Object.hasOwn(rawConfig, 'requestConfigs')) {
    // CrawlFileConfigObject 处理
    const {
      requestConfigs,
      proxy,
      timeout,
      intervalTime,
      maxRetry,
      fileConfig
    } = rawConfig as CrawlFileConfigObject

    // 给 loaderConfig 装载 API Config
    loaderConfig.proxy = proxy
    loaderConfig.intervalTime = intervalTime
    loaderConfig.maxRetry = maxRetry
    loaderConfig.timeout = timeout
    loaderConfig.fileConfig = fileConfig

    requestObjects.push(...transformRequestConfig(requestConfigs))
  } else {
    // FileRequestConfig | FileRequestConfig[] 处理
    requestObjects.push(
      ...(isArray(rawConfig) ? rawConfig : [rawConfig as FileRequestConfig])
    )
  }

  // 装载公共配置到 loaderConfig
  loaderCommonConfig(xCrawlConfig, requestObjects, loaderConfig)

  // 装载单独的配置
  if (
    !isUndefined(loaderConfig.fileConfig?.storeDir) ||
    !isUndefined(loaderConfig.fileConfig?.extension)
  ) {
    loaderConfig.requestConfigs.forEach((requestConfig) => {
      if (
        isUndefined(requestConfig.storeDir) &&
        !isUndefined(loaderConfig.fileConfig?.storeDir)
      ) {
        requestConfig.storeDir = loaderConfig.fileConfig!.storeDir
      }

      if (
        isUndefined(requestConfig.extension) &&
        !isUndefined(loaderConfig.fileConfig?.extension)
      ) {
        requestConfig.extension = loaderConfig.fileConfig!.extension
      }
    })
  }

  return loaderConfig
}

export function createCrawlPage(xCrawlConfig: LoaderXCrawlConfig) {
  let browser: Browser | null = null
  let createBrowserPending: Promise<void> | null = null
  let haveCreateBrowser = false

  let cIdCount = 0
  // 收集报错的 page : 因为 page 不管有没有失败都需要提供出去
  // 通过 爬取cId 找到对应爬取, 再通过 爬取id 找到 page
  const errorPageContainer = new Map<number, Map<number, Page>>()

  function crawlPage(
    config: string,
    callback?: (res: CrawlPageSingleRes) => void
  ): Promise<CrawlPageSingleRes>

  function crawlPage(
    config: PageRequestConfig,
    callback?: (res: CrawlPageSingleRes) => void
  ): Promise<CrawlPageSingleRes>

  function crawlPage(
    config: (string | PageRequestConfig)[],
    callback?: (res: CrawlPageSingleRes) => void
  ): Promise<CrawlPageSingleRes[]>

  function crawlPage(
    config: CrawlPageConfigObject,
    callback?: (res: CrawlPageSingleRes) => void
  ): Promise<CrawlPageSingleRes[]>

  async function crawlPage(
    config: CrawlPageConfig,
    callback?: (res: CrawlPageSingleRes) => void
  ): Promise<CrawlPageSingleRes | CrawlPageSingleRes[]> {
    const cId = ++cIdCount

    //  创建浏览器
    if (!haveCreateBrowser) {
      haveCreateBrowser = true
      createBrowserPending = puppeteer
        .launch(xCrawlConfig.crawlPage?.launchBrowser)
        .then((res) => {
          browser = res
        })
    }

    // 等待浏览器创建完毕
    if (createBrowserPending) {
      await createBrowserPending
      // 防止对 createBrowserPending 重复赋值
      if (createBrowserPending) createBrowserPending = null
    }

    // 合并 xCrawlConfig 配置
    const { requestConfigs, intervalTime } = loaderPageConfig(
      xCrawlConfig,
      config
    )

    const controllerRes = await controller(
      'page',
      xCrawlConfig.mode,
      requestConfigs,
      intervalTime,
      cId,
      crawlPageSingle
    )

    const crawlResArr: CrawlPageSingleRes[] = controllerRes.map((item) => {
      const {
        id,
        isSuccess,
        maxRetry,
        crawlCount,
        errorQueue,
        crawlSingleRes
      } = item

      let data: {
        browser: Browser
        response: HTTPResponse | null
        page: Page
      } | null = null

      if (isSuccess && crawlSingleRes) {
        data = { browser: browser!, ...crawlSingleRes }
      } else {
        const page = errorPageContainer.get(cId)!.get(id)!
        data = { browser: browser!, response: null, page }
      }

      const crawlRes: CrawlPageSingleRes = {
        id,
        isSuccess,
        maxRetry,
        crawlCount,
        retryCount: crawlCount - 1,
        errorQueue,
        data
      }

      if (callback) {
        callback(crawlRes)
      }

      return crawlRes
    })

    // 避免内存泄露 (这次爬取报错的 page 已经处理完毕, 后续不会再利用)
    errorPageContainer.delete(cId)

    const crawlRes =
      isArray(config) ||
      (isObject(config) && Object.hasOwn(config, 'requestConfigs'))
        ? crawlResArr
        : crawlResArr[0]

    return crawlRes
  }

  async function crawlPageSingle(
    controllerConfig: ControllerConfig<LoaderPageRequestConfig, any>,
    cid: number
  ) {
    const { id, requestConfig } = controllerConfig
    const page = await browser!.newPage()
    await page.setViewport({ width: 1280, height: 1024 })

    let response: HTTPResponse | null = null
    try {
      if (requestConfig.proxy) {
        await browser!.createIncognitoBrowserContext({
          proxyServer: requestConfig.proxy
        })
      } else {
        await browser!.createIncognitoBrowserContext({
          proxyServer: undefined
        })
      }

      if (requestConfig.headers) {
        await page.setExtraHTTPHeaders(
          requestConfig.headers as any as Record<string, string>
        )
      }

      if (requestConfig.cookies) {
        await page.setCookie(
          ...parseCrawlPageCookies(requestConfig.url, requestConfig.cookies)
        )
      }

      response = await page.goto(requestConfig.url, {
        timeout: requestConfig.timeout
      })
    } catch (error) {
      // 收集报错的 page
      let container = errorPageContainer.get(cid!)
      if (!container) {
        container = new Map()
        errorPageContainer.set(cid!, container)
      }

      if (!container.get(id)) {
        container.set(id, page)
      }

      // 让外面收集错误
      throw error
    }

    return { response, page }
  }

  return crawlPage
}

export function createCrawlData(xCrawlConfig: LoaderXCrawlConfig) {
  function crawlData<T = any>(
    config: string,
    callback?: (res: CrawlDataSingleRes<T>) => void
  ): Promise<CrawlDataSingleRes<T>>

  function crawlData<T = any>(
    config: DataRequestConfig,
    callback?: (res: CrawlDataSingleRes<T>) => void
  ): Promise<CrawlDataSingleRes<T>>

  function crawlData<T = any>(
    config: (string | DataRequestConfig)[],
    callback?: (res: CrawlDataSingleRes<T>) => void
  ): Promise<CrawlDataSingleRes<T>[]>

  function crawlData<T = any>(
    config: CrawlDataConfigObject,
    callback?: (res: CrawlDataSingleRes<T>) => void
  ): Promise<CrawlDataSingleRes<T>[]>

  async function crawlData<T = any>(
    config: CrawlDataConfig,
    callback?: (res: CrawlDataSingleRes<T>) => void
  ): Promise<CrawlDataSingleRes<T> | CrawlDataSingleRes<T>[]> {
    const { requestConfigs, intervalTime } = loaderDataConfig(
      xCrawlConfig,
      config
    )

    const controllerRes = await controller(
      'data',
      xCrawlConfig.mode,
      requestConfigs,
      intervalTime,
      undefined,
      crawlRequestSingle
    )

    const crawlResArr: CrawlDataSingleRes<T>[] = controllerRes.map((item) => {
      const {
        id,
        isSuccess,
        maxRetry,
        crawlCount,
        errorQueue,
        crawlSingleRes
      } = item

      const crawlRes: CrawlDataSingleRes<T> = {
        id,
        isSuccess,
        maxRetry,
        crawlCount,
        retryCount: crawlCount - 1,
        errorQueue,
        data: null
      }

      if (isSuccess && crawlSingleRes) {
        const contentType = crawlSingleRes.headers['content-type'] ?? ''

        const data: T = contentType.includes('text')
          ? crawlSingleRes.data.toString()
          : JSON.parse(crawlSingleRes.data.toString())

        crawlRes.data = { ...crawlSingleRes, data }
      }

      if (callback) {
        callback(crawlRes)
      }

      return crawlRes
    })

    const crawlRes =
      isArray(config) ||
      (isObject(config) && Object.hasOwn(config, 'requestConfigs'))
        ? crawlResArr
        : crawlResArr[0]

    return crawlRes
  }

  return crawlData
}

export function createCrawlFile(xCrawlConfig: LoaderXCrawlConfig) {
  function crawlFile(
    config: FileRequestConfig,
    callback?: (res: CrawlFileSingleRes) => void
  ): Promise<CrawlFileSingleRes>

  function crawlFile(
    config: FileRequestConfig[],
    callback?: (res: CrawlFileSingleRes) => void
  ): Promise<CrawlFileSingleRes[]>

  function crawlFile(
    config: CrawlFileConfigObject,
    callback?: (res: CrawlFileSingleRes) => void
  ): Promise<CrawlFileSingleRes[]>

  async function crawlFile(
    config: CrawlFileConfig,
    callback?: (res: CrawlFileSingleRes) => void
  ): Promise<CrawlFileSingleRes | CrawlFileSingleRes[]> {
    const { requestConfigs, intervalTime, fileConfig } = loaderFileConfig(
      xCrawlConfig,
      config
    )

    const controllerRes = await controller(
      'file',
      xCrawlConfig.mode,
      requestConfigs,
      intervalTime,
      undefined,
      crawlRequestSingle
    )

    const saveFileQueue: Promise<void>[] = []
    const saveFileErrorArr: { message: string; valueOf: () => number }[] = []

    const crawlResArr: CrawlFileSingleRes[] = controllerRes.map((item) => {
      const {
        id,
        isSuccess,
        maxRetry,
        crawlCount,
        errorQueue,
        crawlSingleRes,
        requestConfig
      } = item

      const crawlRes: CrawlFileSingleRes = {
        id,
        isSuccess,
        maxRetry,
        crawlCount,
        retryCount: crawlCount - 1,
        errorQueue,
        data: null
      }

      if (isSuccess && crawlSingleRes) {
        const mimeType = crawlSingleRes.headers['content-type'] ?? ''

        const fileName =
          requestConfig.fileName ?? `${id}-${new Date().getTime()}`
        const fileExtension =
          requestConfig.extension ?? `.${mimeType.split('/').pop()}`

        if (
          !isUndefined(requestConfig.storeDir) &&
          !fs.existsSync(requestConfig.storeDir)
        ) {
          mkdirDirSync(requestConfig.storeDir)
        }

        const storePath = requestConfig.storeDir ?? __dirname
        const filePath = path.resolve(storePath, fileName + fileExtension)

        // 在保存前的回调
        const data = crawlSingleRes.data
        let dataPromise = Promise.resolve(data)
        if (fileConfig?.beforeSave) {
          dataPromise = fileConfig.beforeSave({
            id,
            fileName,
            filePath,
            data
          })
        }

        const saveFileItem = dataPromise.then(async (newData) => {
          let isSuccess = true
          try {
            await writeFile(filePath, newData)
          } catch (err: any) {
            isSuccess = false

            const message = `File save error at id ${id}: ${err.message}`
            const valueOf = () => id

            saveFileErrorArr.push({ message, valueOf })
          }

          const size = newData.length
          crawlRes.data = {
            ...crawlSingleRes,
            data: {
              isSuccess,
              fileName,
              fileExtension,
              mimeType,
              size,
              filePath
            }
          }

          if (callback) {
            callback(crawlRes)
          }
        })

        saveFileQueue.push(saveFileItem)
      } else {
        if (callback) {
          callback(crawlRes)
        }
      }

      return crawlRes
    })

    // 等待保存文件完成
    await Promise.all(saveFileQueue)

    // 打印保存错误
    quickSort(saveFileErrorArr).forEach((item) => log(logError(item.message)))

    // 统计保存
    const succssIds: number[] = []
    const errorIds: number[] = []
    crawlResArr.forEach((item) => {
      if (item.data?.data.isSuccess) {
        succssIds.push(item.id)
      } else {
        errorIds.push(item.id)
      }
    })
    log('Save file final result:')
    log(
      logSuccess(
        `  Success - total: ${succssIds.length}, ids: [ ${succssIds.join(
          ' - '
        )} ]`
      )
    )
    log(
      logError(
        `    Error - total: ${errorIds.length}, ids: [ ${errorIds.join(
          ' - '
        )} ]`
      )
    )

    const crawlRes =
      isArray(config) ||
      (isObject(config) && Object.hasOwn(config, 'requestConfigs'))
        ? crawlResArr
        : crawlResArr[0]

    return crawlRes
  }

  return crawlFile
}

export function startPolling(
  config: StartPollingConfig,
  callback: (count: number, stopPolling: () => void) => void
) {
  const { d, h, m } = config

  const day = !isUndefined(d) ? d * 1000 * 60 * 60 * 24 : 0
  const hour = !isUndefined(h) ? h * 1000 * 60 * 60 : 0
  const minute = !isUndefined(m) ? m * 1000 * 60 : 0
  const total = day + hour + minute

  let count = 0

  startCallback()
  const intervalId = setInterval(startCallback, total)

  function startCallback() {
    console.log(logSuccess(`Start the ${logWarn.bold(++count)} polling`))

    callback(count, stopPolling)
  }

  function stopPolling() {
    clearInterval(intervalId)
    console.log(logSuccess(`Stop the polling`))
  }
}
