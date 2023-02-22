import '@twilio-labs/serverless-runtime-types'
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
} from '@twilio-labs/serverless-runtime-types/types'
import axios from 'axios'
import {getConferenceName} from '../util/util'

type Request = {
  Caller: string
}

export const handler: ServerlessFunctionSignature<{}, Request> = async function (
  context: Context,
  request: Request,
  callback: ServerlessCallback,
) {
  let conferenceName = getConferenceName(request.Caller)
  let twiml = new Twilio.twiml.VoiceResponse()
  try {
    console.log('conference.ts >>> request', request)
    console.log('conference.ts >>> request.Caller', request.Caller)
    console.log('conference.ts >>> context.DOMAIN_NAME', context.DOMAIN_NAME)

    // Kick off escalate function
    // ${context.DOMAIN_NAME}/escalate
    await axios.post(
      `http://${context.DOMAIN_NAME}/call-engineer`,
      {
        caller: request.Caller,
        escalationsCount: 0,
      },
    )

    twiml.say('Please wait, you will be connected soon')
    twiml.dial().conference(
      {
        endConferenceOnExit: true
      },
      conferenceName,
    )

    console.log('conference.ts >>> @@@callback')
    callback(null, twiml)
  } catch (err) {
    console.error('conference.ts >>> ', err)
    twiml.say('Error occurred. Please try again later')
    callback(null, twiml)
  }
}