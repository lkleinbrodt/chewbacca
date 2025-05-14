import os.path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.discovery import Resource

# If modifying these scopes, delete the file token.json.
SCOPES = [
    "https://mail.google.com/"
    ]

def get_service() -> Resource:
    creds = None
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                "credentials.json", SCOPES
            )
            creds = flow.run_local_server(port=0)
        with open("token.json", "w") as token:
            token.write(creds.to_json())

    service = build("gmail", "v1", credentials=creds)
    
    return service

def mark_emails_as_spam(email_ids):
    try:
        service = get_service()
        for id in email_ids:
            service.users().messages().modify(userId='me', id=id, body={'removeLabelIds': [], 'addLabelIds': ['SPAM']}).execute()
        return True
    except HttpError as error:
        print(f"An error occurred: {error}")
        return error


def get_inbox_emails(n = 50):
    """Gets the first n messages in the user's inbox."""
    try:
        service = get_service()
        results = (
            service.users()
            .messages()
            .list(userId="me", maxResults=n, q="is:unread")
            .execute()
        )
        messages = results.get("messages", [])
        return messages
    except HttpError as error:
        print(f"An error occurred: {error}")

def batch_get_emails(email_ids):
    response_list = []
    def callback(request_id, response, exception):
        if exception:
            print(f"An error occurred: {exception}")
        else:
            response_list.append(response)
    service = get_service()
    batch = service.new_batch_http_request()
    for id in email_ids:
        batch.add(service.users().messages().get(id = id, userId='me'), callback=callback)
    
    batch.execute()
    
    return response_list
    
    



def authorize():
  """Shows basic usage of the Gmail API.
  Lists the user's Gmail labels.
  """
  creds = None
  # The file token.json stores the user's access and refresh tokens, and is
  # created automatically when the authorization flow completes for the first
  # time.
  if os.path.exists("token.json"):
    creds = Credentials.from_authorized_user_file("token.json", SCOPES)
  # If there are no (valid) credentials available, let the user log in.
  if not creds or not creds.valid:
    if creds and creds.expired and creds.refresh_token:
      creds.refresh(Request())
    else:
      flow = InstalledAppFlow.from_client_secrets_file(
          "credentials.json", SCOPES
      )
      creds = flow.run_local_server(port=0)
    # Save the credentials for the next run
    with open("token.json", "w") as token:
      token.write(creds.to_json())

  try:
    # Call the Gmail API
    service = build("gmail", "v1", credentials=creds)
    
    results = service.users().labels().list(userId="me").execute()
    labels = results.get("labels", [])

    if not labels:
      print("No labels found.")
      return
    print("Labels:")
    for label in labels:
      print(label["name"])

  except HttpError as error:
    # TODO(developer) - Handle errors from gmail API.
    print(f"An error occurred: {error}")


if __name__ == "__main__":
    authorize()