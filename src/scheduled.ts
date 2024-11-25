import { pollEveryMinute, runEveryFifteenMinutes, runEveryMinute } from '#src/scheduled/index';

export const scheduled = async (event) => {
    if (event.path.endsWith('/runEveryMinute')) {
        return runEveryMinute();
    }
    else if (event.path.endsWith('/runEveryFifteenMinutes')) {
        return runEveryFifteenMinutes();
    }
    else if (event.path.endsWith('/pollEveryMinute')) {
        return pollEveryMinute();
    }
}
