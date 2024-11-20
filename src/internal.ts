import { migrateMessagesAndTags, processScans, pollOutstandingScans } from '#src/internal/index';

export const internal = async (event) => {
    if (event.path.endsWith('/processScans')) {
        return processScans(event);
    }
    else if (event.path.endsWith('/migrateMessagesAndTags')) {
        return migrateMessagesAndTags(event);
    }
    else if (event.path.endsWith('/pollOutstandingScans')) {
        return pollOutstandingScans(event);
    }
}
