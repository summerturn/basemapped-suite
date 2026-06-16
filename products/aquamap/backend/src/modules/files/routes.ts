import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';
import { authenticateHook } from '../auth/routes.js';

const s3 = new S3Client({
  endpoint: `http://${env.MINIO_ENDPOINT}`,
  region: 'us-east-1',
  credentials: { accessKeyId: env.MINIO_ACCESS_KEY, secretAccessKey: env.MINIO_SECRET_KEY },
  forcePathStyle: true,
});

export async function fileRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticateHook);

  app.post('/upload-url', async (request) => {
    const { userId } = request.user as any;
    const schema = z.object({ filename: z.string(), contentType: z.string() });
    const { filename, contentType } = schema.parse(request.body);
    const key = `uploads/${userId}/${Date.now()}-${filename}`;
    const command = new PutObjectCommand({ Bucket: 'aquamap-photos', Key: key, ContentType: contentType });
    const url = await getSignedUrl(s3, command, { expiresIn: 300 });
    return { success: true, data: { uploadUrl: url, key } };
  });

  app.post('/download-url', async (request) => {
    const schema = z.object({ key: z.string() });
    const { key } = schema.parse(request.body);
    const command = new GetObjectCommand({ Bucket: 'aquamap-photos', Key: key });
    const url = await getSignedUrl(s3, command, { expiresIn: 300 });
    return { success: true, data: { downloadUrl: url } };
  });
}
