import json

from flask import current_app, redirect, request, url_for
from rauth import OAuth2Service


class OAuthSignIn(object):
    providers = None

    def __init__(self, provider_name):
        self.provider_name = provider_name
        credentials = current_app.config["OAUTH_CREDENTIALS"][provider_name]
        self.consumer_id = credentials["id"]
        self.consumer_secret = credentials["secret"]

    def authorize(self):
        pass

    def callback(self):
        pass

    def get_callback_url(self):
        print(f"getting callback url for {self.provider_name}")
        url = url_for(
            "api.auth.oauth_callback", provider=self.provider_name, _external=True
        )
        print(f"callback url: {url}")
        return url

    @classmethod
    def get_provider(self, provider_name):
        if self.providers is None:
            self.providers = {}
            for provider_class in self.__subclasses__():
                provider = provider_class()
                self.providers[provider.provider_name] = provider
        return self.providers[provider_name]


class GoogleSignIn(OAuthSignIn):
    def __init__(self):
        super(GoogleSignIn, self).__init__("google")
        self.service = OAuth2Service(
            name="google",
            client_id=self.consumer_id,
            client_secret=self.consumer_secret,
            authorize_url="https://accounts.google.com/o/oauth2/auth",
            access_token_url="https://accounts.google.com/o/oauth2/token",
            base_url="https://www.googleapis.com/oauth2/v1/",
        )

    def authorize(self, next_path="/"):
        return redirect(
            self.service.get_authorize_url(
                scope="openid email profile",
                response_type="code",
                redirect_uri=self.get_callback_url(),
                state=next_path,
            )
        )

    def callback(self):
        def decode_json(payload):
            return json.loads(payload.decode("utf-8"))

        if "code" not in request.args:
            return None, None, None
        oauth_session = self.service.get_auth_session(
            data={
                "code": request.args["code"],
                "grant_type": "authorization_code",
                "redirect_uri": self.get_callback_url(),
            },
            decoder=decode_json,
        )
        me = oauth_session.get("userinfo").json()
        social_id = me["id"]
        email = me["email"]
        name = me["name"]
        picture = me["picture"]

        return social_id, name, email, picture
