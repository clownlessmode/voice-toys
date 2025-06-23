import { describe, it } from "vitest";
import {
  S3Client,
  ListBucketsCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

describe("Selectel Debug Test", () => {
  it("should check S3 connection and bucket access", async () => {
    const client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });

    console.log("Testing S3 connection...");
    console.log("Endpoint:", process.env.S3_ENDPOINT);
    console.log("Region:", process.env.S3_REGION);
    console.log("Bucket:", process.env.S3_BUCKET_NAME);

    try {
      // Пробуем получить список bucket'ов
      console.log("\n1. Trying to list buckets...");
      const listCommand = new ListBucketsCommand({});
      const listResult = await client.send(listCommand);

      console.log("Available buckets:");
      listResult.Buckets?.forEach((bucket) => {
        console.log(`  - ${bucket.Name} (created: ${bucket.CreationDate})`);
      });

      // Проверяем доступ к нашему bucket'у
      console.log(
        `\n2. Checking access to bucket: ${process.env.S3_BUCKET_NAME}`
      );
      const headCommand = new HeadBucketCommand({
        Bucket: process.env.S3_BUCKET_NAME,
      });

      await client.send(headCommand);
      console.log("✓ Bucket access OK");
    } catch (error) {
      console.error("S3 connection error:", error);

      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }

      // Не падаем тест, просто выводим информацию
      console.log("\nPossible issues:");
      console.log("1. Check if bucket name is correct");
      console.log("2. Check if access keys have proper permissions");
      console.log("3. Check if bucket exists and is accessible");
    }
  });

  it("should test different bucket names", async () => {
    const possibleBucketNames = [
      "voice-toys",
      "voice-toys.s3.ru-7.storage.selcloud.ru",
      process.env.S3_BUCKET_NAME,
    ];

    const client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });

    console.log("Testing different bucket names...");

    for (const bucketName of possibleBucketNames) {
      if (!bucketName) continue;

      try {
        console.log(`\nTesting bucket: "${bucketName}"`);
        const headCommand = new HeadBucketCommand({ Bucket: bucketName });
        await client.send(headCommand);
        console.log(`✓ "${bucketName}" - ACCESS OK`);
      } catch (error) {
        console.log(`✗ "${bucketName}" - ACCESS DENIED`);
        if (error instanceof Error) {
          console.log(`  Error: ${error.message}`);
        }
      }
    }
  });
});
