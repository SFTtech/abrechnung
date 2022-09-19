import { makeGet } from "./index";
import { Group } from "@abrechnung/types";

export async function fetchGroups(): Promise<Group[]> {
    return await makeGet("/groups");
}

export async function fetchGroup(groupID): Promise<Group> {
    return await makeGet(`/groups/${groupID}`);
}
