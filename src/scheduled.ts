import { processScans, syncIpRanges, test } from '#src/scheduled/index';

export const scheduled = async (event) => {
    if (event.internalPath.endsWith('/processScans')) {
        return processScans();
    }
    else if (event.internalPath.endsWith('/syncIpRanges')) {
        return syncIpRanges();
    }
    else if (event.internalPath.endsWith('/test')) {
        return test();
    }
}
