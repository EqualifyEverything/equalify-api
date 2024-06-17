import { stripHtml } from 'string-strip-html';
import { openai } from '#src/utils';

export const help = async ({ request, reply }) => {
    const { reportId, messageId, dequeURL, message: accessibilityIssueToFix, codeSnippet: originalCodeSnippet, sourceUrl, status } = request.body;
    const accessibilityDocumentation = stripHtml(await (await fetch(dequeURL)).text()).result;
    const originalCode = await (await fetch(sourceUrl)).text();

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
                        diff_view: {
                            type: 'string',
                            description: 'A diff view of the old and new code with character and line positions listed on the left',
                        },
                    },
                    required: ['suggested_code', 'how_to_implement', 'diff_view'],
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