import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {DEFAULT_MODEL} from './config';

export const ai = genkit({
  plugins: [googleAI()],
  model: DEFAULT_MODEL, // Use the model specified in config which reads from .env file
});
