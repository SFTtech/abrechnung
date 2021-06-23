import React, {useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPencilAlt} from "@fortawesome/free-solid-svg-icons/faPencilAlt";
import {faCheck} from "@fortawesome/free-solid-svg-icons/faCheck";
import {faTimes} from "@fortawesome/free-solid-svg-icons/faTimes";
import {InputGroup} from "react-bootstrap";
import Button from "react-bootstrap/cjs/Button";

import "./EditableAccountSelect.css";
import AccountSelect from "./AccountSelect";

export default function EditableAccountSelect({group, value, onChange}) {
    const [currentValue, setValue] = useState(null);
    const [editing, setEditing] = useState(false);

    const onSave = () => {
        onChange(currentValue);
        setValue(null);
        setEditing(false);
    }

    if (editing) {
        return (
            <InputGroup>
                <AccountSelect
                    group={group}
                    value={currentValue}
                    onChange={value => setValue(value)}
                />
                <InputGroup.Append>
                    <Button
                        variant={"outline-success"}
                        onClick={onSave}
                    >
                        <FontAwesomeIcon icon={faCheck}/>
                    </Button>
                </InputGroup.Append>
                <InputGroup.Append>
                    <Button
                        variant={"outline-danger"}
                        onClick={() => this.setState({name: null, editing: false})}
                    >
                        <FontAwesomeIcon icon={faTimes}/>
                    </Button>
                </InputGroup.Append>
            </InputGroup>
        )
    }
    return (
        <>
            <span className={"text-field"}>{value}</span>
            <button
                className="btn text-info p-0"
                onClick={() => {
                    setValue(value);
                    setEditing(true)
                }}
            >
                <FontAwesomeIcon icon={faPencilAlt}/>
            </button>
        </>
    );
}
