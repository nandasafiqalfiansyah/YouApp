import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";

let app: INestApplication;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [],
  }).compile();

  app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix("api");
  await app.init();
});

afterAll(async () => {
  await app.close();
});

export { app };
