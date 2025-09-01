import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import OpenAI from 'openai';
import { UTApi, UTFile } from 'uploadthing/server';

export class OpenAiUploadThing implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenAI → UploadThing',
		name: 'openAiUploadThing',
		group: ['transform'],
		version: 1,
		description: 'Generate an image with OpenAI and upload to UploadThing',
		defaults: {
			name: 'OpenAI → UploadThing',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'uploadThingApi',
				required: true,
			},
			{
				name: 'openAiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				placeholder: 'A futuristic cityscape at sunset...',
			},
			{
				displayName: 'Size',
				name: 'size',
				type: 'options',
				options: [
					{ name: '1024×1024', value: '1024x1024' },
					{ name: '1536×1024', value: '1536x1024' },
					{ name: '1024×1536', value: '1024x1536' },
				],
				default: '1024x1024',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: 'generated.png',
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
				const prompt = this.getNodeParameter('prompt', itemIndex, '') as string;
				const size = this.getNodeParameter('size', itemIndex, '1024x1024') as string;
				const fileName = this.getNodeParameter('fileName', itemIndex, 'generated.png') as string;
				const acl = this.getNodeParameter('acl', itemIndex, 'public-read') as string;
				const contentDisposition = this.getNodeParameter(
					'contentDisposition',
					itemIndex,
					'inline',
				) as string;

				if (!prompt) {
					throw new NodeOperationError(this.getNode(), 'Prompt is required', { itemIndex });
				}

				const openAiCreds = await this.getCredentials('openAiApi');
				const uploadThingCreds = await this.getCredentials('uploadThingApi');

				// 1) Generate image with OpenAI SDK
				const openai = new OpenAI({ apiKey: String(openAiCreds.apiKey) });
				const typedSize = size as '1024x1024' | 'auto' | '1536x1024' | '1024x1536';
				const imageResp = await openai.images.generate({
					model: 'gpt-image-1',
					prompt,
					size: typedSize
				});
				const b64 = imageResp?.data?.[0]?.b64_json as string | undefined;
				if (!b64) {
					throw new NodeOperationError(this.getNode(), 'OpenAI did not return image data', {
						itemIndex,
					});
				}

				const imageBuffer = Buffer.from(b64, 'base64');

				// 2) Upload to UploadThing using UTApi
				const utapi = new UTApi({ token: String(uploadThingCreds.token) });
				const utFile = new UTFile([imageBuffer], fileName);
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
						prompt,
						size,
						fileName,
						acl,
						contentDisposition,
						fileKey: uploadData.key,
						url: uploadData.url,
						name: uploadData.name,
						sizeBytes: uploadData.size,
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
