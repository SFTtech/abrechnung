import React, {useState} from "react";
import Form from "react-bootstrap/cjs/Form";

import "./AccountSelect.css";
import {useRecoilValue} from "recoil";
import {groupAccounts} from "../../recoil/groups";


export default function AccountSelect({group, placeholder, onChange}) {
    const [value, setValue] = useState("");
    const [selectedAccountID, setSelectedAccountID] = useState(-1);
    const [showDropdown, setShowDropdown] = useState(false);
    const accounts = useRecoilValue(groupAccounts(group.group_id));

    const onUpdate = (event) => {
        setValue(event.target.value);
        setShowDropdown(true);
    };

    const getFilteredAccounts = () => {
        return accounts.filter(account => account.name.includes(value));
    };

    const onFocus = (event) => {

    }

    const onSelect = (accountID) => {
        const account = accounts.find((account) => account.account_id === accountID);
        if (account !== undefined) {
            setSelectedAccountID(account.account_id);
            setValue(account.name);
            setShowDropdown(false);
            onChange(accountID);
        } else {
            setSelectedAccountID(-1);
        }
    };

    // TODO: implement max height for dropdown with scrolling

    return (
        <>
            <Form.Control className={"account-select-container"}
                          type={"text"}
                          as={"input"}
                          onFocus={onFocus()}
                          value={value}
                          placeholder={placeholder}
                          onChange={onUpdate}/>
            {showDropdown ? (
                <div className={"account-select-dropdown shadow"}>
                    <div className={"list-group"}>
                        {getFilteredAccounts().map(account => {
                            return (
                                <div className="list-item" key={account.account_id}
                                     onClick={() => this.onSelect(account.account_id)}>{account.name}</div>
                            );
                        })}
                    </div>
                </div>
            ) : ""}
        </>
    );
}