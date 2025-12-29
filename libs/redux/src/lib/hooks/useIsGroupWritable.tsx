import { useGroup } from "../groups";

export const useIsGroupWritable = (groupId: number) => {
    const group = useGroup(groupId);

    if (!group) {
        return false;
    }

    return group.can_write && !group.archived;
};
