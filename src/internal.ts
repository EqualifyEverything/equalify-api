import { fixMessageNodes, fixRows, migrateMessagesAndTags, normalizeNodesForUser, processScans } from '#src/internal/index';

export const internal = async (event) => {
    if (event.path.endsWith('/processScans')) {
        return processScans(event);
    }
    else if (event.path.endsWith('/migrateMessagesAndTags')) {
        return migrateMessagesAndTags(event);
    }
    else if (event.path.endsWith('/normalizeNodesForUser')) {
        return normalizeNodesForUser(event);
    }
    else if (event.path.endsWith('/fixRows')) {
        return fixRows(event);
    }
    else if (event.path.endsWith('/fixMessageNodes')) {
        return fixMessageNodes(event);
    }
}
