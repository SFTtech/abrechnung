import React from "react";
import {ws} from "../../websocket";
import {useRecoilValue} from "recoil";
import {sessionToken} from "../../recoil/auth";
import {Formik} from "formik";

export default function ChangeEmail() {
    const token = useRecoilValue(sessionToken);

    const handleSubmit = (values, {setSubmitting}) => {
        ws.call("request_email_change", {
            authtoken: token,
            password: values.password,
            new_email: values.newEmail,
        })
            .then((res) => {
                setSubmitting(false);
            })
            .catch((error) => {
                setSubmitting(false);
            });
    };

    return (
        <Formik initialValues={{password: "", newEmail: ""}}
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
                        <label>New E-Mail</label>
                        <input
                            type="email"
                            className="form-control"
                            name="New E-Mail"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.newEmail}
                        />
                        {errors.newEmail && touched.newEmail && errors.newEmail}
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
    );
}

