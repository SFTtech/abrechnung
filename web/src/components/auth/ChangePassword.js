import React from "react";
import {ws} from "../../websocket";
import {sessionToken} from "../../recoil/auth";
import {Formik} from "formik";
import {useRecoilValue} from "recoil";

export default function ChangePassword() {
    const token = useRecoilValue(sessionToken);

    const validate = (values) => {
        let errors = {};
        if (values.newPassword !== values.newPassword2) {
            errors.newPassword = "Passwords do not match";
        }
        return errors;
    }

    const handleSubmit = (values, {setSubmitting}) => {
        ws.call("change_password", {
            authtoken: token,
            password: values.password,
            new_password: values.newPassword,
        })
            .then((res) => {
                setSubmitting(false);
            })
            .catch((error) => {
                setSubmitting(false);
            });
    };

    return (
        <>
            <Formik validate={validate} initialValues={{password: "", newPassword: "", newPassword2: ""}}
                    onSubmit={handleSubmit}>
                {({values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting}) => (
                    <form onSubmit={handleSubmit}>
                        <input type="hidden" name="remember" value="true"/>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                className="form-control"
                                name="password"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.password}
                            />
                            {errors.password && touched.password && errors.password}
                        </div>

                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                className="form-control"
                                name="newPassword"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.newPassword}
                            />
                            {errors.newPassword && touched.newPassword && errors.newPassword}
                        </div>
                        <div className="form-group">
                            <label>Repeat Password</label>
                            <input
                                type="password"
                                className="form-control"
                                name="newPassword2"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.newPassword2}
                            />
                            {errors.newPassword2 && touched.newPassword2 && errors.newPassword2}
                        </div>

                        <div className="mt-6">
                            <button type="submit"
                                    className="btn btn-success"
                                    disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </form>
                )}
            </Formik>
        </>
    );
}

