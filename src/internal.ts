import { processScans } from '#src/internal/index';

export const internal = async (event) => {
    if (event.path.endsWith('/processScans')) {
        return processScans(event);
    }
}
