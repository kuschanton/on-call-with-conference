import '@twilio-labs/serverless-runtime-types'
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
} from '@twilio-labs/serverless-runtime-types/types'
import axios from 'axios'
import {getConferenceName} from '../util/util'

type Request = {
  CallStatus: string,
  onCallCaller: string,
  escalationCount: number
}

const callStatusesToRedial = new Set([
  'busy',
  'failed',
  'no-answer',
])

export const handler: ServerlessFunctionSignature<{}, Request> = async function (
  context: Context,
  request: Request,
  callback: ServerlessCallback,
) {
  let twiml = new Twilio.twiml.VoiceResponse()
  let callerNumber = '+' + request.onCallCaller
  let escalationCount = Number.parseInt(request.escalationCount.toString())
  try {
    console.log('call-status.ts >>> request', request)
    console.log('call-status.ts >>> context.DOMAIN_NAME', context.DOMAIN_NAME)

    if (callStatusesToRedial.has(request.CallStatus)) {
      console.log('call-status.ts >>> Escalating to the next as call status is: ', request.CallStatus)
      // Next escalation
      await axios.post(
        `http://${context.DOMAIN_NAME}/call-engineer`,
        {
          caller: callerNumber,
          escalationsCount: escalationCount + 1,
        },
      )
    }

    console.log('call-status.ts >>> @@@callback')
    callback(null, twiml)
  } catch (err) {
    console.error('call-status.ts >>> ', err)
    callback(err, {})
  }
}