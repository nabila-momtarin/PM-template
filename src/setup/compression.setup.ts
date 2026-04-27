import { INestApplication } from '@nestjs/common';
import compression from 'compression';

export function setupCompression(app: INestApplication): void {
  app.use(compression());
}


//data transfer er time e network er moddhe res size komay, but client er kache actual size and data e jay