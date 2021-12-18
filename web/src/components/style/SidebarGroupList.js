import {useRecoilValue} from "recoil";
import {Divider, ListItemText} from "@mui/material";
import {groupList} from "../../recoil/groups";
import ListItemLink from "./ListItemLink";

export default function SidebarGroupList({group = null}) {
    const groups = useRecoilValue(groupList);

    return (
        <>
            {groups.map(it => (
                <ListItemLink to={`/groups/${it.id}`} selected={group && group.id === it.id}>
                    <ListItemText primary={it.name}/>
                </ListItemLink>
            ))}
            <Divider/>
        </>
    )
}