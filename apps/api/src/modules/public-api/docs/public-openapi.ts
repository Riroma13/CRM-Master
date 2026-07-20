import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export function generatePublicOpenApi(app: INestApplication): object {
  const config = new DocumentBuilder()
    .setTitle('CRM-Master Public API')
    .setDescription('Public API for external integrators. All endpoints require a valid API key via Bearer token.')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'Bearer', description: 'crm_live_xxx token' },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [], // filtered by path below
  });

  const publicPaths = Object.keys(document.paths ?? {}).filter((path) =>
    path.startsWith('/api/v1/public/'),
  );

  const filteredPaths: Record<string, unknown> = {};
  for (const path of publicPaths) {
    filteredPaths[path] = document.paths![path];
  }

  return {
    ...document,
    paths: filteredPaths,
  };
}
