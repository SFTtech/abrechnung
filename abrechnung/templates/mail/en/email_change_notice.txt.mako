<%inherit file="base.txt.mako"/>
<%def name="subject()">Change email</%def>
you want to change your email address

Your current email is: ${old_email}
You want to change it to: ${new_email}

To confirm, see the mail that was sent to the new address.

Your request will time out at ${valid_until | n,expiry}.
If you do not want to change your email, just ignore this email.
