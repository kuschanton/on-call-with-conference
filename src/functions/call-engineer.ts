import '@twilio-labs/serverless-runtime-types'
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
} from '@twilio-labs/serverless-runtime-types/types'
import {getConferenceName} from '../util/util'

type Request = {
  caller: string
  escalationsCount: number
}

const fromNumber = '+1234567890'

const escalationList = [
  '+4911111111111',
  '+4922222222222',
]

export const handler: ServerlessFunctionSignature<{}, Request> = async function (
  context: Context,
  request: Request,
  callback: ServerlessCallback,
) {

  console.log('call-engineer.ts >>> request', request)
  console.log('call-engineer.ts >>> context.DOMAIN_NAME', context.DOMAIN_NAME)

  const conferenceName = getConferenceName(request.caller)

  // Get conference
  let [conference] = await context.getTwilioClient()
    .conferences
    .list({friendlyName: conferenceName, limit: 1, status: 'in-progress'})

  // Check conference before each call (starting from the second, for the first call it is not there yet) to know if
  // the caller ist still there
  if (!conference && request.escalationsCount !== 0) {
    // Conference is over, did caller hang up?
    console.log('call-engineer.ts >>> No conference found with name', conferenceName)
    return callback(null, {})
  }

  // Look up escalation and start flow
  let nextEscalation = escalationList.at(request.escalationsCount)
  if (!!nextEscalation) {
    try {

      let call = await context.getTwilioClient()
        .calls
        .create({
          from: fromNumber,
          to: nextEscalation,
          timeout: 15,
          machineDetection: 'Enable',
          // url: `http://${context.DOMAIN_NAME}/call-answered?conferenceName=${request.conferenceName}`
          url: `http://xxxx.eu.ngrok.io/call-answered?onCallCaller=${request.caller.replace('+', '')}&escalationCount=${request.escalationsCount}`,
          statusCallback: `http://xxxx.eu.ngrok.io/call-status?onCallCaller=${request.caller.replace('+', '')}&escalationCount=${request.escalationsCount}`,
        })

      console.log(`call-engineer.ts >>> Call started: ${call.sid}`)
      callback(null, {})
    } catch (err) {
      console.error('call-engineer.ts >>> Error starting execution:', err)
      callback(null, {})
    }
  } else {
    // No escalations left, send slack message
    console.log('call-engineer.ts >>> No escalations left, sending slack message')
    // slackClient.send('on-call-channel', `Caller ${request.caller}`)

    try {

      let [participant] = await conference.participants().list()

      console.log('call-engineer.ts >>> Saying announcement to caller: ', participant.callSid)

      // Announcement to let the caller know conf is about to end
      let twiml = new Twilio.twiml.VoiceResponse()
      twiml.say('On-call engineers did not answer. A slack message will be sent to escalate this. Please call later')
      await context.getTwilioClient()
        .calls(participant.callSid)
        .update({
          twiml: twiml.toString(),
        })

      console.log('call-engineer.ts >>> Announcement on call:', participant.callSid)

      callback(null, {})

    } catch (err) {
      console.error('call-engineer.ts >>> Error adding announcement:', err)
      callback(null, {})
    }
  }
}