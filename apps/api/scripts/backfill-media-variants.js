/* One-off backfill: generate web/thumb variants for Media rows uploaded before variants existed.
 * Run inside the api container: node /tmp/backfill-media-variants.js
 * Idempotent: only touches rows with thumbUrl IS NULL. */
const { PrismaClient } = require('@prisma/client');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const RASTER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'];
const SPECS = [
  { suffix: 'web', size: 1920, quality: 80 },
  { suffix: 'thumb', size: 640, quality: 75 },
];

const bucket = process.env.S3_BUCKET_NAME || 'pandoroom-uploads';
const endpoint = process.env.S3_ENDPOINT || undefined;
const s3 = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: !!endpoint,
});

const prisma = new PrismaClient();

function fileUrl(key) {
  return endpoint ? `${endpoint}/${bucket}/${key}` : `https://${bucket}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

function keyFromUrl(url) {
  const prefix = `${endpoint}/${bucket}/`;
  return url.startsWith(prefix) ? url.substring(prefix.length) : null;
}

async function getBuffer(key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function putBuffer(key, buffer, contentType) {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }));
}

async function buildVariants(buffer, mimeType) {
  const isPng = mimeType === 'image/png';
  const ext = isPng ? '.png' : '.jpg';
  const outMime = isPng ? 'image/png' : 'image/jpeg';
  const out = [];
  for (const spec of SPECS) {
    let pipeline = sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({ width: spec.size, height: spec.size, fit: 'inside', withoutEnlargement: true });
    pipeline = isPng
      ? pipeline.png({ compressionLevel: 9, palette: true })
      : pipeline.flatten({ background: '#ffffff' }).jpeg({ quality: spec.quality, mozjpeg: true });
    out.push({ suffix: spec.suffix, ext, mimeType: outMime, buffer: await pipeline.toBuffer() });
  }
  return out;
}

async function main() {
  const rows = await prisma.media.findMany({
    where: { mimeType: { in: RASTER_TYPES }, thumbUrl: null },
    select: { id: true, url: true, mimeType: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`backfill: ${rows.length} rows to process`);

  let done = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const key = keyFromUrl(row.url);
      if (!key) {
        console.log(`skip ${row.id}: cannot extract key from ${row.url}`);
        failed += 1;
        continue;
      }
      const original = await getBuffer(key);
      const variants = await buildVariants(original, row.mimeType);
      const urls = {};
      for (const variant of variants) {
        const variantKey = `uploads/${row.id}_${variant.suffix}${variant.ext}`;
        await putBuffer(variantKey, variant.buffer, variant.mimeType);
        urls[variant.suffix === 'web' ? 'webUrl' : 'thumbUrl'] = fileUrl(variantKey);
      }
      await prisma.media.update({ where: { id: row.id }, data: urls });
      done += 1;
      if (done % 25 === 0) console.log(`progress: ${done}/${rows.length}`);
    } catch (error) {
      failed += 1;
      console.error(`fail ${row.id}: ${error.message}`);
    }
  }
  console.log(`backfill finished: done=${done} failed=${failed} total=${rows.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
