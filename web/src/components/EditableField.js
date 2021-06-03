import React, {useState} from "react";
import Form from "react-bootstrap/cjs/Form";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPencilAlt} from "@fortawesome/free-solid-svg-icons/faPencilAlt";
import {faCheck} from "@fortawesome/free-solid-svg-icons/faCheck";
import {faTimes} from "@fortawesome/free-solid-svg-icons/faTimes";
import {InputGroup} from "react-bootstrap";
import Button from "react-bootstrap/cjs/Button";

import "./EditableField.css";

export default function EditableField({value, onChange, type = "text"}) {
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
                {type === "textarea" ? (
                    <Form.Control
                        as={"textarea"}
                        value={currentValue}
                        onChange={event => setValue(event.target.value)}
                    />
                ) : (
                    <Form.Control
                        value={currentValue}
                        onChange={event => setValue(event.target.value)}
                    />
                )}
                <InputGroup.Append>
                    <Button
                        variant={"outline-success"}
                        onClick={onSave}
                    >
                        <FontAwesomeIcon icon={faCheck}/>
                    </Button>
                </InputGroup.Append>
                <InputGroup.Append>
                    <button
                        className="btn btn-outline-danger"
                        onClick={() => setEditing(false)}
                    >
                        <FontAwesomeIcon icon={faTimes}/>
                    </button>
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
