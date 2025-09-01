import type {
    IBinaryData,
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { UTApi, UTFile } from 'uploadthing/server';

export class UploadThing implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'UploadThing',
        name: 'uploadThing',
        group: ['transform'],
        version: 1,
        description: 'Upload a binary property to UploadThing',
        defaults: {
            name: 'UploadThing',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        usableAsTool: true,
        credentials: [
            {
                name: 'uploadThingApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Binary Property',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'data',
                description: 'Name of the binary property to upload from the input item',
            },
            {
                displayName: 'File Name Override',
                name: 'fileName',
                type: 'string',
                default: '',
                description: 'Optional filename to use instead of the input binary file name',
            },
            {
                displayName: 'ACL',
                name: 'acl',
                type: 'options',
                options: [
                    { name: 'Public Read', value: 'public-read' },
                    { name: 'Private', value: 'private' },
                ],
                default: 'public-read',
            },
            {
                displayName: 'Content Disposition',
                name: 'contentDisposition',
                type: 'options',
                options: [
                    { name: 'Inline', value: 'inline' },
                    { name: 'Attachment', value: 'attachment' },
                ],
                default: 'inline',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnItems: INodeExecutionData[] = [];

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const propertyName = this.getNodeParameter('binaryPropertyName', itemIndex, 'data') as string;
                const acl = this.getNodeParameter('acl', itemIndex, 'public-read') as string;
                const contentDisposition = this.getNodeParameter('contentDisposition', itemIndex, 'inline') as string;
                const overrideName = this.getNodeParameter('fileName', itemIndex, '') as string;

                const binaryData = items[itemIndex].binary?.[propertyName] as IBinaryData | undefined;
                if (!binaryData) {
                    throw new NodeOperationError(this.getNode(), `Binary property "${propertyName}" not found`, { itemIndex });
                }

                const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, propertyName);
                const fileName = overrideName || binaryData.fileName || 'file';

                const uploadThingCreds = await this.getCredentials('uploadThingApi');
                const utapi = new UTApi({ token: String(uploadThingCreds.token) });
                const utFile = new UTFile([buffer], fileName);

                const uploaded: any = await utapi.uploadFiles(utFile, {
                    contentDisposition: contentDisposition as 'inline' | 'attachment',
                    acl: acl as 'public-read' | 'private',
                } as any);

                const uploadData = Array.isArray(uploaded) ? uploaded[0]?.data : uploaded?.data;
                if (!uploadData) {
                    const uploadErr = Array.isArray(uploaded) ? uploaded[0]?.error : uploaded?.error;
                    const message = uploadErr?.message || 'UploadThing upload failed';
                    throw new NodeOperationError(this.getNode(), message, { itemIndex });
                }

                returnItems.push({
                    json: {
                        fileKey: uploadData.key,
                        url: uploadData.url,
                        name: uploadData.name,
                        sizeBytes: uploadData.size,
                        acl,
                        contentDisposition,
                        binaryProperty: propertyName,
                    },
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnItems.push({ json: items[itemIndex].json, error, pairedItem: itemIndex });
                } else {
                    if ((error as any).context) {
                        (error as any).context.itemIndex = itemIndex;
                        throw error;
                    }
                    throw new NodeOperationError(this.getNode(), error, { itemIndex });
                }
            }
        }

        return [returnItems];
    }
}


