import {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class UploadThingApi implements ICredentialType {
    name = 'uploadThingApi';
    displayName = 'UploadThing API';
    documentationUrl = 'https://docs.uploadthing.com/api-reference/ut-api';

    properties: INodeProperties[] = [
        {
            displayName: 'Token',
            name: 'token',
            type: 'string',
            default: '',
            typeOptions: {
                password: true,
            },
        },
        {
            displayName: 'API Base URL',
            name: 'apiUrl',
            type: 'string',
            default: 'https://api.uploadthing.com',
        },
        {
            displayName: 'ACL',
            name: 'defaultAcl',
            type: 'options',
            options: [
                { name: 'Public Read', value: 'public-read' },
                { name: 'Private', value: 'private' },
            ],
            default: 'public-read',
        },
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                'x-uploadthing-api-key': '={{$credentials.token}}',
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            baseURL: '={{$credentials.apiUrl}}',
            url: '/v7/getAppInfo',
            method: 'POST',
        },
    };
}


