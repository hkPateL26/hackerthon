import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API metadata', () => {
      const res = appController.root();
      expect(res.message).toBe('Gujarat Police CCTV Analytics API');
      expect(res.version).toBe('1.0.0');
      expect(res.docs).toBe('/api/docs');
      expect(res.health).toBe('/api/health');
    });
  });
});
