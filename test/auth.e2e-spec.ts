import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Auth Login E2E", () => {
  let app: INestApplication;

  const userData = {
    email: "user@example.com",
    username: "testuser",
    password: "Password123!",
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();

    const res = await request(app.getHttpServer())
      .post("/api/register")
      .send(userData);

    if (![201, 409].includes(res.status)) {
      throw new Error(`Unexpected status: ${res.status}`);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it("should login successfully", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/login")
      .send({
        email: userData.email,
        password: userData.password,
      })
      .expect(200);

    expect(response.body).toHaveProperty("access_token");
    expect(typeof response.body.access_token).toBe("string");
  });

  it("should fail with wrong password", async () => {
    await request(app.getHttpServer())
      .post("/api/login")
      .send({
        email: userData.email,
        password: "wrongpassword",
      })
      .expect(401);
  });

  it("should fail with non-existent email", async () => {
    await request(app.getHttpServer())
      .post("/api/login")
      .send({
        email: "notfound@example.com",
        password: "Password123!",
      })
      .expect(401);
  });
});
