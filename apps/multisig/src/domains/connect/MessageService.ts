type Methods = {
  'iframe(init)': {
    payload: []
    expects: boolean
  }
  'iframe(getAccount)': {
    payload: []
    expects: {
      vaultAddress: string
      name: string
      chain: {
        id: string
        name: string
        genesisHash: string
      }
    }
  }
}

type Data<T extends keyof Methods> = {
  id: string
  type: T
  payload: Methods[T]['payload']
}

// this only validates the format of message
const isValidMessage = (message: MessageEvent) => {
  const data = message.data
  if (typeof data !== 'object') return false

  const { id, type, payload } = data

  return id !== undefined && type !== undefined && payload !== undefined
}

type DataHandler<T extends keyof Methods> = (
  data: MessageEvent<Data<T>>,
  respond: (payload: Methods[Data<T>['type']]['expects']) => void
) => void

export class MessageService {
  private dataHandler: DataHandler<any> = () => {}

  constructor(private readonly messageFilter: (message: MessageEvent) => boolean) {
    window.addEventListener('message', this.onMessage)
  }

  cleanUp() {
    window.removeEventListener('message', this.onMessage)
  }

  onData = <T extends keyof Methods>(handler: DataHandler<T>) => {
    this.dataHandler = handler
  }

  private onMessage = (message: MessageEvent) => {
    // filter out invalid message
    if (!isValidMessage(message) || !this.messageFilter(message)) return

    this.dataHandler(message, res => {
      message.source?.postMessage(
        { id: message.data.id, type: message.data.type, res },
        { targetOrigin: message.origin }
      )
    })
  }
}
