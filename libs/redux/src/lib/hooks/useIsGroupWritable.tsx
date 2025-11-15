import { useGroup } from "../groups";
import { useCurrentUserPermissions } from "../selectors";

export const useIsGroupWritable = (groupId: number) => {
    const permissions = useCurrentUserPermissions(groupId);
    const group = useGroup(groupId);

    if (!permissions || !group) {
        return false;
    }

    return permissions.can_write && !group.archived;
};
