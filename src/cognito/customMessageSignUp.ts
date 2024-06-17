import { formatEmail } from '#src/utils';

export const customMessageSignUp = async (event) => {
    event.response.emailSubject = `Equalify Verification Code`;
    event.response.emailMessage = formatEmail({ body: `<p>Hey there,</p><p>Your Equalify verification code is ${event.request.codeParameter}.</p><p>Thank you,<br/>Equalify` });
    return event;
}