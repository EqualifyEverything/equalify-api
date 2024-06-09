import { processScans } from './scheduled/index.js';

export const scheduled = async (event) => {
    if (event.internalPath.endsWith('/processScans')) {
        return processScans();
    }
}
