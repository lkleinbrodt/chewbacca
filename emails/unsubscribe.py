# coding: utf-8

# https://raw.githubusercontent.com/aksappy/unsubscriber/master/unsubscribe.py

# # Unsubscribe from your emails
# 
# This program will read your emails and collect all the links for unsubscription
# The collection of links is written to a file
# Then from the file the links are read, unique links are opened in the browser
# However, you will have to manually click on majority of the unsubscriptions.. sigh!
# 

import base64
import re
import webbrowser
from urllib.parse import urlparse
from googleapiclient.discovery import build
from httplib2 import Http


# URL REGEX for finding all types of links.
URL_REGEX = r"""(?i)\b((?:https?:(?:/{1,3}|[a-z0-9%])|[a-z0-9.\-]+[.](?:com|net|org|edu|gov|mil|aero|asia|biz|cat|coop|info|int|jobs|mobi|museum|name|post|pro|tel|travel|xxx|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|dd|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|Ja|sk|sl|sm|sn|so|sr|ss|st|su|sv|sx|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|yu|za|zm|zw)/)(?:[^\s()<>{}\[\]]+|\([^\s()]*?\([^\s()]+\)[^\s()]*?\)|\([^\s]+?\))+(?:\([^\s()]*?\([^\s()]+\)[^\s()]*?\)|\([^\s]+?\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’])|(?:(?<!@)[a-z0-9]+(?:[.\-][a-z0-9]+)*[.](?:com|net|org|edu|gov|mil|aero|asia|biz|cat|coop|info|int|jobs|mobi|museum|name|post|pro|tel|travel|xxx|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|dd|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|Ja|sk|sl|sm|sn|so|sr|ss|st|su|sv|sx|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|yu|za|zm|zw)()))"""


def filewriter(url):
    """ A simple file writer """
    with open("links.csv", "a") as f:
        f.write(f"{url}\n")


def getemails(service, page_token):
    """Recursive function to read all the emails. 
    The google responses has next page token, 
    which is used to call the next page of emails"""
    msgs = service.users().messages().list(userId='me', pageToken=page_token, q='unsubscribe', maxResults=500).execute()
    if 'nextPageToken' in msgs:
        next_page_token = msgs['nextPageToken']
    else:
        return True
    for msg in msgs['messages']:
        emailbody(service, msg['id'])
    print(f"Next Page Token = {next_page_token}")
    getemails(service, next_page_token)


def openlinks():
    with open('links.csv', 'r') as f:
        lines = f.readlines()
        lst = {}
        for line in lines:
            if not line.startswith('http://') and not line.startswith('https://'):
                line = 'http://' + line
            parsed_uri = urlparse(line)
            result = '{uri.scheme}://{uri.netloc}/'.format(uri=parsed_uri)
            lst[result] = line
        for link in lst:
            webbrowser.open_new_tab(lst[link])


def emailbody(service, email_id):
    msg = service.users().messages().get(userId='me', id=email_id).execute()
    payld = msg['payload']
    if 'parts' in payld:
        mssg_parts = payld['parts']  # fetching the message parts
        part_one = mssg_parts[0]  # fetching first element of the part
        part_body = part_one['body']  # fetching body of the message
        if 'data' in part_body:
            part_data = part_body['data']  # fetching data from the body
            # decoding from Base64 to UTF-8
            clean_one = part_data.replace("-", "+").replace("_", "/")
            # decoding from Base64 to UTF-8
            clean_two = base64.b64decode(bytes(clean_one, 'UTF-8'))
            values = re.findall(URL_REGEX, str(clean_two))
            for val in values:
                if 'unsubscribe' in val[0]:
                    filewriter(val[0])


def main():
    """Shows basic usage of the Gmail API.
    Lists the user's Gmail labels.
    """
    service = build('gmail', 'v1', http=Http())
    msg = service.users().messages().list(userId='me', q="unsubscribe", maxResults=500).execute()
    output = getemails(service, msg['nextPageToken'])
    if output is True:
        openlinks()


if __name__ == '__main__':
    main()
