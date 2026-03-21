const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME;

// Map document types to S3 folder names
const TYPE_FOLDERS = {
  purchase_order: 'purchase-orders',
  delivery_order: 'delivery-orders',
  invoice: 'invoices',
  bank_statement: 'bank-statements',
  settlement_statement: 'settlements',
  exchange_receipt: 'exchange-receipts',
};

function buildS3Key(companyShortCode, documentType, fileName) {
  const folder = TYPE_FOLDERS[documentType] || 'other';
  const date = new Date().toISOString().slice(0, 7); // YYYY-MM
  const timestamp = Date.now();
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  return `${companyShortCode}/${folder}/${date}/${base}-${timestamp}${ext}`;
}

async function uploadFile(buffer, key, mimeType) {
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));
  return key;
}

async function getSignedDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
}

async function deleteFile(key) {
  await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

module.exports = { uploadFile, getSignedDownloadUrl, deleteFile, buildS3Key };
