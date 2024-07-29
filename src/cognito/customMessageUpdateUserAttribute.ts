import { formatEmail } from '#src/utils';

export const customMessageUpdateUserAttribute = async (event) => {
    event.response.emailSubject = `Please confirm your new email address`;
    event.response.emailMessage = formatEmail({ body: `<p>${event.request.userAttributes['name']},</p><p>Please confirm your new email address by <a href="https://${process.env.STAGING ? 'equalify.dev' : 'dashboard.equalify.app'}/verify?type=email&code=${event.request.codeParameter}">clicking here</a>.<p>Thank you,<br/>Equalify<div style="display:none"><a>${event.request.codeParameter}</a><a>${event.request.codeParameter}</a></div>` });

    return event;
}