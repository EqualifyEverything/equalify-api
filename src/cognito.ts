import { postConfirmationConfirmSignUp, postConfirmationConfirmForgotPassword, customMessageSignUp, customMessageResendCode, customMessageForgotPassword, customMessageVerifyUserAttribute, customMessageUpdateUserAttribute, tokenGeneration } from '#src/cognito/index';

export const cognito = async (event) => {
    if (['TokenGeneration_Authentication', 'TokenGeneration_RefreshTokens', 'TokenGeneration_AuthenticateDevice'].includes(event.triggerSource)) {
        return tokenGeneration(event);
    }
    else if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
        return postConfirmationConfirmSignUp(event);
    }
    else if (event.triggerSource === 'PostConfirmation_ConfirmForgotPassword') {
        return postConfirmationConfirmForgotPassword(event);
    }
    else if (event.triggerSource === 'CustomMessage_SignUp') {
        return customMessageSignUp(event);
    }
    else if (event.triggerSource === 'CustomMessage_ResendCode') {
        return customMessageResendCode(event);
    }
    else if (event.triggerSource === 'CustomMessage_ForgotPassword') {
        return customMessageForgotPassword(event);
    }
    else if (event.triggerSource === 'CustomMessage_VerifyUserAttribute') {
        return customMessageVerifyUserAttribute(event);
    }
    else if (event.triggerSource === 'CustomMessage_UpdateUserAttribute') {
        return customMessageUpdateUserAttribute(event);
    }
    else {
        return event;
    }
}
