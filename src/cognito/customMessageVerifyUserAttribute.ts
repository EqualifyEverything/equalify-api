export const customMessageVerifyUserAttribute = async (event) => {
    event.response.smsMessage = `Equalify: Verify your phone number by visting "https://${process.env.STAGING ? 'equalify.dev' : 'dashboard.equalify.app'}/verify?type=phone_number&code=${event.request.codeParameter}"`;

    return event;
}