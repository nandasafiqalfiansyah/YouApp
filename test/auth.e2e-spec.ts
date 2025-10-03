import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Auth E2E Tests", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/register", () => {
    it("should register user successfully", async () => {
      const registerData = {
        email: "test1@example.com",
        username: "testuser1",
        password: "Password123!",
      };

      const response = await request(app.getHttpServer())
        .post("/api/register")
        .send(registerData)
        .expect(201);

      expect(response.body).toHaveProperty("message");
      expect(response.body.data).toHaveProperty("access_token");
    });

    it("should fail with invalid email", async () => {
      const registerData = {
        email: "invalid-email",
        username: "testuser2",
        password: "Password123!",
      };

      await request(app.getHttpServer())
        .post("/api/register")
        .send(registerData)
        .expect(400);
    });
  });

  describe("POST /api/login", () => {
    const userData = {
      email: "test@example.com1",
      username: "testuser1",
      password: "Password123!",
    };

    beforeAll(async () => {
      await request(app.getHttpServer()).post("/api/register").send(userData);
    });

    it("should login successfully", async () => {
      const loginData = {
        email: userData.email,
        password: userData.password,
      };

      const response = await request(app.getHttpServer())
        .post("/api/login")
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty("message", "Login successful");
      expect(response.body.data).toHaveProperty("access_token");
    });

    it("should fail with wrong password", async () => {
      const loginData = {
        email: userData.email,
        password: "wrongpassword",
      };

      await request(app.getHttpServer())
        .post("/api/login")
        .send(loginData)
        .expect(401);
    });
  });
});
