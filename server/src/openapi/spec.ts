import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Video Editor API',
      version: '1.0.0',
      description:
        'REST API for the browser-based non-linear video editor. Handles project persistence, media asset management, FFmpeg processing, and export orchestration.',
      contact: { name: 'Video Editor' },
    },
    servers: [{ url: 'http://localhost:4000', description: 'Development server' }],
    tags: [
      { name: 'Health',    description: 'Service health check' },
      { name: 'Projects',  description: 'Project CRUD and persistence' },
      { name: 'Assets',    description: 'Media asset upload, probe, and management' },
      { name: 'Export',    description: 'Remotion-powered video export pipeline' },
    ],
    components: {
      schemas: {
        ProjectSettings: {
          type: 'object',
          required: ['width', 'height', 'fps', 'backgroundColor', 'aspectRatio'],
          properties: {
            width:           { type: 'integer', example: 1920 },
            height:          { type: 'integer', example: 1080 },
            fps:             { type: 'integer', example: 30 },
            backgroundColor: { type: 'string',  example: '#000000' },
            aspectRatio:     { type: 'string',  example: '16:9' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id:        { type: 'string', example: 'cuid_abc123' },
            name:      { type: 'string', example: 'My First Video' },
            settings:  { $ref: '#/components/schemas/ProjectSettings' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Track: {
          type: 'object',
          properties: {
            id:        { type: 'string' },
            projectId: { type: 'string' },
            type:      { type: 'string', enum: ['video', 'audio', 'overlay'] },
            name:      { type: 'string', example: 'Video 1' },
            order:     { type: 'integer' },
            locked:    { type: 'boolean' },
            muted:     { type: 'boolean' },
            collapsed: { type: 'boolean' },
          },
        },
        Clip: {
          type: 'object',
          properties: {
            id:          { type: 'string' },
            trackId:     { type: 'string' },
            type:        { type: 'string', enum: ['video', 'audio', 'image', 'text'] },
            startTimeMs: { type: 'number', example: 0 },
            durationMs:  { type: 'number', example: 5000 },
            trimStartMs: { type: 'number', example: 0 },
            trimEndMs:   { type: 'number', example: 5000 },
            transform:   { $ref: '#/components/schemas/Transform' },
            animations:  { type: 'array', items: { type: 'object' } },
            name:        { type: 'string' },
            locked:      { type: 'boolean' },
            visible:     { type: 'boolean' },
            properties:  { type: 'object', description: 'Type-specific properties (volume, content, assetId, etc.)' },
          },
        },
        Transform: {
          type: 'object',
          required: ['x', 'y', 'width', 'height', 'rotation', 'opacity', 'scaleX', 'scaleY'],
          properties: {
            x:        { type: 'number', description: '0-1 normalized horizontal position', example: 0.5 },
            y:        { type: 'number', description: '0-1 normalized vertical position',   example: 0.5 },
            width:    { type: 'number', example: 1 },
            height:   { type: 'number', example: 1 },
            rotation: { type: 'number', description: 'Degrees', example: 0 },
            opacity:  { type: 'number', description: '0-1', example: 1 },
            scaleX:   { type: 'number', example: 1 },
            scaleY:   { type: 'number', example: 1 },
          },
        },
        Asset: {
          type: 'object',
          properties: {
            id:            { type: 'string' },
            projectId:     { type: 'string' },
            name:          { type: 'string', example: 'intro.mp4' },
            type:          { type: 'string', enum: ['video', 'audio', 'image'] },
            mimeType:      { type: 'string', example: 'video/mp4' },
            serveUrl:      { type: 'string', example: '/uploads/uuid.mp4' },
            fileSizeBytes: { type: 'string', description: 'BigInt serialized as string', example: '104857600' },
            durationMs:    { type: 'number', nullable: true, example: 30000 },
            width:         { type: 'integer', nullable: true, example: 1920 },
            height:        { type: 'integer', nullable: true, example: 1080 },
            fps:           { type: 'number', nullable: true, example: 30 },
            thumbnails:    { type: 'array', items: { type: 'string' }, description: 'Base64 JPEG data URLs' },
            createdAt:     { type: 'string', format: 'date-time' },
          },
        },
        ExportOptions: {
          type: 'object',
          required: ['format', 'resolution', 'fps', 'quality', 'includeAudio', 'startTimeMs', 'endTimeMs'],
          properties: {
            format:       { type: 'string', enum: ['mp4', 'webm', 'gif'], example: 'mp4' },
            resolution:   { type: 'string', enum: ['480p', '720p', '1080p', '4k'], example: '1080p' },
            fps:          { type: 'integer', example: 30 },
            quality:      { type: 'number', description: '0-1 (0 = best)', example: 0.8 },
            includeAudio: { type: 'boolean', example: true },
            startTimeMs:  { type: 'number', example: 0 },
            endTimeMs:    { type: 'number', example: 30000 },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Resource not found' },
          },
        },
      },
    },
  },
  // Scan all module route files for JSDoc @openapi annotations
  apis: ['./src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
