import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import relayRoutes from './routes/relay';
import accountRoutes from './routes/account';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/relay', relayRoutes);
app.use('/api/account', accountRoutes);

app.use(errorHandler);

export default app;
