import { Test, TestingModule } from '@nestjs/testing';
import { RemittanceController } from './remittance.controller';

describe('RemittanceController', () => {
  let controller: RemittanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RemittanceController],
    }).compile();

    controller = module.get<RemittanceController>(RemittanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
