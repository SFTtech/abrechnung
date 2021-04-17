import React, {Component} from "react";
import PropTypes from "prop-types";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPencilAlt} from "@fortawesome/free-solid-svg-icons/faPencilAlt";
import {faCheck} from "@fortawesome/free-solid-svg-icons/faCheck";
import {faTimes} from "@fortawesome/free-solid-svg-icons/faTimes";
import {InputGroup} from "react-bootstrap";
import Button from "react-bootstrap/cjs/Button";

import "./EditableAccountSelect.css";
import AccountSelect from "./AccountSelect";

class EditableAccountSelect extends Component {
    static propTypes = {
        value: PropTypes.string.isRequired,
        onChange: PropTypes.func.isRequired,
        group: PropTypes.object.isRequired,
    };

    state = {
        value: null,
        editing: false
    };

    onSave = () => {
        this.props.onChange(this.state.value);
        this.setState({value: null, editing: false});
    }

    render() {
        if (this.state.editing) {
            return (
                <InputGroup>
                    <AccountSelect
                        group={this.props.group}
                        value={this.state.value}
                        onChange={(value) => this.setState({value: value})}
                    />
                    <InputGroup.Append>
                        <Button
                            variant={"outline-success"}
                            onClick={this.onSave}
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
                <span className={"text-field"}>{this.props.value}</span>
                <button
                    className="btn text-info p-0"
                    onClick={() => this.setState({value: this.props.value, editing: true})}
                >
                    <FontAwesomeIcon icon={faPencilAlt}/>
                </button>
            </>
        );
    }
}

export default EditableAccountSelect;
