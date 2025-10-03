# 🚀 YouApp API

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  A scalable <a href="http://nodejs.org" target="_blank">Node.js</a> API built with <a href="http://nestjs.com/">NestJS</a>, using MongoDB, RabbitMQ, and JWT authentication.
</p>

<p align="center">
<a href="https://github.com/your-username/youapp-api/actions" target="_blank"><img src="https://img.shields.io/github/actions/workflow/status/your-username/youapp-api/docker-build.yml?branch=master" alt="CI/CD Status" /></a>
<a href="https://www.npmjs.com/" target="_blank"><img src="https://img.shields.io/badge/Powered%20by-NestJS-red" alt="NestJS" /></a>
<a href="https://www.mongodb.com/" target="_blank"><img src="https://img.shields.io/badge/Database-MongoDB-green" alt="MongoDB" /></a>
<a href="https://www.rabbitmq.com/" target="_blank"><img src="https://img.shields.io/badge/Messaging-RabbitMQ-orange" alt="RabbitMQ"/></a>
<a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License"/></a>
</p>

---

## 📖 Description

**YouApp API** adalah backend service yang dibangun dengan NestJS. Project ini mendukung:

* 🔐 **Authentication** dengan JWT
* 🗄 **MongoDB** untuk database
* 📨 **RabbitMQ** untuk message broker (notifikasi & chat)
* 🐳 **Docker support** untuk containerization
* ⚡ **CI/CD with GitHub Actions**

---

## ⚙️ Project setup

```bash
# install dependencies
$ yarn install
```

---

## 🏃 Run the project

```bash
# development
$ yarn start

# watch mode
$ yarn start:dev

# production mode
$ yarn start:prod
```

---

## 🧪 Testing

```bash
# unit tests
$ yarn test

# e2e tests
$ yarn test:e2e

# coverage
$ yarn test:cov
```

---

## 🐳 Docker

### Build & Run

```bash
# build image
$ docker build -t youapp-api .

# run container
$ docker run -d -p 3000:3000 --env-file .env youapp-api
```

### Docker Compose

Gunakan `docker-compose.yml` untuk menjalankan bersama service lain (MongoDB, RabbitMQ, dsb):

```bash
$ docker-compose up -d
```

---

## 🔑 Environment Variables

Buat file `.env` berdasarkan secrets lo:

```env
DATABASE_URL=mongodb://<username>:<password>@<host>:<port>/<dbname>
JWT_SECRET=your_jwt_secret
RABBITMQ_URL=amqp://<username>:<password>@<host>:<port>/<vhost>
```

---

## 🚀 Deployment

Project ini di-build & push ke **GitHub Container Registry (GHCR)** via GitHub Actions.

Image:

```
ghcr.io/<your-username>/youapp-api:latest
```

---

## 👨‍💻 Author

* Developer: **Nanda Safiq Alfiasyah**
* Website: [NestJS](https://nestjs.com)

---

## 📜 License

This project is [MIT licensed](LICENSE).