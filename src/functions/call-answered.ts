import '@twilio-labs/serverless-runtime-types'
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
} from '@twilio-labs/serverless-runtime-types/types'
import axios from 'axios'
import {getConferenceName} from '../util/util'

type Request = {
  AnsweredBy: string,
  onCallCaller: string,
  escalationCount: number
}

export const handler: ServerlessFunctionSignature<{}, Request> = async function (
  context: Context,
  request: Request,
  callback: ServerlessCallback,
) {
  let twiml = new Twilio.twiml.VoiceResponse()
  let callerNumber = '+' + request.onCallCaller
  // Looks silly, but without this the value is a string :/
  let escalationCount = Number.parseInt(request.escalationCount.toString())
  try {
    console.log('call-answered.ts >>> request', request)
    console.log('call-answered.ts >>> context.DOMAIN_NAME', context.DOMAIN_NAME)

    if (request.AnsweredBy === 'human') {
      // Connect to the conf
      let conferenceName = getConferenceName(callerNumber)
      console.log('call-answered.ts >>> answered by human, connecting to the conference:', conferenceName)

      twiml.say('Please wait, you will be connected soon')
      twiml.dial().conference(
        {
          endConferenceOnExit: true,
        },
        conferenceName,
      )
    } else {
      console.log('call-answered.ts >>> answered by machine, hanging up...')
      // Next escalation
      await axios.post(
        `http://${context.DOMAIN_NAME}/call-engineer`,
        {
          caller: callerNumber,
          escalationsCount: escalationCount + 1,
        },
      )

      twiml.hangup()
    }

    console.log('call-answered.ts >>> @@@callback')
    callback(null, twiml)
  } catch (err) {
    console.error('call-answered.ts >>> ', err)
    twiml.say('Error occurred. Please try again later')
    callback(null, twiml)
  }
}