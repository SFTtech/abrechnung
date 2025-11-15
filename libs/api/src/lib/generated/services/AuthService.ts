/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* oxlint-disable */
import type { Body_get_token } from "../models/Body_get_token";
import type { ChangeEmailPayload } from "../models/ChangeEmailPayload";
import type { ChangePasswordPayload } from "../models/ChangePasswordPayload";
import type { ConfirmEmailChangePayload } from "../models/ConfirmEmailChangePayload";
import type { ConfirmPasswordRecoveryPayload } from "../models/ConfirmPasswordRecoveryPayload";
import type { ConfirmRegistrationPayload } from "../models/ConfirmRegistrationPayload";
import type { DeleteSessionPayload } from "../models/DeleteSessionPayload";
import type { LoginPayload } from "../models/LoginPayload";
import type { RecoverPasswordPayload } from "../models/RecoverPasswordPayload";
import type { RegisterPayload } from "../models/RegisterPayload";
import type { RegisterResponse } from "../models/RegisterResponse";
import type { RenameSessionPayload } from "../models/RenameSessionPayload";
import type { Token } from "../models/Token";
import type { User } from "../models/User";
import type { CancelablePromise } from "../core/CancelablePromise";
import type { BaseHttpRequest } from "../core/BaseHttpRequest";
export class AuthService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * login with username and password
     * @returns Token Successful Response
     * @throws ApiError
     */
    public getToken({ formData }: { formData: Body_get_token }): CancelablePromise<Token> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/auth/token",
            formData: formData,
            mediaType: "application/x-www-form-urlencoded",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * login with username and password
     * @returns Token Successful Response
     * @throws ApiError
     */
    public login({ requestBody }: { requestBody: LoginPayload }): CancelablePromise<Token> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/auth/login",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * sign out of the current session
     * @returns void
     * @throws ApiError
     */
    public logout(): CancelablePromise<void> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/auth/logout",
        });
    }
    /**
     * register a new user
     * @returns RegisterResponse Successful Response
     * @throws ApiError
     */
    public register({ requestBody }: { requestBody: RegisterPayload }): CancelablePromise<RegisterResponse> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/auth/register",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * confirm a pending registration
     * @returns void
     * @throws ApiError
     */
    public confirmRegistration({ requestBody }: { requestBody: ConfirmRegistrationPayload }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/auth/confirm_registration",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * fetch user profile information
     * @returns User Successful Response
     * @throws ApiError
     */
    public getProfile(): CancelablePromise<User> {
        return this.httpRequest.request({
            method: "GET",
            url: "/api/v1/profile",
        });
    }
    /**
     * change password
     * @returns void
     * @throws ApiError
     */
    public changePassword({ requestBody }: { requestBody: ChangePasswordPayload }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/profile/change_password",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * change email
     * @returns void
     * @throws ApiError
     */
    public changeEmail({ requestBody }: { requestBody: ChangeEmailPayload }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/profile/change_email",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * confirm a pending email change
     * @returns void
     * @throws ApiError
     */
    public confirmEmailChange({ requestBody }: { requestBody: ConfirmEmailChangePayload }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/auth/confirm_email_change",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * recover password
     * @returns void
     * @throws ApiError
     */
    public recoverPassword({ requestBody }: { requestBody: RecoverPasswordPayload }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/auth/recover_password",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * confirm a pending password recovery
     * @returns void
     * @throws ApiError
     */
    public confirmPasswordRecovery({
        requestBody,
    }: {
        requestBody: ConfirmPasswordRecoveryPayload;
    }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/auth/confirm_password_recovery",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * delete a given user session
     * @returns void
     * @throws ApiError
     */
    public deleteSession({ requestBody }: { requestBody: DeleteSessionPayload }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/auth/delete_session",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * rename a given user session
     * @returns void
     * @throws ApiError
     */
    public renameSession({ requestBody }: { requestBody: RenameSessionPayload }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/auth/rename_session",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
