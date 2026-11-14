<%inherit file="base.txt.mako"/>
<%def name="subject()">Confirm user account</%def>
it looks like you are attempting to create a user account.

To complete your registration, visit

${base_url}/confirm-registration/${token}

Your request will time out at ${valid_until | n,expiry}.
If you do not want to create a user account, just ignore this email.
