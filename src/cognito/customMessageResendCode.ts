import { formatEmail } from "../utils";

export const customMessageResendCode = async (event) => {
    event.response.emailSubject = `Confirm your registration to Equalify`;
    event.response.emailMessage = formatEmail({ body: `<p>${event.request.userAttributes['name']},</p><p>Please confirm your registration by <a href="https://${process.env.STAGING ? 'staging.' : ''}equalify.dev/login?username=${event.userName}&code=${event.request.codeParameter}&email=${event.request.userAttributes.email}">clicking here</a>.<p>Thank you,<br/>Equalify<div style="display:none"><a>${event.request.codeParameter}</a><a>${event.request.codeParameter}</a></div>` });
    return event;
}