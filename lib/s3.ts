import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function config() {
  const endpoint = process.env.S3_ENDPOINT_URL
  const bucket = process.env.S3_BUCKET
  const accessKeyId = process.env.S3_ACCESS_KEY
  const secretAccessKey = process.env.S3_SECRET_KEY
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('Konfigurasi S3 belum lengkap di .env')
  }
  return { endpoint, bucket, accessKeyId, secretAccessKey }
}

let client: S3Client | null = null

function getClient() {
  if (client) return client
  const { endpoint, accessKeyId, secretAccessKey } = config()
  client = new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
    // Beberapa penyedia S3-compatible menolak checksum otomatis SDK baru.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
  return client
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: config().bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

export async function deleteObject(key: string) {
  await getClient().send(new DeleteObjectCommand({ Bucket: config().bucket, Key: key }))
}

// Link sementara untuk membuka file di bucket privat.
export async function signedDownloadUrl(key: string, expiresInSeconds = 300) {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: config().bucket, Key: key }),
    { expiresIn: expiresInSeconds },
  )
}
