export const tokenGeneration = async (event) => {
    const debugUserId = ['c@htic.io'].includes(event?.request?.userAttributes?.email) ? event?.request?.clientMetadata?.debugUserId : null;
    event.response = {
        claimsOverrideDetails: {
            claimsToAddOrOverride: {
                "https://hasura.io/jwt/claims": JSON.stringify({
                    "x-hasura-allowed-roles": ["user"],
                    "x-hasura-default-role": "user",
                    "x-hasura-user-id": debugUserId ?? event.request.userAttributes.sub,
                })
            }
        }
    };
    return event;
}