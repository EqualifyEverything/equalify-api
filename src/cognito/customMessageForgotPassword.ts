import { formatEmail } from '#src/utils';

export const customMessageForgotPassword = async (event) => {
    event.response.emailSubject = `Please reset your password`;
    event.response.emailMessage = formatEmail({ body: `<p>${event.request.userAttributes['name'] ?? 'Hello there'},</p><p>Please reset your password by <a href="https://${process.env.STAGING ? 'staging.' : ''}equalify.dev/reset?username=${event.userName}&code=${event.request.codeParameter}">clicking here</a>.<p>Thank you,<br/>Equalify<div style="display:none"><a>${event.request.codeParameter}</a><a>${event.request.codeParameter}</a></div>` });
    return event;
}