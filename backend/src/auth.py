from datetime import datetime, timedelta

import jwt
import requests
from flask import current_app
from jwt.algorithms import RSAAlgorithm

from backend.extensions import db
from backend.models import User

# Cache for Apple's public keys
_apple_public_keys = {}
_apple_keys_expiry = None


def _get_apple_public_keys():
    """Fetch and cache Apple's public keys"""
    global _apple_public_keys, _apple_keys_expiry

    # Return cached keys if they're still valid
    if (
        _apple_public_keys
        and _apple_keys_expiry
        and datetime.now() < _apple_keys_expiry
    ):
        return _apple_public_keys

    # Fetch new keys
    response = requests.get("https://appleid.apple.com/auth/keys")
    response.raise_for_status()

    keys_data = response.json()
    _apple_public_keys = {}

    # Convert each key to PEM format
    for key in keys_data["keys"]:
        _apple_public_keys[key["kid"]] = RSAAlgorithm.from_jwk(key)

    # Cache for 24 hours
    _apple_keys_expiry = datetime.now() + timedelta(hours=24)

    return _apple_public_keys


def validate_apple_token(identity_token: str, bundle_id: str = None) -> dict:
    """
    Validate an Apple identity token and return the user information

    Args:
        identity_token: The identity token from Sign in with Apple

    Returns:
        dict: The validated token payload containing user information

    Raises:
        ValueError: If the token is invalid
    """
    try:
        # First, decode the token without verification to get the key ID
        unverified_headers = jwt.get_unverified_header(identity_token)
        kid = unverified_headers.get("kid")

        if not kid:
            raise ValueError("No key ID found in token header")

        # Get Apple's public keys
        public_keys = _get_apple_public_keys()
        public_key = public_keys.get(kid)

        if not public_key:
            raise ValueError("Invalid key ID")

        # Set up decode options
        decode_options = {
            "verify_sub": True,
            # Don't verify expiration in development to make testing easier
            "verify_exp": not current_app.debug,
        }

        decode_kwargs = {
            "algorithms": ["RS256"],
            "options": decode_options,
        }

        # Only verify audience in production and if bundle ID is configured
        if bundle_id and not current_app.debug:
            decode_kwargs["audience"] = bundle_id
        else:
            # In development, get the audience from the token itself
            unverified_payload = jwt.decode(
                identity_token, options={"verify_signature": False}
            )
            current_app.logger.debug(
                f"Development mode - Token audience: {unverified_payload.get('aud')}"
            )
            # Still verify the token, but use the audience from the token
            if "aud" in unverified_payload:
                decode_kwargs["audience"] = unverified_payload["aud"]

        # Verify and decode the token
        decoded_token = jwt.decode(identity_token, public_key, **decode_kwargs)

        return decoded_token

    except jwt.InvalidTokenError as e:
        current_app.logger.error(f"Token validation error: {str(e)}")
        raise ValueError(f"Invalid token: {str(e)}")
    except requests.RequestException as e:
        current_app.logger.error(f"Failed to fetch Apple public keys: {str(e)}")
        raise ValueError(f"Failed to fetch Apple public keys: {str(e)}")
    except Exception as e:
        current_app.logger.error(f"Unexpected error during token validation: {str(e)}")
        raise ValueError(f"Token validation failed: {str(e)}")


def apple_signin(apple_credential):
    """
    Handle apple signin, agnostic to app. Will simply output a User object
    whatever function is suing this function can then add their user info as desired
    """

    identity_token = apple_credential.get("identityToken")
    if not identity_token:
        raise ValueError("No identity token found")

    try:
        apple_user = validate_apple_token(identity_token)
    except ValueError as e:
        raise ValueError(f"Invalid token: {str(e)}")

    email = apple_credential.get("email")
    full_name = apple_credential.get("fullName", {})
    apple_id = apple_credential.get("user")
    name = ""
    if full_name.get("givenName"):
        name += full_name.get("givenName")
    if full_name.get("familyName"):
        name += " " + full_name.get("familyName")

    user = None

    user = User.query.filter_by(apple_id=apple_id).first()
    if not user:
        user = User.query.filter_by(email=email).first()

    if user:
        # TODO: if existing user, update any new fields
        if name and user.name != name:
            user.name = name
        if email and user.email != email:
            user.email = email
        if apple_id and user.apple_id != apple_id:
            user.apple_id = apple_id
        db.session.commit()
    else:
        # Create a new user
        user = User(
            apple_id=apple_id,
            name=name,
            email=email,
        )
        db.session.add(user)
        db.session.commit()

    return user
