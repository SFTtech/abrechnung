<%inherit file="base.txt.mako"/>
<%def name="subject()">Reset password</%def>
it looks like you forgot your password; how embarrasing.

To set a new one, visit

${base_url}/confirm-password-recovery/${token}

Your request will time out at ${valid_until | n,expiry}.
If you do not want to reset your password, just ignore this email.
