import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { join } from "path";
import * as express from "express";
import * as serveIndex from "serve-index";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:4200",
    credentials: true,
  });

  // Serve mod files with directory listing and download headers
  const modPath = join(__dirname, '..', 'mod');
  app.use('/mod', express.static(modPath, {
    setHeaders: (res) => {
      res.set('Content-Type', 'application/octet-stream');
    },
  }));
  app.use('/mod', serveIndex(modPath, { icons: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(3000);
  console.log("Backend is running on http://localhost:3000");
}
bootstrap();
