import { postConfirmationConfirmSignUp, postConfirmationConfirmForgotPassword, customMessageSignUp, customMessageResendCode, customMessageForgotPassword, customMessageVerifyUserAttribute, customMessageUpdateUserAttribute } from '#src/cognito/index';

export const cognito = async (event) => {
    if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
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
