import crypto from 'crypto'

type Methods = {
  'pub(iframe.hasSignetSdk)': {
    payload: []
    expects: boolean
  }
}

type Callback = (response: any) => void

// this only validates the format of message
const isValidMessage = (message: MessageEvent) => {
  const data = message.data
  if (typeof data !== 'object') return false

  const { id, type, payload } = data

  return id !== undefined && type !== undefined && payload !== undefined
}

export class MessageService {
  private callbacks = new Map<string, Callback>()

  constructor(private readonly messageFilter: (message: MessageEvent) => boolean) {
    console.log('Listening...')
    window.addEventListener('message', this.onMessage)
  }

  cleanUp() {
    console.log('Clean up..')
    window.removeEventListener('message', this.onMessage)
  }

  private onMessage = (message: MessageEvent) => {
    // filter out invalid message
    if (!isValidMessage(message) || !this.messageFilter(message)) return
    this.handleIncomingMessage(message.data)
  }

  private handleIncomingMessage = (payload: any): void => {
    const { id } = payload

    const cb = this.callbacks.get(id)
    if (cb) {
      cb(payload)
      this.callbacks.delete(id)
    } else {
      // TODO: route non-callbacks incoming messages
    }
  }

  async send<T extends keyof Methods>(
    type: T,
    payload: Methods[T]['payload'],
    target: string = '*',
    overrideWindow?: Window | null
  ): Promise<Methods[T]['expects']> {
    const id = crypto.randomBytes(16).toString('hex')

    const targetWindow = overrideWindow || window
    targetWindow.postMessage({ id, type, payload }, target)

    return new Promise((resolve, reject) => {
      // timeout in 1.5s
      const timeoutId = setTimeout(() => {
        this.callbacks.delete(id)
        reject(new Error('Timeout'))
      }, 1500)

      this.callbacks.set(id, payload => {
        clearTimeout(timeoutId)
        this.callbacks.delete(id)
        resolve(payload)
      })
    })
  }
}
