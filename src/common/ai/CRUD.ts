/**
 * This file contains all wrappers, definitions, and other such functionality to allow for the AI to interact directly with CRM models.
 *
 * It defines all the models and operations that can be performed on them.
 */
import {generateText} from "ai";
import {openai} from "@ai-sdk/openai";
import {z} from "zod";

// First the model picks a function to perform that best fits the task.
// Then it is given the schema of the function and fills in the parameters

const modelNames = ['contact', 'activity'] as const;
type ModelName = 'contact' | 'activity'; 

type CRUDModel = {
    name: ModelName;
    displayName: string;
    description: string;
    selectableAttributes: string[]; // For creation, reading, and updating
    searchableAttributes: string[]; // For reading only
    relations: Record<string, {
        name: string;
        many: boolean;
    }>;
}

const models: CRUDModel[] = [
    {
        name: 'contact',
        displayName: 'Contact',
        description: 'A contact in the CRM',
        selectableAttributes: ['name', 'email', 'phone', 'address'],
        searchableAttributes: ['name', 'email', 'phone', 'address'],
        relations: {
            'activities': {
                name: 'activity',
                many: true
            }
        }
    },
    {
        name: 'activity',
        displayName: 'Activity',
        description: 'Any interaction with a contact',
        selectableAttributes: ['name', 'description', 'date', 'type'],
        searchableAttributes: ['date', 'name', 'type'],
        relations: {
            'contacts': {
                name: 'contact',
                many: false
            }
        }
    }
]

// Compiles a list of possible models and actions that can be performed on them
function getPickFunctionPrompt() {
    return models.map(model => {
        return `${model.name.toUpperCase()}:
Description:
    ${model.description}
    
Actions:
    read => Returns a list of ${model.displayName}s, can filter by ${model.searchableAttributes.join(', ')}
    create => Creates a new ${model.displayName}
    update => Updates an existing ${model.displayName}
    delete => Deletes an existing ${model.displayName}       
    
Attributes:
    ${model.selectableAttributes.join(', ')}
    
Relations:
    ${Object.keys(model.relations).map(relation => {
            return `${relation} => ${model.relations[relation].name}${model.relations[relation].many ? '[]' : ''}`}).join('\n\t')}`;
    }).join('\n\n\n');
}

const functionResult = await generateText({
    model: openai('gpt-4o-mini'),
    system: `You are a helpful CRM assistant. You are the interface between the user and their CRM. As part of that, you are able to perform specific actions with the CRM or to converse with the user. Here are the various actions and models you have access to:\n\n${getPickFunctionPrompt()}`,
    prompt: `What did I do with Joe yesterday?`,
    tools: {
        performAction: {
            description: 'Pick what action is applicable to the user\'s request to get a more detailed schema for the action.',
            parameters: z.object({
                model: z.enum(modelNames).describe('The database model to interact with'),
                action: z.enum(['read', 'create', 'update', 'delete']),
            }),
            execute: async ({model, action}) => {
                const date = new Date();
                date.setDate(date.getDate() - 1);

                console.log(model, action);

                const activities = [{
                    name: 'Call Joe',
                    description: 'Called Joe to talk about his investments',
                    date: date.toISOString(),
                    type: 'phone'
                }, {
                    name: 'Meeting with Joe\'s wife',
                    description: 'Meeting with Joe\'s wife* to discuss his investments',
                    date: date.toISOString(),
                    type: 'phone'
                }, {
                    name: 'Email Joe',
                    description: 'Email Joe about his investments',
                    date: date.toISOString(),
                    type: 'email'
                }]
                return `3 ${model}s found:${activities.map(activity => `\n\t${activity.name} (${activity.type}): ${activity.description}`).join('')}\n\tAt ${date}`;
            }
        }
    },
    maxSteps: 2
})

console.log(JSON.stringify({
    text: functionResult.text,
    functionCall: functionResult.toolCalls,
    results: functionResult.toolResults
}, null, 4));