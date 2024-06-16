import { processScans, syncIpRanges } from './scheduled/index.js';

export const scheduled = async (event) => {
    if (event.internalPath.endsWith('/processScans')) {
        return processScans();
    }
    else if (event.internalPath.endsWith('/syncIpRanges')) {
        return syncIpRanges();
    }
}
