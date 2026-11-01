import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFound } from './middleware/errors';
import { healthRouter } from './routes/health';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);

app.use(notFound);
app.use(errorHandler);
