import { stripHtml } from 'string-strip-html';
import { openai } from '#src/utils';

export const suggestIssue = async ({ request, reply }) => {
    const { reportId, messageId, dequeUrl, messageName: accessibilityIssueToFix, codeSnippet: originalCodeSnippet, pageUrl } = request.body;
    const accessibilityDocumentation = stripHtml(await (await fetch(dequeUrl)).text()).result;
    const originalCode = await (await fetch(pageUrl)).text();

    const openaiRawResponse = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        tool_choice: { type: 'function', function: { name: 'suggested_fix' } },
        tools: [{
            type: 'function',
            function: {
                name: 'suggested_fix',
                description: 'Suggest an accessibility fix for the given code snippet and accessibility rule',
                parameters: {
                    type: 'object',
                    description: 'A suggested fix',
                    properties: {
                        suggested_replacement_code: {
                            type: 'string',
                            description: 'The suggested replacement code',
                        },
                        how_to_implement: {
                            type: 'string',
                            description: 'How to implement the suggested code',
                        },
                    },
                    required: ['suggested_replacement_code', 'how_to_implement'],
                },
            }
        }],
        messages: [
            { role: 'system', content: `You are an LLM bot running for Equalify, a platform designed to identify accessibility issues for developers to fix.` },
            {
                role: 'user', content: `Suggest replacement code to fix the accessibility issue identified by Equalify. You may use the accessibility documentation to assist in your resolution:
                \`\`\`json
                ${JSON.stringify({
                    originalCode,
                    originalCodeSnippet,
                    accessibilityIssueToFix,
                    accessibilityDocumentation,
                })}
                \`\`\`
            `},
        ]
    });

    const suggestedFix = JSON.parse(openaiRawResponse.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? '{}');

    return {
        ...suggestedFix,
        originalCode,
    };
}