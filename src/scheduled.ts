import { runEveryFiveMinutes, runEveryMinute } from '#src/scheduled/index';

export const scheduled = async (event) => {
    if (event.path.endsWith('/runEveryMinute')) {
        return runEveryMinute();
    }
    else if (event.path.endsWith('/runEveryFiveMinutes')) {
        return runEveryFiveMinutes();
    }
}
